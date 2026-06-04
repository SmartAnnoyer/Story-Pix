import cors, { type CorsOptions } from 'cors';
import type { Express } from 'express';

/** Browser Origin headers always include a scheme; normalize env values to match. */
export const normalizeOrigin = (raw: string): string => {
  const origin = raw.trim().replace(/\/$/, '');
  if (!origin) return origin;
  if (/^https?:\/\//i.test(origin)) return origin;
  if (origin.includes('localhost') || origin.startsWith('127.0.0.1')) {
    return `http://${origin}`;
  }
  return `https://${origin}`;
};

export const parseCorsOrigins = (corsOrigin: string): string[] =>
  corsOrigin
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

export const buildCorsOptions = (corsOrigin: string): CorsOptions => {
  const allowedOrigins = parseCorsOrigins(corsOrigin);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      console.warn(`[CORS] Blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    optionsSuccessStatus: 204,
  };
};

/**
 * Register CORS on the raw Express app before Nest mounts routes.
 */
export const applyCorsMiddleware = (app: Express, corsOrigin: string): void => {
  app.use(cors(buildCorsOptions(corsOrigin)));
};
