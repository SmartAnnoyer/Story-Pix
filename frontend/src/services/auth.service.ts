import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginCredentials,
  LoginResponse,
  RefreshResponse,
  ResetPasswordPayload,
  User,
} from '@/types/auth.types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async refresh(): Promise<RefreshResponse> {
    const { data } = await apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh');
    return data.data;
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/forgot-password',
      payload,
    );
    return data.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/reset-password',
      payload,
    );
    return data.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/change-password',
      payload,
    );
    return data.data;
  },
};
