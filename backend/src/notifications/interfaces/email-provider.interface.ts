export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  messageId: string;
  provider: string;
}

export abstract class IEmailProvider {
  abstract sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
