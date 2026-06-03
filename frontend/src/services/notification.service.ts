import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  EmailTemplate,
  NotificationItem,
  PaginatedJobLogs,
  PaginatedNotifications,
} from '@/types/notification.types';

export const notificationService = {
  async getNotifications(params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedNotifications>>('/notifications', {
      params,
    });
    return data.data;
  },

  async getUnreadNotifications() {
    const { data } = await apiClient.get<ApiResponse<NotificationItem[]>>('/notifications/unread');
    return data.data;
  },

  async markAsRead(id: string) {
    const { data } = await apiClient.patch<ApiResponse<NotificationItem>>(`/notifications/${id}/read`);
    return data.data;
  },

  async getAdminNotifications(params?: { page?: number; limit?: number; notificationStatus?: string; type?: string }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedNotifications>>('/admin/notifications', {
      params,
    });
    return data.data;
  },

  async getJobs(params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedJobLogs>>('/admin/jobs', { params });
    return data.data;
  },

  async getFailedJobs(params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiResponse<PaginatedJobLogs>>('/admin/jobs/failed', { params });
    return data.data;
  },

  async getEmailTemplates() {
    const { data } = await apiClient.get<ApiResponse<EmailTemplate[]>>('/admin/email-templates');
    return data.data;
  },

  async previewEmailTemplate(notificationType: string, variables?: Record<string, string>) {
    const { data } = await apiClient.post<ApiResponse<{ subject: string; html: string; text: string }>>(
      '/admin/email-templates/preview',
      { notificationType, variables },
    );
    return data.data;
  },
};
