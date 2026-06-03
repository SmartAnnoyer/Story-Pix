import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  AnalyticsEventType,
  DomainEventType,
  PaymentStatus,
  SubscriptionStatus,
} from '../../common/enums';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { SubscriptionService } from '../../subscriptions/subscription.service';
import { LimitValidationService } from '../../subscriptions/limit-validation.service';
import { AnalyticsIngestionService } from '../../analytics/analytics-ingestion.service';
import { AnalyticsAggregationService } from '../../analytics/analytics-aggregation.service';
import { Payment, PaymentDocument } from '../../billing/schemas/payment.schema';
import { EventBusService } from './event-bus.service';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class ScheduledJobsHandlerService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly subscriptionService: SubscriptionService,
    private readonly limitValidationService: LimitValidationService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    private readonly analyticsAggregationService: AnalyticsAggregationService,
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ScheduledJobsHandlerService.name);
  }

  async runTrialExpiryCheck() {
    const now = new Date();
    const trialReminderDays = this.configService.get<number>('billing.trialReminderDays', 3);
    const reminderDate = new Date(now.getTime() + trialReminderDays * 24 * 60 * 60 * 1000);

    const expiringTrials = await this.subscriptionModel
      .find({ status: SubscriptionStatus.TRIAL, endDate: { $lte: reminderDate, $gt: now } })
      .exec();

    for (const subscription of expiringTrials) {
      await this.eventBus.publish({
        eventType: DomainEventType.SUBSCRIPTION_TRIAL_EXPIRING,
        studioId: subscription.studioId.toString(),
        metadata: {
          subscriptionId: subscription._id.toString(),
          endDate: subscription.endDate,
        },
      });
    }

    const expiredTrials = await this.subscriptionModel
      .find({ status: SubscriptionStatus.TRIAL, endDate: { $lte: now } })
      .exec();

    for (const subscription of expiredTrials) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();
      await this.subscriptionService.syncStudioFromSubscription(subscription);

      await this.eventBus.publish({
        eventType: DomainEventType.SUBSCRIPTION_TRIAL_EXPIRED,
        studioId: subscription.studioId.toString(),
        metadata: { subscriptionId: subscription._id.toString() },
      });

      await this.analyticsIngestionService.recordEvent({
        studioId: subscription.studioId.toString(),
        eventType: AnalyticsEventType.PLAN_EXPIRED,
        metadata: { subscriptionId: subscription._id.toString(), reason: 'trial_expired' },
      });
    }

    return { reminders: expiringTrials.length, expired: expiredTrials.length };
  }

  async runSubscriptionExpiryCheck() {
    const now = new Date();
    const renewalReminderDays = this.configService.get<number>('billing.renewalReminderDays', 7);
    const reminderDate = new Date(now.getTime() + renewalReminderDays * 24 * 60 * 60 * 1000);

    const expiringSoon = await this.subscriptionModel
      .find({
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        endDate: { $lte: reminderDate, $gt: now },
      })
      .exec();

    for (const subscription of expiringSoon) {
      await this.eventBus.publish({
        eventType: DomainEventType.SUBSCRIPTION_EXPIRING,
        studioId: subscription.studioId.toString(),
        metadata: { subscriptionId: subscription._id.toString(), endDate: subscription.endDate },
      });
    }

    const expired = await this.subscriptionModel
      .find({ status: SubscriptionStatus.ACTIVE, endDate: { $lte: now } })
      .exec();

    for (const subscription of expired) {
      if (subscription.autoRenew) {
        await this.subscriptionService.extend(subscription._id.toString(), 30);
        await this.eventBus.publish({
          eventType: DomainEventType.SUBSCRIPTION_RENEWED,
          studioId: subscription.studioId.toString(),
          metadata: { subscriptionId: subscription._id.toString(), source: 'auto_renew_job' },
        });
      } else {
        subscription.status = SubscriptionStatus.EXPIRED;
        await subscription.save();
        await this.subscriptionService.syncStudioFromSubscription(subscription);
        await this.eventBus.publish({
          eventType: DomainEventType.SUBSCRIPTION_EXPIRED,
          studioId: subscription.studioId.toString(),
          metadata: { subscriptionId: subscription._id.toString() },
        });
        await this.analyticsIngestionService.recordEvent({
          studioId: subscription.studioId.toString(),
          eventType: AnalyticsEventType.PLAN_EXPIRED,
          metadata: { subscriptionId: subscription._id.toString() },
        });
      }
    }

    return { reminders: expiringSoon.length, processed: expired.length };
  }

  async runUsageLimitEnforcement() {
    const activeSubscriptions = await this.subscriptionModel
      .find({ status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } })
      .exec();

    let suspendedCount = 0;

    for (const subscription of activeSubscriptions) {
      const studioId = subscription.studioId.toString();
      const overStorage = await this.limitValidationService
        .checkStorageLimit(studioId, 0)
        .then(() => false)
        .catch(() => true);
      const overScans = await this.limitValidationService
        .checkScanLimit(studioId)
        .then(() => false)
        .catch(() => true);

      if (overStorage || overScans) {
        subscription.status = SubscriptionStatus.SUSPENDED;
        await subscription.save();
        await this.subscriptionService.syncStudioFromSubscription(subscription);
        await this.eventBus.publish({
          eventType: DomainEventType.USER_ACCOUNT_SUSPENDED,
          studioId,
          metadata: { reason: 'usage_limit_exceeded' },
        });
        suspendedCount += 1;
      }
    }

    return { suspendedCount };
  }

  async runPaymentReconciliation() {
    const stalePending = await this.paymentModel
      .find({
        status: PaymentStatus.PENDING,
        createdAt: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
      .exec();

    for (const payment of stalePending) {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
      await this.eventBus.publish({
        eventType: DomainEventType.PAYMENT_FAILED,
        studioId: payment.studioId.toString(),
        metadata: { paymentId: payment._id.toString(), reason: 'reconciliation_timeout' },
      });
    }

    return { reconciled: stalePending.length };
  }

  async runAnalyticsAggregation() {
    await this.analyticsAggregationService.getPlatformDashboard({});
    return { aggregated: true };
  }

  async runStorageUsageSync() {
    return { synced: true, message: 'Storage usage sync placeholder — subscriptions remain source of truth' };
  }
}
