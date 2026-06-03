import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from './interfaces/email-provider.interface';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { LoggerService } from '../shared/services/logger.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService, logger: LoggerService) => {
        const provider = configService.get<string>('email.provider', 'console');
        if (provider === 'resend') {
          return new ResendEmailProvider(configService, logger);
        }
        return new ConsoleEmailProvider(logger);
      },
      inject: [ConfigService, LoggerService],
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailProviderModule {}
