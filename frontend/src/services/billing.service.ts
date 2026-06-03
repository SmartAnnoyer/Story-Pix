import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  BillingSubscriptionSummary,
  ChangeBillingPlanPayload,
  CreateOrderPayload,
  CreateOrderResponse,
  PaginatedInvoices,
  PaginatedPayments,
  RevenueSummary,
  VerifyPaymentPayload,
} from '@/types/billing.types';
import type { Subscription } from '@/types/subscription.types';

export const billingService = {
  async getCurrentSubscription(): Promise<BillingSubscriptionSummary> {
    const { data } = await apiClient.get<ApiResponse<BillingSubscriptionSummary>>(
      '/studio/billing/subscription',
    );
    return data.data;
  },

  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    const { data } = await apiClient.post<ApiResponse<CreateOrderResponse>>(
      '/studio/billing/payments/order',
      payload,
    );
    return data.data;
  },

  async verifyPayment(payload: VerifyPaymentPayload) {
    const { data } = await apiClient.post<ApiResponse<unknown>>(
      '/studio/billing/payments/verify',
      payload,
    );
    return data.data;
  },

  async getPaymentHistory(params?: { page?: number; limit?: number; paymentStatus?: string }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedPayments>>('/studio/billing/payments', {
      params,
    });
    return data.data;
  },

  async getInvoices(params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedInvoices>>('/studio/billing/invoices', {
      params,
    });
    return data.data;
  },

  async getInvoice(id: string) {
    const { data } = await apiClient.get<ApiResponse<unknown>>(`/studio/billing/invoices/${id}`);
    return data.data;
  },

  async downloadInvoice(id: string): Promise<Blob> {
    const response = await apiClient.get(`/studio/billing/invoices/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async upgradePlan(payload: ChangeBillingPlanPayload): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      '/studio/billing/upgrade',
      payload,
    );
    return data.data;
  },

  async downgradePlan(payload: ChangeBillingPlanPayload): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      '/studio/billing/downgrade',
      payload,
    );
    return data.data;
  },

  async cancelSubscription(): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>('/studio/billing/cancel');
    return data.data;
  },

  async getRevenue(params?: { from?: string; to?: string }): Promise<RevenueSummary> {
    const { data } = await apiClient.get<ApiResponse<RevenueSummary>>('/admin/billing/revenue', {
      params,
    });
    return data.data;
  },

  async getAdminPayments(params?: {
    page?: number;
    limit?: number;
    studioId?: string;
    paymentStatus?: string;
  }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedPayments>>('/admin/billing/payments', {
      params,
    });
    return data.data;
  },

  async getAdminInvoices(params?: { page?: number; limit?: number; studioId?: string }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedInvoices>>('/admin/billing/invoices', {
      params,
    });
    return data.data;
  },

  async getSubscriptionHistory(params?: { page?: number; limit?: number; studioId?: string }) {
    const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/billing/subscriptions/history', {
      params,
    });
    return data.data;
  },

  async requestRefund(paymentId: string, reason?: string) {
    const { data } = await apiClient.post<ApiResponse<unknown>>(
      `/admin/billing/payments/${paymentId}/refund`,
      { reason },
    );
    return data.data;
  },
};
