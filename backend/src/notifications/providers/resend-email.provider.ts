import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  IEmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../interfaces/email-provider.interface';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class ResendEmailProvider extends IEmailProvider {
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ResendEmailProvider.name);

    const apiKey = this.configService.get<string>('email.resend.apiKey', '');
    if (!apiKey) {
      throw new InternalServerErrorException('Resend API key is not configured');
    }

    this.client = new Resend(apiKey);
    const fromName = this.configService.get<string>('email.fromName', 'Story-pix');
    const fromEmail = this.configService.get<string>('email.fromAddress', 'noreply@story-pix.app');
    this.fromAddress = `${fromName} <${fromEmail}>`;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const result = await this.client.emails.send({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return {
      messageId: result.data?.id ?? `resend_${Date.now()}`,
      provider: 'resend',
    };
  }
}
