import { BillingCycle } from '../../common/enums';

export interface BillingSubscriptionInput {
  studioId: string;
  planCode: string;
  billingCycle: BillingCycle;
  customerEmail: string;
  customerName?: string;
}

export interface BillingSubscriptionResult {
  externalBillingId: string;
  status: string;
}

export interface CreateOrderInput {
  studioId: string;
  subscriptionId: string;
  planId: string;
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export abstract class IBillingProvider {
  abstract createSubscription(input: BillingSubscriptionInput): Promise<BillingSubscriptionResult>;

  abstract cancelSubscription(externalBillingId: string): Promise<void>;

  abstract changePlan(
    externalBillingId: string,
    newPlanCode: string,
    billingCycle: BillingCycle,
  ): Promise<BillingSubscriptionResult>;

  abstract createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;

  abstract verifyPaymentSignature(input: VerifyPaymentInput): boolean;

  abstract verifyWebhookSignature(body: string, signature: string): boolean;

  abstract getPublicKey(): string;
}

export const BILLING_PROVIDER = Symbol('BILLING_PROVIDER');
