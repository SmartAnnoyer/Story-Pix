import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notification.service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: Record<string, unknown>) => ['notifications', 'list', params] as const,
  unread: ['notifications', 'unread'] as const,
  admin: (params?: Record<string, unknown>) => ['notifications', 'admin', params] as const,
  jobs: (params?: Record<string, unknown>) => ['notifications', 'jobs', params] as const,
  failedJobs: (params?: Record<string, unknown>) => ['notifications', 'jobs', 'failed', params] as const,
  templates: ['notifications', 'templates'] as const,
};

export const useNotificationsQuery = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationService.getNotifications(params),
  });

export const useUnreadNotificationsQuery = () =>
  useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => notificationService.getUnreadNotifications(),
    refetchInterval: 30000,
  });

export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useAdminNotificationsQuery = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: notificationKeys.admin(params),
    queryFn: () => notificationService.getAdminNotifications(params),
  });

export const useJobsQuery = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: notificationKeys.jobs(params),
    queryFn: () => notificationService.getJobs(params),
  });

export const useFailedJobsQuery = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: notificationKeys.failedJobs(params),
    queryFn: () => notificationService.getFailedJobs(params),
  });

export const useEmailTemplatesQuery = () =>
  useQuery({
    queryKey: notificationKeys.templates,
    queryFn: () => notificationService.getEmailTemplates(),
  });
