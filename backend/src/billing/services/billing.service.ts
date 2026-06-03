import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  BillingNotificationType,
  PaymentStatus,
  SubscriptionStatus,
} from '../../common/enums';
import {
  BILLING_PROVIDER,
  IBillingProvider,
} from '../interfaces/billing-provider.interface';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { PlanService } from '../../plans/plans.service';
import { SubscriptionService } from '../../subscriptions/subscription.service';
import { UsageService } from '../../subscriptions/usage.service';
import { Studio, StudioDocument } from '../../studios/schemas/studio.schema';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { ChangeBillingPlanDto, CreateOrderDto, VerifyPaymentDto } from '../dto/billing.dto';
import { BillingAuditService } from './billing-audit.service';
import { BillingNotificationService } from './billing-notification.service';
import { EventBusService } from '../../notifications/services/event-bus.service';
import { DomainEventType } from '../../common/enums';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';
import { PlanDocument } from '../../plans/schemas/plan.schema';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @Inject(BILLING_PROVIDER) private readonly billingProvider: IBillingProvider,
    private readonly configService: ConfigService,
    private readonly planService: PlanService,
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageService,
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly auditService: BillingAuditService,
    private readonly notificationService: BillingNotificationService,
    private readonly eventBus: EventBusService,
  ) {}

  async getCurrentSubscription(studioId: string) {
    return this.usageService.getUsageSummary(studioId);
  }

  async createOrder(studioId: string, dto: CreateOrderDto, actorId?: string) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    const plan = await this.planService.findDocumentById(dto.planId);
    if (!plan.isActive) throw new BadRequestException('Plan is not active');

    const amount = this.resolvePlanAmount(plan, dto.billingCycle);
    const currency = this.configService.get<string>('billing.currency', 'INR');
    const receipt = `rcpt_${studioId}_${Date.now()}`;

    const orderResult = await this.billingProvider.createOrder({
      studioId,
      subscriptionId: subscription._id.toString(),
      planId: plan._id.toString(),
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes: {
        studioId,
        planId: plan._id.toString(),
        billingCycle: dto.billingCycle,
      },
    });

    const payment = await this.paymentModel.create({
      studioId: new Types.ObjectId(studioId),
      subscriptionId: subscription._id,
      planId: plan._id,
      razorpayOrderId: orderResult.orderId,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      transactionDate: new Date(),
    });

    await this.auditService.log({
      action: 'payment.order_created',
      studioId,
      subscriptionId: subscription._id.toString(),
      paymentId: payment._id.toString(),
      actorId,
      metadata: { planId: plan._id.toString(), amount, billingCycle: dto.billingCycle },
    });

    return {
      orderId: orderResult.orderId,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: orderResult.keyId,
      paymentId: payment._id.toString(),
      plan: this.planService.serialize(plan),
      billingCycle: dto.billingCycle,
    };
  }

  async verifyPayment(studioId: string, dto: VerifyPaymentDto, actorId?: string) {
    if (!this.billingProvider.verifyPaymentSignature(dto)) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.paymentService.findByOrderId(dto.razorpayOrderId, studioId);
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === PaymentStatus.PAID) {
      return {
        payment: this.paymentService.serialize(payment),
        alreadyProcessed: true,
      };
    }

    payment.razorpayPaymentId = dto.razorpayPaymentId;
    payment.status = PaymentStatus.PAID;
    payment.transactionDate = new Date();
    await payment.save();

    const plan = await this.planService.findDocumentById(payment.planId.toString());
    const subscription = await this.subscriptionModel.findById(payment.subscriptionId).exec();
    if (!subscription) throw new NotFoundException('Subscription not found');

    const billingCycle = subscription.billingCycle;
    await this.activatePaidSubscription(studioId, subscription, plan, billingCycle);

    const invoice = await this.invoiceService.createFromPayment(
      payment,
      plan,
      subscription,
      billingCycle,
    );

    await this.notificationService.emit(BillingNotificationType.PAYMENT_SUCCESS, studioId, {
      paymentId: payment._id.toString(),
      amount: payment.amount,
    });

    void this.eventBus.publish({
      eventType: DomainEventType.INVOICE_GENERATED,
      studioId,
      metadata: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
      },
    });

    await this.auditService.log({
      action: 'payment.verified',
      studioId,
      subscriptionId: subscription._id.toString(),
      paymentId: payment._id.toString(),
      invoiceId: invoice._id.toString(),
      actorId,
      metadata: { razorpayPaymentId: dto.razorpayPaymentId },
    });

    return {
      payment: this.paymentService.serialize(payment),
      invoice: this.invoiceService.serialize(invoice),
      alreadyProcessed: false,
    };
  }

  async upgradePlan(studioId: string, dto: ChangeBillingPlanDto, actorId?: string) {
    const result = await this.subscriptionService.upgrade(studioId, {
      planId: dto.planId,
      billingCycle: dto.billingCycle,
    });

    await this.auditService.log({
      action: 'subscription.upgraded',
      studioId,
      subscriptionId: result.id,
      actorId,
      metadata: { planId: dto.planId },
    });

    return result;
  }

  async downgradePlan(studioId: string, dto: ChangeBillingPlanDto, actorId?: string) {
    const result = await this.subscriptionService.downgrade(studioId, {
      planId: dto.planId,
      billingCycle: dto.billingCycle,
    });

    await this.auditService.log({
      action: 'subscription.downgraded',
      studioId,
      subscriptionId: result.id,
      actorId,
      metadata: { planId: dto.planId },
    });

    return result;
  }

  async cancelSubscription(studioId: string, actorId?: string) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    const result = await this.subscriptionService.cancel(subscription._id.toString());

    await this.auditService.log({
      action: 'subscription.cancelled',
      studioId,
      subscriptionId: subscription._id.toString(),
      actorId,
    });

    return result;
  }

  async markPaymentFailed(orderId: string, paymentMethod?: string) {
    const payment = await this.paymentService.findByOrderId(orderId);
    if (!payment || payment.status !== PaymentStatus.PENDING) return;

    payment.status = PaymentStatus.FAILED;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    await payment.save();

    await this.notificationService.emit(
      BillingNotificationType.PAYMENT_FAILED,
      payment.studioId.toString(),
      { paymentId: payment._id.toString(), orderId },
    );

    await this.auditService.log({
      action: 'payment.failed',
      studioId: payment.studioId.toString(),
      paymentId: payment._id.toString(),
      metadata: { orderId },
    });
  }

  async processPaidWebhook(
    orderId: string,
    paymentId: string,
    paymentMethod?: string,
    idempotencyKey?: string,
  ) {
    const payment = await this.paymentService.findByOrderId(orderId);
    if (!payment) return null;

    if (idempotencyKey && payment.idempotencyKey === idempotencyKey) {
      return this.paymentService.serialize(payment);
    }

    if (payment.status === PaymentStatus.PAID) {
      return this.paymentService.serialize(payment);
    }

    payment.razorpayPaymentId = paymentId;
    payment.status = PaymentStatus.PAID;
    payment.transactionDate = new Date();
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (idempotencyKey) payment.idempotencyKey = idempotencyKey;
    await payment.save();

    const plan = await this.planService.findDocumentById(payment.planId.toString());
    const subscription = await this.subscriptionModel.findById(payment.subscriptionId).exec();
    if (!subscription) return this.paymentService.serialize(payment);

    await this.activatePaidSubscription(
      payment.studioId.toString(),
      subscription,
      plan,
      subscription.billingCycle,
    );

    await this.invoiceService.createFromPayment(
      payment,
      plan,
      subscription,
      subscription.billingCycle,
    );

    await this.notificationService.emit(
      BillingNotificationType.PAYMENT_SUCCESS,
      payment.studioId.toString(),
      { paymentId: payment._id.toString(), source: 'webhook' },
    );

    return this.paymentService.serialize(payment);
  }

  async renewSubscription(subscription: SubscriptionDocument) {
    const plan = await this.planService.findDocumentById(subscription.planId.toString());
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (subscription.billingCycle === BillingCycle.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    subscription.startDate = startDate;
    subscription.endDate = endDate;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.scanUsage = 0;
    await subscription.save();
    await this.subscriptionService.syncStudioFromSubscription(subscription, plan);

    await this.notificationService.emit(
      BillingNotificationType.SUBSCRIPTION_RENEWED,
      subscription.studioId.toString(),
      { subscriptionId: subscription._id.toString() },
    );
  }

  async refundPlaceholder(paymentId: string, actorId?: string) {
    const payment = await this.paymentService.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    await this.auditService.log({
      action: 'payment.refund_requested',
      studioId: payment.studioId.toString(),
      paymentId,
      actorId,
      metadata: { placeholder: true },
    });

    return {
      message: 'Refund processing is not yet integrated. Request logged for manual review.',
      paymentId,
    };
  }

  private async activatePaidSubscription(
    studioId: string,
    currentSubscription: SubscriptionDocument,
    targetPlan: PlanDocument,
    billingCycle: BillingCycle,
  ) {
    const currentPlanId = currentSubscription.planId.toString();
    const isPlanChange = currentPlanId !== targetPlan._id.toString();
    const isTrial = currentSubscription.status === SubscriptionStatus.TRIAL;

    if (isPlanChange && !isTrial) {
      await this.subscriptionService.upgrade(studioId, {
        planId: targetPlan._id.toString(),
        billingCycle,
      });
      return;
    }

    if (isTrial || isPlanChange) {
      currentSubscription.planId = targetPlan._id;
      currentSubscription.billingCycle = billingCycle;
    }

    currentSubscription.status = SubscriptionStatus.ACTIVE;
    currentSubscription.autoRenew = true;

    const endDate = new Date();
    if (billingCycle === BillingCycle.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    currentSubscription.endDate = endDate;
    await currentSubscription.save();
    await this.subscriptionService.syncStudioFromSubscription(currentSubscription, targetPlan);
  }

  private resolvePlanAmount(plan: PlanDocument, billingCycle: BillingCycle): number {
    return billingCycle === BillingCycle.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;
  }
}
