import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators';

@Controller()
export class RootController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  root() {
    const apiPrefix = this.configService.get<string>('app.apiPrefix', 'api/v1');
    const storageEnabled = Boolean(
      this.configService.get<string>('storage.accessKeyId') &&
        this.configService.get<string>('storage.secretAccessKey') &&
        this.configService.get<string>('storage.endpoint'),
    );

    return {
      service: 'storypix-api',
      message: 'Story-pix API is running',
      apiBase: `/${apiPrefix}`,
      health: `/${apiPrefix}/health`,
      storage: storageEnabled ? 'r2' : 'mock',
      hint: 'Use the frontend at http://localhost:5173 — this URL is the JSON API only.',
    };
  }
}
