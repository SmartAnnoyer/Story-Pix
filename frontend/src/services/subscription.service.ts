import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  AssignPlanPayload,
  BillingCycle,
  CreatePlanPayload,
  PaginatedSubscriptions,
  Plan,
  Subscription,
  UpdatePlanPayload,
  UsageSummary,
} from '@/types/subscription.types';

export const planService = {
  async getPlans(): Promise<Plan[]> {
    const { data } = await apiClient.get<ApiResponse<Plan[]>>('/admin/plans');
    return data.data;
  },

  async getPlan(id: string): Promise<Plan> {
    const { data } = await apiClient.get<ApiResponse<Plan>>(`/admin/plans/${id}`);
    return data.data;
  },

  async createPlan(payload: CreatePlanPayload): Promise<Plan> {
    const { data } = await apiClient.post<ApiResponse<Plan>>('/admin/plans', payload);
    return data.data;
  },

  async updatePlan(id: string, payload: UpdatePlanPayload): Promise<Plan> {
    const { data } = await apiClient.patch<ApiResponse<Plan>>(`/admin/plans/${id}`, payload);
    return data.data;
  },

  async activatePlan(id: string): Promise<Plan> {
    const { data } = await apiClient.post<ApiResponse<Plan>>(`/admin/plans/${id}/activate`);
    return data.data;
  },

  async deactivatePlan(id: string): Promise<Plan> {
    const { data } = await apiClient.post<ApiResponse<Plan>>(`/admin/plans/${id}/deactivate`);
    return data.data;
  },
};

export const subscriptionService = {
  async getSubscriptions(params?: {
    page?: number;
    limit?: number;
    studioId?: string;
  }): Promise<PaginatedSubscriptions> {
    const { data } = await apiClient.get<ApiResponse<PaginatedSubscriptions>>(
      '/admin/subscriptions',
      { params },
    );
    return data.data;
  },

  async getSubscription(id: string): Promise<Subscription> {
    const { data } = await apiClient.get<ApiResponse<Subscription>>(`/admin/subscriptions/${id}`);
    return data.data;
  },

  async getSubscriptionUsage(id: string): Promise<UsageSummary> {
    const { data } = await apiClient.get<ApiResponse<UsageSummary>>(
      `/admin/subscriptions/${id}/usage`,
    );
    return data.data;
  },

  async assignPlan(payload: AssignPlanPayload): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      '/admin/subscriptions/assign',
      payload,
    );
    return data.data;
  },

  async upgradePlan(studioId: string, planId: string, billingCycle?: BillingCycle): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      `/admin/subscriptions/studio/${studioId}/upgrade`,
      { planId, billingCycle },
    );
    return data.data;
  },

  async downgradePlan(studioId: string, planId: string, billingCycle?: BillingCycle): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      `/admin/subscriptions/studio/${studioId}/downgrade`,
      { planId, billingCycle },
    );
    return data.data;
  },

  async cancelSubscription(id: string): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      `/admin/subscriptions/${id}/cancel`,
    );
    return data.data;
  },

  async suspendSubscription(id: string): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      `/admin/subscriptions/${id}/suspend`,
    );
    return data.data;
  },

  async extendSubscription(id: string, extendDays: number): Promise<Subscription> {
    const { data } = await apiClient.post<ApiResponse<Subscription>>(
      `/admin/subscriptions/${id}/extend`,
      { extendDays },
    );
    return data.data;
  },

  async getCurrentPlan(): Promise<UsageSummary> {
    const { data } = await apiClient.get<ApiResponse<UsageSummary>>('/studio/subscription/current');
    return data.data;
  },

  async getUpgradeOptions(): Promise<Plan[]> {
    const { data } = await apiClient.get<ApiResponse<Plan[]>>('/studio/subscription/upgrades');
    return data.data;
  },
};
