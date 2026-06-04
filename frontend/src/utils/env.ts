/** Ensures API calls include the Nest global prefix (/api/v1). */
const normalizeApiBaseUrl = (raw: string | undefined): string => {
  const base = (raw ?? 'http://localhost:3000/api/v1').trim().replace(/\/$/, '');
  if (base.endsWith('/api/v1')) return base;
  return `${base}/api/v1`;
};

export const env = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  appName: import.meta.env.VITE_APP_NAME ?? 'Story-pix',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
