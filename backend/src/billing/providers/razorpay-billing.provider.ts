import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import {
  BillingSubscriptionInput,
  BillingSubscriptionResult,
  CreateOrderInput,
  CreateOrderResult,
  IBillingProvider,
  VerifyPaymentInput,
} from '../interfaces/billing-provider.interface';
import { BillingCycle } from '../../common/enums';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class RazorpayBillingProvider extends IBillingProvider {
  private readonly client: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(RazorpayBillingProvider.name);

    this.keyId = this.configService.get<string>('billing.razorpay.keyId', '');
    this.keySecret = this.configService.get<string>('billing.razorpay.keySecret', '');
    this.webhookSecret = this.configService.get<string>('billing.razorpay.webhookSecret', '');

    if (!this.keyId || !this.keySecret) {
      throw new InternalServerErrorException('Razorpay credentials are not configured');
    }

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createSubscription(input: BillingSubscriptionInput): Promise<BillingSubscriptionResult> {
    const planAmount = await this.resolvePlanAmount(input.planCode, input.billingCycle);

    const subscription = await this.client.subscriptions.create({
      plan_id: input.planCode,
      customer_notify: 1,
      total_count: input.billingCycle === BillingCycle.YEARLY ? 1 : 12,
      notes: {
        studioId: input.studioId,
        planCode: input.planCode,
        billingCycle: input.billingCycle,
      },
      notify_info: {
        notify_email: input.customerEmail,
      },
    } as Parameters<Razorpay['subscriptions']['create']>[0]);

    this.logger.log(`Razorpay subscription created: ${subscription.id} amount=${planAmount}`);

    return {
      externalBillingId: subscription.id,
      status: subscription.status ?? 'created',
    };
  }

  async cancelSubscription(externalBillingId: string): Promise<void> {
    await this.client.subscriptions.cancel(externalBillingId, false);
    this.logger.log(`Razorpay subscription cancelled: ${externalBillingId}`);
  }

  async changePlan(
    externalBillingId: string,
    newPlanCode: string,
    billingCycle: BillingCycle,
  ): Promise<BillingSubscriptionResult> {
    await this.cancelSubscription(externalBillingId);
    return this.createSubscription({
      studioId: '',
      planCode: newPlanCode,
      billingCycle,
      customerEmail: '',
    });
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const order = await this.client.orders.create({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature(input: VerifyPaymentInput): boolean {
    const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
    const expected = createHmac('sha256', this.keySecret).update(payload).digest('hex');
    return expected === input.razorpaySignature;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    return expected === signature;
  }

  getPublicKey(): string {
    return this.keyId;
  }

  private async resolvePlanAmount(_planCode: string, _billingCycle: BillingCycle): Promise<number> {
    return 0;
  }
}
