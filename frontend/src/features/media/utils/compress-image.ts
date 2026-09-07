import {
  MAX_PHOTO_UPLOAD_MB,
  PHOTO_COMPRESS_MAX_EDGE,
  PHOTO_COMPRESS_QUALITY,
} from './media-limits';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load image')));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });

const canvasToJpegFile = (
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number,
): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not compress image'));
          return;
        }
        const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
        resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality,
    );
  });

/**
 * Resize + JPEG-encode photos before upload for faster MindAR tracking and smaller storage.
 * Retries with stronger settings if still over the upload ceiling.
 */
export const compressImageFile = async (
  file: File,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<File> => {
  const maxEdge = options?.maxEdge ?? PHOTO_COMPRESS_MAX_EDGE;
  const maxBytes = options?.maxBytes ?? MAX_PHOTO_UPLOAD_MB * 1024 * 1024;
  let quality = options?.quality ?? PHOTO_COMPRESS_QUALITY;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not compress image');
    ctx.drawImage(image, 0, 0, width, height);

    let compressed = await canvasToJpegFile(canvas, file.name, quality);

    // If still large, step down quality / edge until under the cap.
    let edge = maxEdge;
    while (compressed.size > maxBytes && (quality > 0.55 || edge > 1280)) {
      if (quality > 0.55) {
        quality = Math.max(0.55, quality - 0.08);
      } else {
        edge = Math.round(edge * 0.85);
        const nextScale = Math.min(1, edge / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * nextScale));
        canvas.height = Math.max(1, Math.round(image.height * nextScale));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      compressed = await canvasToJpegFile(canvas, file.name, quality);
    }

    // Prefer compressed when it helps; keep original only if already smaller JPEG under cap.
    if (file.size <= maxBytes && file.size <= compressed.size && file.type.includes('jpeg')) {
      return file;
    }
    return compressed;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
