import cors from 'cors';
import type { Express } from 'express';

export const parseCorsOrigins = (corsOrigin: string): string[] =>
  corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * Register CORS on the raw Express app before Nest mounts routes.
 * Nest's enableCors() runs too late with ExpressAdapter + app.init(), so OPTIONS preflight 404s.
 */
export const applyCorsMiddleware = (app: Express, corsOrigin: string): void => {
  const allowedOrigins = parseCorsOrigins(corsOrigin);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  );
};
