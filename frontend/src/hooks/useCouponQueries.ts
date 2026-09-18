import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { couponService } from '@/services/coupon.service';
import type { CreateCouponPayload, UpdateCouponPayload } from '@/types/coupon.types';

export const couponKeys = {
  all: ['coupons'] as const,
  list: () => [...couponKeys.all, 'list'] as const,
};

export const useAdminCouponsQuery = () =>
  useQuery({
    queryKey: couponKeys.list(),
    queryFn: () => couponService.list(),
  });

export const useCreateCouponMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCouponPayload) => couponService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: couponKeys.list() });
    },
  });
};

export const useUpdateCouponMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponPayload }) =>
      couponService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: couponKeys.list() });
    },
  });
};

export const useToggleCouponMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? couponService.activate(id) : couponService.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: couponKeys.list() });
    },
  });
};
