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
    this.logger.log(
      `[ConsoleEmail] to=${input.to} subject="${input.subject}" text=${input.text.slice(0, 120)}`,
    );
    return { messageId: `console_${Date.now()}`, provider: 'console' };
  }
}
