import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingProviderModule } from './billing-provider.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { BillingAuditLog, BillingAuditLogSchema } from './schemas/billing-audit-log.schema';
import {
  BillingWebhookEvent,
  BillingWebhookEventSchema,
} from './schemas/billing-webhook-event.schema';
import { BillingService } from './services/billing.service';
import { PaymentService } from './services/payment.service';
import { InvoiceService } from './services/invoice.service';
import { BillingAuditService } from './services/billing-audit.service';
import { BillingNotificationService } from './services/billing-notification.service';
import { BillingWebhookService } from './services/billing-webhook.service';
import { StudioBillingController } from './controllers/studio-billing.controller';
import { AdminBillingController } from './controllers/admin-billing.controller';
import { RazorpayWebhookController } from './controllers/razorpay-webhook.controller';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { Studio, StudioSchema } from '../studios/schemas/studio.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';

@Module({
  imports: [
    BillingProviderModule,
    forwardRef(() => NotificationsModule),
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: BillingAuditLog.name, schema: BillingAuditLogSchema },
      { name: BillingWebhookEvent.name, schema: BillingWebhookEventSchema },
      { name: Studio.name, schema: StudioSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    PlansModule,
    SubscriptionsModule,
    AnalyticsModule,
  ],
  controllers: [StudioBillingController, AdminBillingController, RazorpayWebhookController],
  providers: [
    BillingService,
    PaymentService,
    InvoiceService,
    BillingAuditService,
    BillingNotificationService,
    BillingWebhookService,
  ],
  exports: [BillingProviderModule, BillingService, PaymentService, InvoiceService],
})
export class BillingModule {}
