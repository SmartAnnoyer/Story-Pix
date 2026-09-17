import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  IEmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../interfaces/email-provider.interface';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class GmailEmailProvider extends IEmailProvider {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(GmailEmailProvider.name);

    const user = this.configService.get<string>('email.gmail.user', '');
    const pass = this.configService.get<string>('email.gmail.appPassword', '');

    if (!user || !pass) {
      throw new InternalServerErrorException(
        'Gmail SMTP is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)',
      );
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const fromName = this.configService.get<string>('email.fromName', 'Story-pix');
    const fromEmail = this.configService.get<string>('email.fromAddress', user);
    this.fromAddress = `${fromName} <${fromEmail}>`;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return {
      messageId: info.messageId ?? `gmail_${Date.now()}`,
      provider: 'gmail',
    };
  }
}
