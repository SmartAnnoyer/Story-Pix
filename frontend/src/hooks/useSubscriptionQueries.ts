import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planService, subscriptionService } from '@/services/subscription.service';
import type {
  AssignPlanPayload,
  BillingCycle,
  CreatePlanPayload,
  UpdatePlanPayload,
} from '@/types/subscription.types';

export const planKeys = {
  all: ['plans'] as const,
  list: () => [...planKeys.all, 'list'] as const,
  detail: (id: string) => [...planKeys.all, 'detail', id] as const,
};

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  list: (params?: object) => [...subscriptionKeys.all, 'list', params] as const,
  detail: (id: string) => [...subscriptionKeys.all, 'detail', id] as const,
  usage: (id: string) => [...subscriptionKeys.all, 'usage', id] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  upgrades: () => [...subscriptionKeys.all, 'upgrades'] as const,
};

export const usePlansQuery = () =>
  useQuery({ queryKey: planKeys.list(), queryFn: () => planService.getPlans() });

export const usePlanQuery = (id: string) =>
  useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => planService.getPlan(id),
    enabled: Boolean(id),
  });

export const useCreatePlanMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => planService.createPlan(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
};

export const useUpdatePlanMutation = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePlanPayload) => planService.updatePlan(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
};

export const useTogglePlanMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? planService.activatePlan(id) : planService.deactivatePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
};

export const useSubscriptionsQuery = (params?: { page?: number; limit?: number; studioId?: string }) =>
  useQuery({
    queryKey: subscriptionKeys.list(params),
    queryFn: () => subscriptionService.getSubscriptions(params),
  });

export const useSubscriptionQuery = (id: string) =>
  useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => subscriptionService.getSubscription(id),
    enabled: Boolean(id),
  });

export const useSubscriptionUsageQuery = (id: string) =>
  useQuery({
    queryKey: subscriptionKeys.usage(id),
    queryFn: () => subscriptionService.getSubscriptionUsage(id),
    enabled: Boolean(id),
  });

export const useAssignPlanMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignPlanPayload) => subscriptionService.assignPlan(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: subscriptionKeys.all });
      void qc.invalidateQueries({ queryKey: ['studios'] });
    },
  });
};

export const useSubscriptionActionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      id,
      studioId,
      planId,
      billingCycle,
      extendDays,
    }: {
      action: 'cancel' | 'suspend' | 'activate' | 'extend' | 'upgrade' | 'downgrade';
      id?: string;
      studioId?: string;
      planId?: string;
      billingCycle?: BillingCycle;
      extendDays?: number;
    }) => {
      switch (action) {
        case 'cancel':
          return subscriptionService.cancelSubscription(id!);
        case 'suspend':
          return subscriptionService.suspendSubscription(id!);
        case 'activate':
          return subscriptionService.activateSubscription(id!);
        case 'extend':
          return subscriptionService.extendSubscription(id!, extendDays!);
        case 'upgrade':
          return subscriptionService.upgradePlan(studioId!, planId!, billingCycle);
        case 'downgrade':
          return subscriptionService.downgradePlan(studioId!, planId!, billingCycle);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: subscriptionKeys.all });
      void qc.invalidateQueries({ queryKey: ['studios'] });
    },
  });
};

export const useCurrentPlanQuery = () =>
  useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: () => subscriptionService.getCurrentPlan(),
  });

export const useUpgradeOptionsQuery = () =>
  useQuery({
    queryKey: subscriptionKeys.upgrades(),
    queryFn: () => subscriptionService.getUpgradeOptions(),
  });
