import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobQueueService } from './job-queue.service';
import { ScheduledJobsHandlerService } from './scheduled-jobs-handler.service';
import { EmailService } from './email.service';
import { NotificationOrchestratorService } from './notification-orchestrator.service';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { ScheduledJobType } from '../../common/enums';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class JobSchedulerService implements OnModuleInit {
  constructor(
    private readonly jobQueueService: JobQueueService,
    private readonly scheduledJobsHandler: ScheduledJobsHandlerService,
    private readonly emailService: EmailService,
    private readonly orchestrator: NotificationOrchestratorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(JobSchedulerService.name);
  }

  onModuleInit() {
    this.jobQueueService.registerHandler(QUEUE_NAMES.EMAIL, 'send-email', (payload) =>
      this.emailService.processEmailJob(payload as never),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.NOTIFICATIONS, 'deliver-notification', (payload) =>
      this.orchestrator.deliverInAppNotification(String(payload.notificationId)),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'trial-expiry-check', () =>
      this.scheduledJobsHandler.runTrialExpiryCheck(),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'subscription-expiry-check', () =>
      this.scheduledJobsHandler.runSubscriptionExpiryCheck(),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'usage-limit-enforcement', () =>
      this.scheduledJobsHandler.runUsageLimitEnforcement(),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'payment-reconciliation', () =>
      this.scheduledJobsHandler.runPaymentReconciliation(),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'analytics-aggregation', () =>
      this.scheduledJobsHandler.runAnalyticsAggregation(),
    );

    this.jobQueueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'storage-usage-sync', () =>
      this.scheduledJobsHandler.runStorageUsageSync(),
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleHourlyJobs() {
    await this.enqueueScheduled('payment-reconciliation', ScheduledJobType.PAYMENT_RECONCILIATION);
    await this.enqueueScheduled('analytics-aggregation', ScheduledJobType.ANALYTICS_AGGREGATION);
  }

  @Cron('0 2 * * *')
  async scheduleDailyEarlyJobs() {
    await this.enqueueScheduled('trial-expiry-check', ScheduledJobType.TRIAL_EXPIRY_CHECK);
  }

  @Cron('0 3 * * *')
  async scheduleDailyMidJobs() {
    await this.enqueueScheduled('subscription-expiry-check', ScheduledJobType.SUBSCRIPTION_EXPIRY_CHECK);
  }

  @Cron('0 4 * * *')
  async scheduleDailyLateJobs() {
    await this.enqueueScheduled('usage-limit-enforcement', ScheduledJobType.STORAGE_USAGE_SYNC);
    await this.enqueueScheduled('storage-usage-sync', ScheduledJobType.STORAGE_USAGE_SYNC);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async scheduleWeeklyJobs() {
    this.logger.log('Weekly maintenance jobs scheduled');
  }

  private async enqueueScheduled(jobName: string, jobType: ScheduledJobType) {
    await this.jobQueueService.addJob(QUEUE_NAMES.SCHEDULED, jobName, {}, jobType);
  }
}
