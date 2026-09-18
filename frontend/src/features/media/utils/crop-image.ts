import type { Area } from 'react-easy-crop';
import type { PixelCrop } from 'react-image-crop';

/** Shared portrait frame for AR photo capture / crop / scan guide. */
export const AR_PHOTO_ASPECT = 3 / 4;

export const getCroppedImageFile = async (
  imageSrc: string,
  crop: Area,
  fileName: string,
  mimeType = 'image/jpeg',
): Promise<File> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not crop image');

  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, mimeType);
  const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType });
};

/** Free-form crop from react-image-crop pixel selection. */
export const getFreeCroppedImageFile = async (
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  mimeType = 'image/jpeg',
): Promise<File> => {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const width = Math.max(1, Math.round(crop.width * scaleX));
  const height = Math.max(1, Math.round(crop.height * scaleY));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not crop image');

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    width,
    height,
  );

  const blob = await canvasToBlob(canvas, mimeType);
  const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType });
};

/** Rotate an image by degrees (any angle). Positive = clockwise. */
export const rotateImageToObjectUrl = async (
  imageSrc: string,
  degrees: number,
  mimeType = 'image/jpeg',
): Promise<string> => {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized === 0) return imageSrc;

  const image = await loadImage(imageSrc);
  const rad = (normalized * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const width = Math.max(1, Math.round(image.naturalWidth * cos + image.naturalHeight * sin));
  const height = Math.max(1, Math.round(image.naturalWidth * sin + image.naturalHeight * cos));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not rotate image');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const blob = await canvasToBlob(canvas, mimeType);
  return URL.createObjectURL(blob);
};

export const rotateImageToFile = async (
  imageSrc: string,
  degrees: number,
  fileName: string,
  mimeType = 'image/jpeg',
): Promise<File> => {
  const url = await rotateImageToObjectUrl(imageSrc, degrees, mimeType);
  try {
    if (url === imageSrc && degrees % 360 === 0) {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const type = blob.type || mimeType;
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
      return new File([blob], `${base}.${ext}`, { type });
    }
    const response = await fetch(url);
    const blob = await response.blob();
    const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${base}-rotated.${ext}`, { type: mimeType });
  } finally {
    if (url !== imageSrc) URL.revokeObjectURL(url);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode image'))),
      mimeType,
      0.92,
    );
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load image for crop')));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
