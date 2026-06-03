import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  provider: process.env.EMAIL_PROVIDER ?? 'console',
  fromAddress: process.env.EMAIL_FROM ?? 'noreply@story-pix.app',
  fromName: process.env.EMAIL_FROM_NAME ?? 'Story-pix',
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
  },
}));
