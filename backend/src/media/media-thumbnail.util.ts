const DATA_URL_PREFIX = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i;

export const decodeThumbnailBase64 = (input: string | undefined | null): Buffer | null => {
  if (!input?.trim()) return null;
  const trimmed = input.trim();
  const payload = trimmed.replace(DATA_URL_PREFIX, '');
  try {
    const buffer = Buffer.from(payload, 'base64');
    if (buffer.length < 64 || buffer.length > 2_000_000) return null;
    return buffer;
  } catch {
    return null;
  }
};

export const buildThumbnailObjectKey = (r2ObjectKey: string): string => {
  const parts = r2ObjectKey.split('/');
  const fileName = parts.pop() ?? 'file';
  const base = fileName.replace(/\.[^.]+$/, '');
  parts.push('thumbnails', `${base}.jpg`);
  return parts.join('/');
};
