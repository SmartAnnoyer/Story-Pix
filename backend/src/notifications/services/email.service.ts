import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMAIL_PROVIDER,
  IEmailProvider,
  SendEmailInput,
} from '../interfaces/email-provider.interface';
import { EmailTemplateService } from './email-template.service';
import { JobLogService } from './job-log.service';
import { JobQueueService } from './job-queue.service';
import { NotificationType } from '../../common/enums';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { ScheduledJobType } from '../../common/enums';
import { LoggerService } from '../../shared/services/logger.service';

export interface SendTemplatedEmailInput {
  notificationType: NotificationType;
  to: string;
  variables: Record<string, string | number | boolean | null | undefined>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider,
    private readonly templateService: EmailTemplateService,
    private readonly jobQueueService: JobQueueService,
    private readonly jobLogService: JobLogService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailService.name);
  }

  async sendTemplatedEmail(input: SendTemplatedEmailInput) {
    const template = await this.templateService.findByNotificationType(input.notificationType);
    const rendered = this.templateService.render(template, input.variables);

    return this.enqueueEmail({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        notificationType: input.notificationType,
        templateKey: template.key,
        ...input.metadata,
      },
    });
  }

  async enqueueEmail(input: SendEmailInput & { metadata?: Record<string, unknown> }) {
    const jobLog = await this.jobLogService.create({
      queueName: QUEUE_NAMES.EMAIL,
      jobType: ScheduledJobType.EMAIL_SEND,
      payload: { to: input.to, subject: input.subject, metadata: input.metadata },
    });

    await this.jobQueueService.addJob(
      QUEUE_NAMES.EMAIL,
      'send-email',
      { jobLogId: jobLog._id.toString(), ...input },
      ScheduledJobType.EMAIL_SEND,
    );

    return { jobLogId: jobLog._id.toString() };
  }

  async processEmailJob(payload: SendEmailInput & { jobLogId?: string }) {
    const jobLogId = payload.jobLogId;
    try {
      if (jobLogId) {
        await this.jobLogService.markActive(jobLogId, 1);
      }

      const result = await this.emailProvider.sendEmail(payload);

      if (jobLogId) {
        await this.jobLogService.markCompleted(jobLogId, result as unknown as Record<string, unknown>);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (jobLogId) {
        const maxAttempts = this.configService.get<number>('queue.retryAttempts', 3);
        await this.jobLogService.markFailed(jobLogId, message, true);
        await this.jobQueueService.moveToDeadLetter(
          QUEUE_NAMES.EMAIL,
          payload as unknown as Record<string, unknown>,
          message,
          maxAttempts,
        );
      }
      this.logger.error(`Email send failed: ${message}`);
      throw error;
    }
  }
}
