import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  DomainEventType,
  NotificationChannel,
  NotificationStatus,
} from '../../common/enums';
import { DomainEventPayload } from '../interfaces/domain-event.interface';
import {
  BILLING_TO_DOMAIN_EVENT,
  DOMAIN_EVENT_NOTIFICATION_MAP,
} from '../constants/event-notification.map';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { JobQueueService } from './job-queue.service';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { ScheduledJobType } from '../../common/enums';
import { AnalyticsIngestionService } from '../../analytics/analytics-ingestion.service';
import { AnalyticsEventType } from '../../common/enums';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class NotificationOrchestratorService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly jobQueueService: JobQueueService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(NotificationOrchestratorService.name);
  }

  async handleDomainEvent(event: DomainEventPayload) {
    const definition = DOMAIN_EVENT_NOTIFICATION_MAP[event.eventType];
    if (!definition) {
      this.logger.log(`No notification mapping for event ${event.eventType}`);
      return;
    }

    const recipient = await this.resolveRecipient(event);
    const variables = this.buildTemplateVariables(event, recipient);

    if (definition.sendInApp && recipient.userId) {
      const notification = await this.notificationService.create({
        studioId: event.studioId,
        userId: recipient.userId,
        type: definition.type,
        title: this.interpolate(definition.title, variables),
        message: this.interpolate(definition.message, variables),
        channel: NotificationChannel.IN_APP,
        metadata: event.metadata,
      });

      await this.jobQueueService.addJob(
        QUEUE_NAMES.NOTIFICATIONS,
        'deliver-notification',
        { notificationId: notification._id.toString() },
        ScheduledJobType.NOTIFICATION_DELIVERY,
      );
    }

    if (definition.sendEmail && recipient.email) {
      await this.emailService.sendTemplatedEmail({
        notificationType: definition.type,
        to: recipient.email,
        variables,
        metadata: event.metadata,
      });
    }

    if (event.studioId) {
      void this.analyticsIngestionService
        .recordEvent({
          studioId: event.studioId,
          eventType: this.mapToAnalyticsEvent(event.eventType),
          metadata: { domainEvent: event.eventType, ...event.metadata },
        })
        .catch(() => undefined);
    }
  }

  async handleLegacyBillingEvent(
    billingType: string,
    studioId: string,
    metadata?: Record<string, unknown>,
  ) {
    const eventType = BILLING_TO_DOMAIN_EVENT[billingType];
    if (!eventType) return;

    const admin = await this.userModel
      .findOne({ studioId: new Types.ObjectId(studioId) })
      .sort({ createdAt: 1 })
      .exec();

    await this.handleDomainEvent({
      eventType,
      studioId,
      userId: admin?._id.toString(),
      recipientEmail: admin?.email,
      metadata,
    });
  }

  async deliverInAppNotification(notificationId: string) {
    await this.notificationService.markSent(notificationId);
    return { notificationId, status: NotificationStatus.SENT };
  }

  private async resolveRecipient(event: DomainEventPayload) {
    if (event.recipientEmail && event.userId) {
      return { userId: event.userId, email: event.recipientEmail };
    }

    if (event.userId) {
      const user = await this.userModel.findById(event.userId).exec();
      return { userId: event.userId, email: user?.email ?? event.recipientEmail };
    }

    if (event.studioId) {
      const user = await this.userModel
        .findOne({ studioId: new Types.ObjectId(event.studioId) })
        .sort({ createdAt: 1 })
        .exec();
      return { userId: user?._id.toString(), email: user?.email ?? event.recipientEmail };
    }

    return { userId: undefined, email: event.recipientEmail };
  }

  private buildTemplateVariables(
    event: DomainEventPayload,
    recipient: { userId?: string; email?: string },
  ) {
    const metadata = event.metadata ?? {};
    return {
      studioName: String(metadata.studioName ?? 'Your Studio'),
      firstName: String(metadata.firstName ?? 'there'),
      resetUrl: String(metadata.resetUrl ?? ''),
      planName: String(metadata.planName ?? ''),
      amount: String(metadata.amount ?? ''),
      albumName: String(metadata.albumName ?? ''),
      endDate: metadata.endDate ? new Date(String(metadata.endDate)).toLocaleDateString() : '',
      email: recipient.email ?? '',
      ...Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [key, value == null ? '' : String(value)]),
      ),
    };
  }

  private interpolate(template: string, variables: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? '');
  }

  private mapToAnalyticsEvent(eventType: DomainEventType): AnalyticsEventType {
    const mapping: Partial<Record<DomainEventType, AnalyticsEventType>> = {
      [DomainEventType.PAYMENT_SUCCESS]: AnalyticsEventType.PAYMENT_SUCCESS,
      [DomainEventType.PAYMENT_FAILED]: AnalyticsEventType.PAYMENT_FAILED,
      [DomainEventType.SUBSCRIPTION_RENEWED]: AnalyticsEventType.SUBSCRIPTION_RENEWED,
      [DomainEventType.SUBSCRIPTION_TRIAL_EXPIRING]: AnalyticsEventType.TRIAL_ENDING_SOON,
      [DomainEventType.SUBSCRIPTION_EXPIRING]: AnalyticsEventType.SUBSCRIPTION_EXPIRING,
      [DomainEventType.SUBSCRIPTION_EXPIRED]: AnalyticsEventType.PLAN_EXPIRED,
    };

    return mapping[eventType] ?? AnalyticsEventType.PLAN_ASSIGNED;
  }
}
