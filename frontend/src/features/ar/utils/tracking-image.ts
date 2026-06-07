/** MindAR extracts better features when the long edge is at least ~800px. */
const TRACKING_MIN_LONG_EDGE = 900;
const TRACKING_MAX_LONG_EDGE = 1600;

/**
 * Normalize uploaded photos for MindAR: apply browser orientation, upscale small
 * passport crops, and add mild contrast so plain backgrounds still yield features.
 */
export const prepareTrackingImage = (source: HTMLImageElement): HTMLCanvasElement => {
  const srcWidth = source.naturalWidth || source.width;
  const srcHeight = source.naturalHeight || source.height;
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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'contrast(1.15) saturate(1.1) brightness(1.02)';
  ctx.drawImage(source, 0, 0, width, height);

  return canvas;
};

export type TrackingImageDimensions = { width: number; height: number };
