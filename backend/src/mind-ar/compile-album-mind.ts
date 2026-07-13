import sharp from 'sharp';
import { encode } from '@msgpack/msgpack';

/**
 * Server-side MindAR compile — CPU only (no canvas, no WebGL).
 *
 * Why: MindAR's browser Detector uses `tf.backend().compileAndRun` (WebGL-only).
 * On Node that crashes. MindAR 1.2.5 ships CPU kernels + runKernel; we force the
 * CPU backend before loading Detector, and prepare images with sharp (no `canvas`
 * native module — that often breaks Render deploys and leaves the old code live).
 *
 * Output format CURRENT_VERSION = 2 — compatible with frontend MindAR 1.1.4 viewer.
 */
const MINDAR_VERSION = '1.2.5-cpu-fast';
const CURRENT_VERSION = 2;
/** Smaller images = much faster CPU compile on Render free tier. */
const TRACKING_MIN_LONG_EDGE = 480;
const TRACKING_MAX_LONG_EDGE = 640;
/** Default MindAR builds ~8 pyramid scales; we keep 4 for speed. */
const MATCHING_SCALES = [1, 0.72, 0.5, 0.36];

export type CompiledMindResult = {
  buffer: Buffer;
  targetDimensions: Array<{ width: number; height: number }>;
  mindVersion: string;
};

type TargetImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

type ImageSlice = TargetImage & { scale?: number };

type MindArRuntime = {
  tf: {
    setBackend: (name: string) => Promise<boolean>;
    ready: () => Promise<void>;
    getBackend: () => string;
    nextFrame: () => Promise<void>;
    tidy: <T>(fn: () => T) => T;
    tensor: (
      values: Uint8Array,
      shape: number[],
      dtype?: string,
    ) => { reshape: (dims: number[]) => unknown };
    backend: () => { compileAndRun?: (...args: unknown[]) => unknown };
    engine: () => { backendNames?: () => string[] };
  };
  Detector: new (
    width: number,
    height: number,
  ) => {
    detect: (input: unknown) => { featurePoints: Array<{ maxima: boolean }> };
  };
  buildTrackingImageList: (target: TargetImage) => ImageSlice[];
  resizeImage: (input: { image: TargetImage; ratio: number }) => TargetImage;
  hierarchicalClusteringBuild: (input: { points: Array<{ maxima: boolean }> }) => unknown;
  extractTrackingFeatures: (
    imageList: ImageSlice[],
    doneCallback: (index: number) => void,
  ) => unknown[];
};

let runtimePromise: Promise<MindArRuntime> | null = null;

const importEsm = (specifier: string) =>
  (new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<Record<string, unknown>>)(specifier);

const ensureRuntime = (): Promise<MindArRuntime> => {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      // 1) TF + CPU backend BEFORE any MindAR detector import
      const tfMod = await importEsm('@tensorflow/tfjs');
      await importEsm('@tensorflow/tfjs-backend-cpu');
      const tf = tfMod as MindArRuntime['tf'];

      await tf.setBackend('cpu');
      await tf.ready();

      // 2) Register MindAR CPU kernels before Detector loads
      await importEsm('mind-ar/src/image-target/detector/kernels/cpu/index.js');

      // 3) Load compiler pieces (Detector also registers WebGL kernels — ignore them)
      const [detectorMod, imageListMod, imageUtilsMod, clusteringMod, extractMod] =
        await Promise.all([
          importEsm('mind-ar/src/image-target/detector/detector.js'),
          importEsm('mind-ar/src/image-target/image-list.js'),
          importEsm('mind-ar/src/image-target/utils/images.js'),
          importEsm('mind-ar/src/image-target/matching/hierarchical-clustering.js'),
          importEsm('mind-ar/src/image-target/tracker/extract-utils.js'),
        ]);

      // 4) Re-force CPU after Detector's webgl side-effects
      await tf.setBackend('cpu');
      await tf.ready();

      if (tf.getBackend() !== 'cpu') {
        throw new Error(`MindAR compile requires CPU backend, got "${tf.getBackend()}"`);
      }

      // 5) Hard-fail if anything still tries WebGL compileAndRun
      const backend = tf.backend();
      if (backend && typeof backend.compileAndRun !== 'function') {
        backend.compileAndRun = () => {
          throw new Error(
            'MindAR attempted WebGL compileAndRun. CPU kernels were not used — check TensorFlow backend.',
          );
        };
      }

      return {
        tf,
        Detector: detectorMod.Detector as MindArRuntime['Detector'],
        buildTrackingImageList:
          imageListMod.buildTrackingImageList as MindArRuntime['buildTrackingImageList'],
        resizeImage: imageUtilsMod.resize as MindArRuntime['resizeImage'],
        hierarchicalClusteringBuild:
          clusteringMod.build as MindArRuntime['hierarchicalClusteringBuild'],
        extractTrackingFeatures:
          extractMod.extractTrackingFeatures as MindArRuntime['extractTrackingFeatures'],
      };
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }

  return runtimePromise;
};

const prepareTrackingImage = async (imageBuffer: Buffer): Promise<TargetImage> => {
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

  const { data, info } = await oriented
    .resize(width, height, { fit: 'fill' })
    .greyscale()
    .modulate({ brightness: 1, saturation: 1.05 })
    .linear(1.08, 0)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
  };
};

/** Fewer pyramid scales than MindAR default — big CPU win on shared hosts. */
const buildFastMatchingImageList = (
  runtime: MindArRuntime,
  inputImage: TargetImage,
): ImageSlice[] => {
  const minDimension = Math.min(inputImage.width, inputImage.height);
  const scales = MATCHING_SCALES.filter((ratio) => minDimension * ratio >= 100);
  const effectiveScales = scales.length > 0 ? scales : [Math.min(1, 100 / minDimension)];

  return effectiveScales.map((ratio) =>
    Object.assign(runtime.resizeImage({ image: inputImage, ratio }), { scale: ratio }),
  );
};

const extractMatchingFeatures = async (
  runtime: MindArRuntime,
  imageList: ImageSlice[],
  doneCallback: (index: number) => void,
) => {
  const keyframes: unknown[] = [];

  for (let index = 0; index < imageList.length; index += 1) {
    const image = imageList[index];
    const detector = new runtime.Detector(image.width, image.height);

    await runtime.tf.nextFrame();
    runtime.tf.tidy(() => {
      const input = runtime.tf
        .tensor(image.data, [image.data.length], 'float32')
        .reshape([image.height, image.width]);
      const { featurePoints } = detector.detect(input);

      const maximaPoints = featurePoints.filter((point) => point.maxima);
      const minimaPoints = featurePoints.filter((point) => !point.maxima);

      keyframes.push({
        maximaPoints,
        minimaPoints,
        maximaPointsCluster: runtime.hierarchicalClusteringBuild({ points: maximaPoints }),
        minimaPointsCluster: runtime.hierarchicalClusteringBuild({ points: minimaPoints }),
        width: image.width,
        height: image.height,
        scale: image.scale,
      });
      doneCallback(index);
    });
  }

  return keyframes;
};

/** Compile a multi-target .mind buffer from raw photo buffers (server-side). */
export const compileAlbumMindFile = async (
  imageBuffers: Buffer[],
  onProgress?: (progress: number) => void,
): Promise<CompiledMindResult> => {
  if (!imageBuffers.length) {
    throw new Error('At least one tracking image is required');
  }

  onProgress?.(0.03);
  const runtime = await ensureRuntime();
  onProgress?.(0.08);

  const targetImages = await Promise.all(imageBuffers.map((buffer) => prepareTrackingImage(buffer)));
  onProgress?.(0.15);

  const compiledData: Array<{
    targetImage: TargetImage;
    matchingData: unknown;
    trackingData: unknown;
  }> = [];

  const percentPerImage = 50 / targetImages.length;
  let percent = 0;

  for (let index = 0; index < targetImages.length; index += 1) {
    const targetImage = targetImages[index];
    const imageList = buildFastMatchingImageList(runtime, targetImage);
    const percentPerAction = percentPerImage / Math.max(imageList.length, 1);

    const matchingData = await extractMatchingFeatures(runtime, imageList, () => {
      percent += percentPerAction;
      onProgress?.(0.15 + (percent / 100) * 0.35);
    });

    compiledData.push({
      targetImage,
      matchingData,
      trackingData: null,
    });
  }

  const trackingPercentPerImage = 50 / targetImages.length;
  let trackingPercent = 0;

  for (let index = 0; index < compiledData.length; index += 1) {
    const entry = compiledData[index];
    const trackingImageList = runtime.buildTrackingImageList(entry.targetImage);
    const percentPerAction = trackingPercentPerImage / Math.max(trackingImageList.length, 1);

    entry.trackingData = runtime.extractTrackingFeatures(trackingImageList, () => {
      trackingPercent += percentPerAction;
      onProgress?.(0.5 + (trackingPercent / 100) * 0.45);
    });
  }

  const dataList = compiledData.map((entry) => ({
    targetImage: {
      width: entry.targetImage.width,
      height: entry.targetImage.height,
    },
    trackingData: entry.trackingData,
    matchingData: entry.matchingData,
  }));

  const buffer = Buffer.from(
    encode({
      v: CURRENT_VERSION,
      dataList,
    }),
  );

  onProgress?.(1);

  return {
    buffer,
    targetDimensions: targetImages.map((image) => ({
      width: image.width,
      height: image.height,
    })),
    mindVersion: `storypix-server-v3-mindar-${MINDAR_VERSION}-cv${CURRENT_VERSION}`,
  };
};
