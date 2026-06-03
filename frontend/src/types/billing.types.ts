import type { BillingCycle, Plan, UsageSummary } from './subscription.types';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface Payment {
  id: string;
  studioId: string;
  subscriptionId: string;
  planId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySubscriptionId: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  status: PaymentStatus;
  transactionDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Invoice {
  id: string;
  studioId: string;
  subscriptionId: string;
  paymentId: string | null;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  billingCycle: BillingCycle;
  issuedDate: string;
  paidDate: string | null;
  status: InvoiceStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PaginatedPayments {
  items: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface PaginatedInvoices {
  items: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CreateOrderPayload {
  planId: string;
  billingCycle: BillingCycle;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
  plan: Plan;
  billingCycle: BillingCycle;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  paymentCount: number;
  monthlyBreakdown: Array<{
    year: number;
    month: number;
    revenue: number;
    count: number;
  }>;
}

export interface ChangeBillingPlanPayload {
  planId: string;
  billingCycle?: BillingCycle;
}

export type BillingSubscriptionSummary = UsageSummary;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
