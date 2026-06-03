import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService } from '@/services/billing.service';
import type { ChangeBillingPlanPayload, CreateOrderPayload, VerifyPaymentPayload } from '@/types/billing.types';

export const billingKeys = {
  subscription: ['billing', 'subscription'] as const,
  payments: (params?: Record<string, unknown>) => ['billing', 'payments', params] as const,
  invoices: (params?: Record<string, unknown>) => ['billing', 'invoices', params] as const,
  revenue: (params?: Record<string, unknown>) => ['billing', 'revenue', params] as const,
  adminPayments: (params?: Record<string, unknown>) => ['billing', 'admin', 'payments', params] as const,
  adminInvoices: (params?: Record<string, unknown>) => ['billing', 'admin', 'invoices', params] as const,
  subscriptionHistory: (params?: Record<string, unknown>) =>
    ['billing', 'admin', 'subscription-history', params] as const,
};

export const useBillingSubscriptionQuery = () =>
  useQuery({
    queryKey: billingKeys.subscription,
    queryFn: () => billingService.getCurrentSubscription(),
  });

export const usePaymentHistoryQuery = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: billingKeys.payments(params),
    queryFn: () => billingService.getPaymentHistory(params),
  });

export const useInvoicesQuery = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: billingKeys.invoices(params),
    queryFn: () => billingService.getInvoices(params),
  });

export const useRevenueQuery = (params?: { from?: string; to?: string }) =>
  useQuery({
    queryKey: billingKeys.revenue(params),
    queryFn: () => billingService.getRevenue(params),
  });

export const useAdminPaymentsQuery = (params?: {
  page?: number;
  limit?: number;
  studioId?: string;
  paymentStatus?: string;
}) =>
  useQuery({
    queryKey: billingKeys.adminPayments(params),
    queryFn: () => billingService.getAdminPayments(params),
  });

export const useAdminInvoicesQuery = (params?: { page?: number; limit?: number; studioId?: string }) =>
  useQuery({
    queryKey: billingKeys.adminInvoices(params),
    queryFn: () => billingService.getAdminInvoices(params),
  });

export const useSubscriptionHistoryQuery = (params?: { page?: number; limit?: number; studioId?: string }) =>
  useQuery({
    queryKey: billingKeys.subscriptionHistory(params),
    queryFn: () => billingService.getSubscriptionHistory(params),
  });

export const useCreateOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => billingService.createOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
  });
};

export const useVerifyPaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VerifyPaymentPayload) => billingService.verifyPayment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
};

export const useUpgradePlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangeBillingPlanPayload) => billingService.upgradePlan(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
};

export const useDowngradePlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangeBillingPlanPayload) => billingService.downgradePlan(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
};

export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
};
