import { registerAs } from '@nestjs/config';

export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const;

export default registerAs('media', () => ({
  maxPhotoSizeMB: parseInt(process.env.MEDIA_MAX_PHOTO_SIZE_MB ?? '25', 10),
  maxVideoSizeMB: parseInt(process.env.MEDIA_MAX_VIDEO_SIZE_MB ?? '500', 10),
  allowedPhotoMimeTypes: ALLOWED_PHOTO_MIME_TYPES,
  allowedVideoMimeTypes: ALLOWED_VIDEO_MIME_TYPES,
}));
