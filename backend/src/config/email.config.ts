import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  provider: (process.env.EMAIL_PROVIDER ?? 'console').trim().toLowerCase(),
  fromAddress: (process.env.EMAIL_FROM ?? 'noreply@story-pix.app').trim(),
  fromName: (process.env.EMAIL_FROM_NAME ?? 'Story-pix').trim(),
  resend: {
    apiKey: (process.env.RESEND_API_KEY ?? '').trim(),
  },
  gmail: {
    user: (process.env.GMAIL_USER ?? '').trim(),
    // Strip spaces — Google shows App Passwords as "xxxx xxxx xxxx xxxx"
    appPassword: (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s+/g, '').trim(),
  },
}));
