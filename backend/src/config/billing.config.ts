import { registerAs } from '@nestjs/config';

export default registerAs('billing', () => ({
  provider: process.env.BILLING_PROVIDER ?? 'manual',
  currency: process.env.BILLING_CURRENCY ?? 'INR',
  trialReminderDays: parseInt(process.env.BILLING_TRIAL_REMINDER_DAYS ?? '3', 10),
  renewalReminderDays: parseInt(process.env.BILLING_RENEWAL_REMINDER_DAYS ?? '7', 10),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
}));
