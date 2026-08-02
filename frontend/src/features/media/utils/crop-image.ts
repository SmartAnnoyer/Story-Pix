import type { Area } from 'react-easy-crop';

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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode cropped image'))),
      mimeType,
      0.92,
    );
  });

  const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType });
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load image for crop')));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
