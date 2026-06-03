import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailProviderModule } from './email-provider.module';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { JobLog, JobLogSchema } from './schemas/job-log.schema';
import { EmailTemplate, EmailTemplateSchema } from './schemas/email-template.schema';
import { NotificationService } from './services/notification.service';
import { JobLogService } from './services/job-log.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailService } from './services/email.service';
import { JobQueueService } from './services/job-queue.service';
import { EventBusService } from './services/event-bus.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';
import { ScheduledJobsHandlerService } from './services/scheduled-jobs-handler.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { EmailTemplateSeedService } from './seed/email-template.seed';
import { NotificationsController } from './controllers/notifications.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { Payment, PaymentSchema } from '../billing/schemas/payment.schema';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EmailProviderModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: JobLog.name, schema: JobLogSchema },
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationService,
    JobLogService,
    EmailTemplateService,
    EmailService,
    JobQueueService,
    EventBusService,
    NotificationOrchestratorService,
    ScheduledJobsHandlerService,
    JobSchedulerService,
    EmailTemplateSeedService,
  ],
  exports: [
    EventBusService,
    NotificationOrchestratorService,
    NotificationService,
    EmailService,
    JobQueueService,
    JobLogService,
    EmailTemplateService,
  ],
})
export class NotificationsModule {}
