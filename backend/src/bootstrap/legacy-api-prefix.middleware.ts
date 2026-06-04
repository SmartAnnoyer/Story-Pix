import type { NextFunction, Request, Response } from 'express';

const LEGACY_API_ROOTS = [
  '/auth',
  '/media',
  '/albums',
  '/viewer',
  '/studio',
  '/admin',
  '/notifications',
  '/ar-targets',
  '/webhooks',
  '/health',
] as const;

/** Nest global prefix without leading/trailing slashes, e.g. api/v1 */
export const resolveApiBasePath = (apiPrefix: string): string =>
  `/${apiPrefix.replace(/^\/|\/$/g, '')}`;

/**
 * Rewrites /auth/... → /api/v1/auth/... when the client omits the global prefix.
 * Must run on the raw Express instance before NestFactory.create().
 */
export const legacyApiPrefixMiddleware =
  (apiBasePath: string) => (req: Request, _res: Response, next: NextFunction) => {
    const path = req.path;
    if (path === '/' || path.startsWith(apiBasePath)) {
      next();
      return;
    }
    if (LEGACY_API_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))) {
      req.url = `${apiBasePath}${req.url}`;
    }
    next();
  };
