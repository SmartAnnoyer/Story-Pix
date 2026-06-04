import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as http from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './modules/app.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggerService } from './shared/services/logger.service';
import {
  applyCorsMiddleware,
  createCorsConfig,
  parseCorsOrigins,
} from './bootstrap/cors.middleware';
import {
  legacyApiPrefixMiddleware,
  resolveApiBasePath,
} from './bootstrap/legacy-api-prefix.middleware';

const requireProductionEnv = (): void => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = [];
  if (!process.env.MONGODB_URI?.trim()) missing.push('MONGODB_URI');
  if (!process.env.JWT_ACCESS_SECRET?.trim()) missing.push('JWT_ACCESS_SECRET');
  if (!process.env.JWT_REFRESH_SECRET?.trim()) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    console.error(`[Bootstrap] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
};

const listenHttpServer = (server: http.Server, port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve());
  });

async function bootstrap() {
  console.log('[Bootstrap] Starting Story-pix API…');
  requireProductionEnv();

  const port = parseInt(process.env.PORT ?? '3000', 10);
  const apiPrefixFromEnv = process.env.API_PREFIX ?? 'api/v1';
  const apiBasePath = resolveApiBasePath(apiPrefixFromEnv);

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  const nestCorsOptions = createCorsConfig(corsOrigin);
  console.log('[Bootstrap] CORS allowed origins:', parseCorsOrigins(corsOrigin).join(', '));

  const expressApp = express();
  expressApp.use(legacyApiPrefixMiddleware(apiBasePath));
  applyCorsMiddleware(expressApp, corsOrigin);

  // Open a port immediately so Render's deploy port scan succeeds while Nest boots
  const httpServer = http.createServer(expressApp);
  await listenHttpServer(httpServer, port);
  console.log(`[Bootstrap] Listening on 0.0.0.0:${port} (initializing…)`);

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    rawBody: true,
    cors: nestCorsOptions,
  });

  const configService = app.get(ConfigService);
  const logger = await app.resolve(LoggerService);
  app.useLogger(logger);

  const apiPrefix = configService.get<string>('app.apiPrefix', apiPrefixFromEnv);

  app.setGlobalPrefix(apiPrefix, {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.init();
  logger.log(`Story-pix API ready on port ${port}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[Bootstrap] Failed to start: ${message}`);
  process.exit(1);
});
