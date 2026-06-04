/** Ensures API calls include scheme and the Nest global prefix (/api/v1). */
const normalizeApiBaseUrl = (raw: string | undefined, isProduction: boolean): string => {
  let base = (raw ?? 'http://localhost:3000/api/v1').trim().replace(/\/$/, '');

  if (!/^https?:\/\//i.test(base)) {
    base = isProduction ? `https://${base}` : `http://${base}`;
  }

  if (!base.endsWith('/api/v1')) {
    base = `${base}/api/v1`;
  }

  return base;
};

export const env = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD),
  appName: import.meta.env.VITE_APP_NAME ?? 'Story-pix',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
