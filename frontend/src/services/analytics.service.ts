import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  AlbumInsightsData,
  AnalyticsExportFormat,
  AnalyticsQueryParams,
  PaginatedAnalyticsReport,
  PlatformDashboardData,
  StudioDashboardData,
} from '@/types/analytics.types';

export const analyticsService = {
  async getStudioDashboard(params?: AnalyticsQueryParams): Promise<StudioDashboardData> {
    const { data } = await apiClient.get<ApiResponse<StudioDashboardData>>('/analytics/studio/dashboard', {
      params,
    });
    return data.data;
  },

  async getStudioReports(params?: AnalyticsQueryParams): Promise<PaginatedAnalyticsReport> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAnalyticsReport>>('/analytics/studio/reports', {
      params,
    });
    return data.data;
  },

  async getAlbumInsights(albumId: string, params?: AnalyticsQueryParams): Promise<AlbumInsightsData> {
    const { data } = await apiClient.get<ApiResponse<AlbumInsightsData>>(
      `/analytics/studio/albums/${albumId}/insights`,
      { params },
    );
    return data.data;
  },

  async exportStudioReport(params: AnalyticsQueryParams & { format?: AnalyticsExportFormat }) {
    const response = await apiClient.get('/analytics/studio/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async getPlatformDashboard(params?: AnalyticsQueryParams): Promise<PlatformDashboardData> {
    const { data } = await apiClient.get<ApiResponse<PlatformDashboardData>>('/analytics/platform/dashboard', {
      params,
    });
    return data.data;
  },

  async getPlatformReports(params?: AnalyticsQueryParams): Promise<PaginatedAnalyticsReport> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAnalyticsReport>>('/analytics/platform/reports', {
      params,
    });
    return data.data;
  },

  async getPlatformStudioAnalytics(studioId: string, params?: AnalyticsQueryParams) {
    const { data } = await apiClient.get<ApiResponse<unknown>>(`/analytics/platform/studios/${studioId}`, {
      params,
    });
    return data.data;
  },

  async exportPlatformReport(params: AnalyticsQueryParams & { format?: AnalyticsExportFormat }) {
    const response = await apiClient.get('/analytics/platform/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const downloadAnalyticsExport = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};
