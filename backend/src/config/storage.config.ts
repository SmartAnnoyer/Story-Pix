import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? 'https://media.story-pix.app',
  bucketName: process.env.R2_BUCKET_NAME ?? 'livealbum-dev',
  endpoint: process.env.R2_ENDPOINT ?? '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  region: process.env.R2_REGION ?? 'auto',
  presignExpiresSeconds: parseInt(process.env.R2_PRESIGN_EXPIRES_SECONDS ?? '900', 10),
  useR2: Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT),
}));
