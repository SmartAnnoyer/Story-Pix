import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, studioService } from '@/services/studio.service';
import type {
  CreateStudioPayload,
  StudioQueryParams,
  UpdateStudioPayload,
} from '@/types/studio.types';

export const studioKeys = {
  all: ['studios'] as const,
  dashboard: () => [...studioKeys.all, 'dashboard'] as const,
  list: (params: StudioQueryParams) => [...studioKeys.all, 'list', params] as const,
  detail: (id: string) => [...studioKeys.all, 'detail', id] as const,
  profile: () => [...studioKeys.all, 'profile'] as const,
  usage: () => [...studioKeys.all, 'usage'] as const,
};

export const useAdminDashboardQuery = () =>
  useQuery({
    queryKey: studioKeys.dashboard(),
    queryFn: () => adminService.getDashboard(),
  });

export const useStudiosQuery = (params: StudioQueryParams) =>
  useQuery({
    queryKey: studioKeys.list(params),
    queryFn: () => adminService.getStudios(params),
  });

export const useStudioQuery = (id: string, enabled = true) =>
  useQuery({
    queryKey: studioKeys.detail(id),
    queryFn: () => adminService.getStudio(id),
    enabled: Boolean(id) && enabled,
  });

export const useCreateStudioMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudioPayload) => adminService.createStudio(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
};

export const useUpdateStudioMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStudioPayload) => adminService.updateStudio(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
};

export const useSuspendStudioMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.suspendStudio(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
  });
};

export const useActivateStudioMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.activateStudio(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
  });
};

export const useResetStudioAdminPasswordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.resetAdminPassword(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: studioKeys.detail(id) });
    },
  });
};

export const useDeleteStudioMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteStudio(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.all }),
  });
};

export const useStudioProfileQuery = () =>
  useQuery({
    queryKey: studioKeys.profile(),
    queryFn: () => studioService.getProfile(),
  });

export const useStudioUsageQuery = (enabled = true) =>
  useQuery({
    queryKey: studioKeys.usage(),
    queryFn: () => studioService.getUsage(),
    enabled,
  });

export const useUpdateStudioProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStudioPayload) => studioService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.profile() });
      queryClient.invalidateQueries({ queryKey: studioKeys.usage() });
    },
  });
};

export const useConfirmLogoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logoUrl: string) => studioService.confirmLogo(logoUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studioKeys.profile() }),
  });
};
