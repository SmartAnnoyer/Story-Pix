import { registerAs } from '@nestjs/config';

export default registerAs('studio', () => ({
  trialStorageLimitGB: parseInt(process.env.STUDIO_TRIAL_STORAGE_GB ?? '10', 10),
  trialMonthlyScanLimit: parseInt(process.env.STUDIO_TRIAL_SCAN_LIMIT ?? '1000', 10),
  trialDurationDays: parseInt(process.env.STUDIO_TRIAL_DURATION_DAYS ?? '14', 10),
}));
