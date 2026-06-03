import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingProviderModule } from '../billing/billing-provider.module';
import { PlansModule } from '../plans/plans.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { Studio, StudioSchema } from '../studios/schemas/studio.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';
import { LimitValidationService } from './limit-validation.service';
import { SubscriptionLimitGuard } from '../guards/subscription-limit.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Studio.name, schema: StudioSchema },
    ]),
    PlansModule,
    BillingProviderModule,
    AnalyticsModule,
  ],
  providers: [
    SubscriptionService,
    UsageService,
    LimitValidationService,
    SubscriptionLimitGuard,
  ],
  exports: [
    SubscriptionService,
    UsageService,
    LimitValidationService,
    SubscriptionLimitGuard,
    MongooseModule,
  ],
})
export class SubscriptionsModule {}
