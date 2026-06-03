import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
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
export class ManualBillingProvider extends IBillingProvider {
  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext(ManualBillingProvider.name);
  }

  async createSubscription(input: BillingSubscriptionInput): Promise<BillingSubscriptionResult> {
    const externalBillingId = `manual_${input.studioId}_${Date.now()}`;
    this.logger.log(
      `Manual billing subscription created: ${externalBillingId} for plan ${input.planCode}`,
    );
    return { externalBillingId, status: 'created' };
  }

  async cancelSubscription(externalBillingId: string): Promise<void> {
    this.logger.log(`Manual billing subscription cancelled: ${externalBillingId}`);
  }

  async changePlan(
    externalBillingId: string,
    newPlanCode: string,
    billingCycle: BillingCycle,
  ): Promise<BillingSubscriptionResult> {
    this.logger.log(
      `Manual billing plan change: ${externalBillingId} -> ${newPlanCode} (${billingCycle})`,
    );
    return { externalBillingId, status: 'updated' };
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const orderId = `order_manual_${randomBytes(8).toString('hex')}`;
    this.logger.log(`Manual billing order created: ${orderId} for studio ${input.studioId}`);
    return {
      orderId,
      amount: input.amount,
      currency: input.currency,
      keyId: 'manual_key',
    };
  }

  verifyPaymentSignature(input: VerifyPaymentInput): boolean {
    this.logger.log(`Manual billing payment verified: ${input.razorpayPaymentId}`);
    return Boolean(input.razorpayOrderId && input.razorpayPaymentId && input.razorpaySignature);
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    return Boolean(body && signature);
  }

  getPublicKey(): string {
    return 'manual_key';
  }
}
