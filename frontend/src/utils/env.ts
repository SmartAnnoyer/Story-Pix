export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  appName: import.meta.env.VITE_APP_NAME ?? 'Story-pix',
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
