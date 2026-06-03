import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  ArTarget,
  ArTargetQueryParams,
  CreateArTargetPayload,
  PaginatedArTargets,
  UpdateArTargetPayload,
} from '@/types/ar-target.types';

export const arTargetService = {
  async getArTargets(params?: ArTargetQueryParams): Promise<PaginatedArTargets> {
    const { data } = await apiClient.get<ApiResponse<PaginatedArTargets>>('/ar-targets', { params });
    return data.data;
  },

  async getAlbumArTargets(albumId: string, params?: ArTargetQueryParams): Promise<PaginatedArTargets> {
    const { data } = await apiClient.get<ApiResponse<PaginatedArTargets>>(
      `/albums/${albumId}/ar-targets`,
      { params },
    );
    return data.data;
  },

  async getArTarget(id: string): Promise<ArTarget> {
    const { data } = await apiClient.get<ApiResponse<ArTarget>>(`/ar-targets/${id}`);
    return data.data;
  },

  async createArTarget(payload: CreateArTargetPayload): Promise<ArTarget> {
    const { data } = await apiClient.post<ApiResponse<ArTarget>>('/ar-targets', payload);
    return data.data;
  },

  async updateArTarget(id: string, payload: UpdateArTargetPayload): Promise<ArTarget> {
    const { data } = await apiClient.patch<ApiResponse<ArTarget>>(`/ar-targets/${id}`, payload);
    return data.data;
  },

  async deleteArTarget(id: string): Promise<{ id: string; deleted: boolean }> {
    const { data } = await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(
      `/ar-targets/${id}`,
    );
    return data.data;
  },

  async publishArTarget(id: string): Promise<ArTarget> {
    const { data } = await apiClient.post<ApiResponse<ArTarget>>(`/ar-targets/${id}/publish`);
    return data.data;
  },

  async archiveArTarget(id: string): Promise<ArTarget> {
    const { data } = await apiClient.post<ApiResponse<ArTarget>>(`/ar-targets/${id}/archive`);
    return data.data;
  },
};
