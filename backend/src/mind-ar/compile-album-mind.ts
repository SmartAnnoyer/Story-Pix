import { createRequire } from 'node:module';
import { encode } from '@msgpack/msgpack';
import sharp from 'sharp';

const nodeRequire = createRequire(__filename);

// MindAR 1.1.4 — must match frontend MINDAR_VERSION
const MINDAR_VERSION = '1.1.4';
const CURRENT_VERSION = 2;

const TRACKING_MIN_LONG_EDGE = 900;
const TRACKING_MAX_LONG_EDGE = 1600;

const { Detector } = nodeRequire('mind-ar/src/image-target/detector/detector.js') as {
  Detector: new (width: number, height: number) => {
    detect: (input: unknown) => { featurePoints: Array<{ maxima: boolean }> };
  };
};
const { buildImageList, buildTrackingImageList } = nodeRequire('mind-ar/src/image-target/image-list.js') as {
  buildImageList: (target: TargetImage) => ImageSlice[];
  buildTrackingImageList: (target: TargetImage) => ImageSlice[];
};
const { build: hierarchicalClusteringBuild } = nodeRequire(
  'mind-ar/src/image-target/matching/hierarchical-clustering.js',
) as {
  build: (input: { points: Array<{ maxima: boolean }> }) => unknown;
};
const { extract } = nodeRequire('mind-ar/src/image-target/tracker/extract.js') as {
  extract: (image: ImageSlice) => unknown;
};
const tf = nodeRequire('@tensorflow/tfjs') as {
  nextFrame: () => Promise<void>;
  tidy: <T>(fn: () => T) => T;
  tensor: (values: Uint8Array, shape: number[], dtype?: string) => { reshape: (dims: number[]) => unknown };
};

if (typeof tf.nextFrame !== 'function') {
  tf.nextFrame = () => new Promise((resolve) => setImmediate(resolve));
}

type TargetImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

type ImageSlice = TargetImage & { scale?: number };

export type CompiledMindResult = {
  buffer: Buffer;
  targetDimensions: Array<{ width: number; height: number }>;
  mindVersion: string;
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

const extractMatchingFeatures = async (
  imageList: ImageSlice[],
  doneCallback: (index: number) => void,
) => {
  const keyframes: unknown[] = [];

  for (let index = 0; index < imageList.length; index += 1) {
    const image = imageList[index];
    const detector = new Detector(image.width, image.height);

    await tf.nextFrame();
    tf.tidy(() => {
      const input = tf.tensor(image.data, [image.data.length], 'float32').reshape([image.height, image.width]);
      const { featurePoints } = detector.detect(input);

      const maximaPoints = featurePoints.filter((point) => point.maxima);
      const minimaPoints = featurePoints.filter((point) => !point.maxima);

      keyframes.push({
        maximaPoints,
        minimaPoints,
        maximaPointsCluster: hierarchicalClusteringBuild({ points: maximaPoints }),
        minimaPointsCluster: hierarchicalClusteringBuild({ points: minimaPoints }),
        width: image.width,
        height: image.height,
        scale: image.scale,
      });
      doneCallback(index);
    });
  }

  return keyframes;
};

const extractTrackingFeatures = (imageList: ImageSlice[], doneCallback: (index: number) => void) => {
  const featureSets: unknown[] = [];

  for (let index = 0; index < imageList.length; index += 1) {
    const image = imageList[index];
    const points = extract(image);
    featureSets.push({
      data: image.data,
      scale: image.scale,
      width: image.width,
      height: image.height,
      points,
    });
    doneCallback(index);
  }

  return featureSets;
};

/** Compile a multi-target .mind buffer from raw photo buffers (server-side). */
export const compileAlbumMindFile = async (
  imageBuffers: Buffer[],
  onProgress?: (progress: number) => void,
): Promise<CompiledMindResult> => {
  if (!imageBuffers.length) {
    throw new Error('At least one tracking image is required');
  }

  onProgress?.(0.05);
  const targetImages = await Promise.all(imageBuffers.map((buffer) => prepareTrackingImage(buffer)));
  onProgress?.(0.15);

  const compiledData: Array<{
    targetImage: TargetImage;
    imageList: ImageSlice[];
    matchingData: unknown;
    trackingImageList: ImageSlice[];
    trackingData: unknown;
  }> = [];

  const percentPerImage = 50 / targetImages.length;
  let percent = 0;

  for (let index = 0; index < targetImages.length; index += 1) {
    const targetImage = targetImages[index];
    const imageList = buildImageList(targetImage);
    const percentPerAction = percentPerImage / Math.max(imageList.length, 1);

    const matchingData = await extractMatchingFeatures(imageList, () => {
      percent += percentPerAction;
      onProgress?.(0.15 + (percent / 100) * 0.35);
    });

    compiledData.push({
      targetImage,
      imageList,
      matchingData,
      trackingImageList: buildTrackingImageList(targetImage),
      trackingData: null,
    });
  }

  const trackingPercentPerImage = 50 / targetImages.length;
  let trackingPercent = 0;

  for (let index = 0; index < compiledData.length; index += 1) {
    const entry = compiledData[index];
    const percentPerAction = trackingPercentPerImage / Math.max(entry.trackingImageList.length, 1);
    entry.trackingData = extractTrackingFeatures(entry.trackingImageList, () => {
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
    targetDimensions: targetImages.map((image) => ({ width: image.width, height: image.height })),
    mindVersion: `storypix-server-v1-mindar-${MINDAR_VERSION}-cv${CURRENT_VERSION}`,
  };
};
