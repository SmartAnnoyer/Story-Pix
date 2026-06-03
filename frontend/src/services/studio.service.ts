import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  AdminDashboardStats,
  CreateStudioPayload,
  CreateStudioResult,
  PaginatedStudios,
  PresignedUploadResult,
  Studio,
  StudioAdminAccess,
  StudioQueryParams,
  StudioUsage,
  UpdateStudioPayload,
} from '@/types/studio.types';

export const adminService = {
  async getDashboard(): Promise<AdminDashboardStats> {
    const { data } = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard');
    return data.data;
  },

  async getStudios(params: StudioQueryParams): Promise<PaginatedStudios> {
    const { data } = await apiClient.get<ApiResponse<PaginatedStudios>>('/admin/studios', {
      params,
    });
    return data.data;
  },

  async getStudio(id: string): Promise<Studio> {
    const { data } = await apiClient.get<ApiResponse<Studio>>(`/admin/studios/${id}`);
    return data.data;
  },

  async createStudio(payload: CreateStudioPayload): Promise<CreateStudioResult> {
    const { data } = await apiClient.post<ApiResponse<CreateStudioResult>>(
      '/admin/studios',
      payload,
    );
    return data.data;
  },

  async updateStudio(id: string, payload: UpdateStudioPayload): Promise<Studio> {
    const { data } = await apiClient.patch<ApiResponse<Studio>>(
      `/admin/studios/${id}`,
      payload,
    );
    return data.data;
  },

  async suspendStudio(id: string): Promise<Studio> {
    const { data } = await apiClient.post<ApiResponse<Studio>>(`/admin/studios/${id}/suspend`);
    return data.data;
  },

  async activateStudio(id: string): Promise<Studio> {
    const { data } = await apiClient.post<ApiResponse<Studio>>(`/admin/studios/${id}/activate`);
    return data.data;
  },

  async deleteStudio(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/admin/studios/${id}`,
    );
    return data.data;
  },

  async resetAdminPassword(id: string): Promise<StudioAdminAccess> {
    const { data } = await apiClient.post<ApiResponse<StudioAdminAccess>>(
      `/admin/studios/${id}/reset-admin-password`,
    );
    return data.data;
  },
};

export const studioService = {
  async getProfile(): Promise<Studio> {
    const { data } = await apiClient.get<ApiResponse<Studio>>('/studio/profile');
    return data.data;
  },

  async updateProfile(payload: UpdateStudioPayload): Promise<Studio> {
    const { data } = await apiClient.patch<ApiResponse<Studio>>('/studio/profile', payload);
    return data.data;
  },

  async getUsage(): Promise<StudioUsage> {
    const { data } = await apiClient.get<ApiResponse<StudioUsage>>('/studio/usage');
    return data.data;
  },

  async requestLogoPresign(contentType: string, fileName?: string): Promise<PresignedUploadResult> {
    const { data } = await apiClient.post<ApiResponse<PresignedUploadResult>>(
      '/studio/profile/logo/presign',
      { contentType, fileName },
    );
    return data.data;
  },

  async confirmLogo(logoUrl: string): Promise<Studio> {
    const { data } = await apiClient.patch<ApiResponse<Studio>>('/studio/profile/logo', {
      logoUrl,
    });
    return data.data;
  },
};
