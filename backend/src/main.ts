import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './modules/app.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggerService } from './shared/services/logger.service';
import {
  legacyApiPrefixMiddleware,
  resolveApiBasePath,
} from './bootstrap/legacy-api-prefix.middleware';

async function bootstrap() {
  const apiPrefixFromEnv = process.env.API_PREFIX ?? 'api/v1';
  const apiBasePath = resolveApiBasePath(apiPrefixFromEnv);

  const expressApp = express();
  expressApp.use(legacyApiPrefixMiddleware(apiBasePath));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = await app.resolve(LoggerService);
  app.useLogger(logger);

  const apiPrefix = configService.get<string>('app.apiPrefix', apiPrefixFromEnv);
  const corsOrigin = configService.get<string>('app.corsOrigin', 'http://localhost:5173');
  const port = configService.get<number>('app.port', 3000);

  app.setGlobalPrefix(apiPrefix, {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

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

  await app.listen(port);
  logger.log(`Story-pix API running on port ${port}`, 'Bootstrap');
}

bootstrap();
