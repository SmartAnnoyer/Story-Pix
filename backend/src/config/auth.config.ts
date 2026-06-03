import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? '5', 10),
  lockDurationMinutes: parseInt(process.env.AUTH_LOCK_DURATION_MINUTES ?? '15', 10),
  passwordResetExpiresMinutes: parseInt(process.env.AUTH_PASSWORD_RESET_EXPIRES_MINUTES ?? '60', 10),
  refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'storypix_refresh_token',
  cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  cookieSameSite: (process.env.AUTH_COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none',
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? 'admin@story-pix.app',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@123456',
  superAdminFirstName: process.env.SUPER_ADMIN_FIRST_NAME ?? 'Super',
  superAdminLastName: process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin',
}));
