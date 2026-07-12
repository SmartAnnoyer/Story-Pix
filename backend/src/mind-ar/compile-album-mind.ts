import sharp from 'sharp';

/**
 * Server-side MindAR compile using official OfflineCompiler (CPU kernels).
 * Avoids WebGL `compileAndRun` which fails in Node with plain @tensorflow/tfjs.
 *
 * Output format CURRENT_VERSION = 2 — compatible with frontend MindAR 1.1.4 viewer.
 */
const MINDAR_VERSION = '1.2.5-offline';
const CURRENT_VERSION = 2;

const TRACKING_MIN_LONG_EDGE = 800;
const TRACKING_MAX_LONG_EDGE = 1200;

export type CompiledMindResult = {
  buffer: Buffer;
  targetDimensions: Array<{ width: number; height: number }>;
  mindVersion: string;
};

type CanvasImage = {
  width: number;
  height: number;
};

type OfflineCompilerInstance = {
  compileImageTargets: (
    images: CanvasImage[],
    progressCallback?: (progress: number) => void,
  ) => Promise<unknown>;
  exportData: () => ArrayBuffer | Uint8Array;
  data: Array<{ targetImage: { width: number; height: number } }> | null;
};

let compilerReady: Promise<{
  OfflineCompiler: new () => OfflineCompilerInstance;
  loadImage: (source: Buffer | string) => Promise<CanvasImage>;
  setBackend: (name: string) => Promise<boolean>;
  ready: () => Promise<void>;
}> | null = null;

const ensureCompilerDeps = () => {
  if (!compilerReady) {
    compilerReady = (async () => {
      // Dynamic import keeps Nest CJS compatible with mind-ar ESM + canvas
      const importEsm = new Function('specifier', 'return import(specifier)') as (
        specifier: string,
      ) => Promise<Record<string, unknown>>;

      const [offlineMod, canvasMod, tfMod] = await Promise.all([
        importEsm('mind-ar/src/image-target/offline-compiler.js'),
        importEsm('canvas'),
        importEsm('@tensorflow/tfjs'),
      ]);

      const tf = tfMod as {
        setBackend: (name: string) => Promise<boolean>;
        ready: () => Promise<void>;
      };

      await tf.setBackend('cpu');
      await tf.ready();

      return {
        OfflineCompiler: offlineMod.OfflineCompiler as new () => OfflineCompilerInstance,
        loadImage: canvasMod.loadImage as (source: Buffer | string) => Promise<CanvasImage>,
        setBackend: tf.setBackend.bind(tf),
        ready: tf.ready.bind(tf),
      };
    })();
  }

  return compilerReady;
};

const prepareTrackingPng = async (imageBuffer: Buffer): Promise<Buffer> => {
  const oriented = sharp(imageBuffer).rotate();
  const metadata = await oriented.metadata();
  const srcWidth = metadata.width ?? 1;
  const srcHeight = metadata.height ?? 1;
  const longEdge = Math.max(srcWidth, srcHeight, 1);

  let scale = 1;
  if (longEdge < TRACKING_MIN_LONG_EDGE) {
    scale = TRACKING_MIN_LONG_EDGE / longEdge;
  }
  if (longEdge * scale > TRACKING_MAX_LONG_EDGE) {
    scale = TRACKING_MAX_LONG_EDGE / longEdge;
  }

  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  return oriented
    .resize(width, height, { fit: 'fill' })
    .modulate({ brightness: 1, saturation: 1.05 })
    .linear(1.08, 0)
    .png()
    .toBuffer();
};

/** Compile a multi-target .mind buffer from raw photo buffers (server-side). */
export const compileAlbumMindFile = async (
  imageBuffers: Buffer[],
  onProgress?: (progress: number) => void,
): Promise<CompiledMindResult> => {
  if (!imageBuffers.length) {
    throw new Error('At least one tracking image is required');
  }

  onProgress?.(0.04);
  const { OfflineCompiler, loadImage } = await ensureCompilerDeps();
  onProgress?.(0.08);

  const pngBuffers = await Promise.all(imageBuffers.map((buffer) => prepareTrackingPng(buffer)));
  onProgress?.(0.14);

  const images = await Promise.all(pngBuffers.map((png) => loadImage(png)));
  onProgress?.(0.18);

  const compiler = new OfflineCompiler();
  await compiler.compileImageTargets(images, (progress) => {
    const normalized = progress > 1 ? progress / 100 : progress;
    onProgress?.(0.18 + normalized * 0.8);
  });

  const exported = compiler.exportData();
  const buffer = Buffer.from(exported instanceof ArrayBuffer ? new Uint8Array(exported) : exported);

  // Prefer dimensions from compiler data; fall back to canvas image sizes
  const targetDimensions =
    compiler.data?.map((entry) => ({
      width: entry.targetImage.width,
      height: entry.targetImage.height,
    })) ??
    images.map((image) => ({
      width: image.width,
      height: image.height,
    }));

  // Sanity: ensure msgpack payload is versioned (OfflineCompiler already does this)
  if (!buffer.length) {
    throw new Error('MindAR OfflineCompiler produced an empty buffer');
  }

  onProgress?.(1);

  return {
    buffer,
    targetDimensions,
    mindVersion: `storypix-server-v2-mindar-${MINDAR_VERSION}-cv${CURRENT_VERSION}`,
  };
};
