import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type { Coupon, CreateCouponPayload, UpdateCouponPayload } from '@/types/coupon.types';

export const couponService = {
  async list(): Promise<Coupon[]> {
    const { data } = await apiClient.get<ApiResponse<Coupon[]>>('/admin/coupons');
    return data.data;
  },

  async create(payload: CreateCouponPayload): Promise<Coupon> {
    const { data } = await apiClient.post<ApiResponse<Coupon>>('/admin/coupons', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateCouponPayload): Promise<Coupon> {
    const { data } = await apiClient.patch<ApiResponse<Coupon>>(`/admin/coupons/${id}`, payload);
    return data.data;
  },

  async activate(id: string): Promise<Coupon> {
    const { data } = await apiClient.post<ApiResponse<Coupon>>(`/admin/coupons/${id}/activate`);
    return data.data;
  },

  async deactivate(id: string): Promise<Coupon> {
    const { data } = await apiClient.post<ApiResponse<Coupon>>(`/admin/coupons/${id}/deactivate`);
    return data.data;
  },
};
