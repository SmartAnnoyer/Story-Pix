import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics.service';
import type { AnalyticsQueryParams } from '@/types/analytics.types';

export const analyticsKeys = {
  all: ['analytics'] as const,
  studioDashboard: (params?: AnalyticsQueryParams) =>
    [...analyticsKeys.all, 'studio-dashboard', params] as const,
  studioReports: (params?: AnalyticsQueryParams) =>
    [...analyticsKeys.all, 'studio-reports', params] as const,
  albumInsights: (albumId: string, params?: AnalyticsQueryParams) =>
    [...analyticsKeys.all, 'album-insights', albumId, params] as const,
  platformDashboard: (params?: AnalyticsQueryParams) =>
    [...analyticsKeys.all, 'platform-dashboard', params] as const,
  platformReports: (params?: AnalyticsQueryParams) =>
    [...analyticsKeys.all, 'platform-reports', params] as const,
};

export const useStudioAnalyticsDashboardQuery = (params?: AnalyticsQueryParams) =>
  useQuery({
    queryKey: analyticsKeys.studioDashboard(params),
    queryFn: () => analyticsService.getStudioDashboard(params),
  });

export const useStudioAnalyticsReportsQuery = (params?: AnalyticsQueryParams) =>
  useQuery({
    queryKey: analyticsKeys.studioReports(params),
    queryFn: () => analyticsService.getStudioReports(params),
  });

export const useAlbumInsightsQuery = (albumId: string, params?: AnalyticsQueryParams) =>
  useQuery({
    queryKey: analyticsKeys.albumInsights(albumId, params),
    queryFn: () => analyticsService.getAlbumInsights(albumId, params),
    enabled: Boolean(albumId),
  });

export const usePlatformAnalyticsDashboardQuery = (params?: AnalyticsQueryParams) =>
  useQuery({
    queryKey: analyticsKeys.platformDashboard(params),
    queryFn: () => analyticsService.getPlatformDashboard(params),
  });

export const usePlatformAnalyticsReportsQuery = (params?: AnalyticsQueryParams) =>
  useQuery({
    queryKey: analyticsKeys.platformReports(params),
    queryFn: () => analyticsService.getPlatformReports(params),
  });
