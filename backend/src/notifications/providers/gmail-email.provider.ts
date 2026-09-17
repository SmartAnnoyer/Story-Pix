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
  private readonly gmailUser: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(GmailEmailProvider.name);

    const user = (this.configService.get<string>('email.gmail.user', '') || '').trim();
    const pass = (this.configService.get<string>('email.gmail.appPassword', '') || '')
      .replace(/\s+/g, '')
      .trim();

    if (!user || !pass) {
      throw new InternalServerErrorException(
        'Gmail SMTP is not configured (set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env)',
      );
    }

    this.gmailUser = user;
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const fromName = this.configService.get<string>('email.fromName', 'Story-pix');
    const fromEmail =
      (this.configService.get<string>('email.fromAddress', '') || '').trim() || user;
    this.fromAddress = `${fromName} <${fromEmail}>`;
    this.logger.log(`Gmail transporter ready from=${this.fromAddress}`);
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(`[Gmail] sending to=${input.to} subject="${input.subject}"`);

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      const messageId = info.messageId ?? `gmail_${Date.now()}`;
      this.logger.log(`[Gmail] sent OK messageId=${messageId} response=${info.response ?? 'n/a'}`);
      return { messageId, provider: 'gmail' };
    } catch (error) {
      const err = error as {
        message?: string;
        code?: string;
        response?: string;
        responseCode?: number;
      };
      this.logger.error(
        `[Gmail] FAILED to=${input.to} code=${err.code ?? 'n/a'} responseCode=${err.responseCode ?? 'n/a'} message=${err.message ?? String(error)}`,
      );
      if (err.response) {
        this.logger.error(`[Gmail] SMTP response: ${err.response}`);
      }
      if (err.code === 'EAUTH') {
        this.logger.error(
          `[Gmail] Auth failed for ${this.gmailUser}. Use a Google App Password (16 chars), not your normal Gmail password: https://myaccount.google.com/apppasswords`,
        );
      }
      throw error;
    }
  }
}
