import { Injectable } from '@nestjs/common';
import {
  IEmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../interfaces/email-provider.interface';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class ConsoleEmailProvider extends IEmailProvider {
  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(ConsoleEmailProvider.name);
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const resetUrl = input.text.match(/https?:\/\/\S+/)?.[0] ?? null;

    this.logger.warn('========== CONSOLE EMAIL (NOT sent to inbox) ==========');
    this.logger.warn(`to: ${input.to}`);
    this.logger.warn(`subject: ${input.subject}`);
    if (resetUrl) {
      this.logger.warn(`resetUrl: ${resetUrl}`);
    }
    this.logger.warn(`text: ${input.text}`);
    this.logger.warn('=======================================================');
    this.logger.warn(
      'To send real mail on Render: set EMAIL_PROVIDER=gmail, GMAIL_USER, GMAIL_APP_PASSWORD on the API service, then redeploy.',
    );

    return { messageId: `console_${Date.now()}`, provider: 'console' };
  }
}
