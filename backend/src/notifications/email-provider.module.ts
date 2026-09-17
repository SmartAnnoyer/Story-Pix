import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from './interfaces/email-provider.interface';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { GmailEmailProvider } from './providers/gmail-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { LoggerService } from '../shared/services/logger.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService, logger: LoggerService) => {
        logger.setContext('EmailProviderModule');

        const provider = (configService.get<string>('email.provider', 'console') || 'console')
          .trim()
          .toLowerCase();
        const gmailUser = (configService.get<string>('email.gmail.user', '') || '').trim();
        const gmailPass = (configService.get<string>('email.gmail.appPassword', '') || '')
          .replace(/\s+/g, '')
          .trim();
        const fromAddress = configService.get<string>('email.fromAddress', '');

        // Never print the password — only its length so you can confirm .env was loaded.
        logger.log(
          `Email config: provider=${provider} from=${fromAddress} gmailUser=${gmailUser || '(empty)'} gmailAppPasswordLen=${gmailPass.length}`,
        );

        if (provider === 'resend') {
          logger.log('Using Resend email provider');
          return new ResendEmailProvider(configService, logger);
        }

        if (provider === 'gmail') {
          if (!gmailUser || gmailPass.length < 16) {
            logger.error(
              `EMAIL_PROVIDER=gmail but GMAIL_APP_PASSWORD is missing/too short (len=${gmailPass.length}). ` +
                'On Render: Dashboard → story-pix-api → Environment → set GMAIL_APP_PASSWORD (16-char App Password), then Manual Deploy. ' +
                'Falling back to console — check Render logs for resetUrl.',
            );
            return new ConsoleEmailProvider(logger);
          }
          logger.log(`Using Gmail SMTP as ${gmailUser}`);
          const gmail = new GmailEmailProvider(configService, logger);
          void gmail.verifyConnection();
          return gmail;
        }

        logger.warn('Using console email provider — no inbox delivery');
        return new ConsoleEmailProvider(logger);
      },
      inject: [ConfigService, LoggerService],
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailProviderModule {}
