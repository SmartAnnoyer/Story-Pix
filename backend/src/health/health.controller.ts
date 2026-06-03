import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'storypix-api',
      timestamp: new Date().toISOString(),
    };
  }
}
