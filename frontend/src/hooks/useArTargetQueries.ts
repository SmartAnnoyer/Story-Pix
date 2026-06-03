import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { arTargetService } from '@/services/ar-target.service';
import type { ArTargetQueryParams, CreateArTargetPayload, UpdateArTargetPayload } from '@/types/ar-target.types';

export const arTargetKeys = {
  all: ['ar-targets'] as const,
  list: (params?: ArTargetQueryParams) => [...arTargetKeys.all, 'list', params] as const,
  album: (albumId: string, params?: ArTargetQueryParams) =>
    [...arTargetKeys.all, 'album', albumId, params] as const,
  detail: (id: string) => [...arTargetKeys.all, 'detail', id] as const,
};

export const useAlbumArTargetsQuery = (albumId: string, params?: ArTargetQueryParams) =>
  useQuery({
    queryKey: arTargetKeys.album(albumId, params),
    queryFn: () => arTargetService.getAlbumArTargets(albumId, params),
    enabled: Boolean(albumId),
  });

export const useArTargetQuery = (id: string) =>
  useQuery({
    queryKey: arTargetKeys.detail(id),
    queryFn: () => arTargetService.getArTarget(id),
    enabled: Boolean(id),
  });

export const useCreateArTargetMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateArTargetPayload) => arTargetService.createArTarget(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: arTargetKeys.all }),
  });
};

export const useUpdateArTargetMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateArTargetPayload }) =>
      arTargetService.updateArTarget(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: arTargetKeys.all }),
  });
};

export const useDeleteArTargetMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => arTargetService.deleteArTarget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: arTargetKeys.all }),
  });
};

export const usePublishArTargetMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => arTargetService.publishArTarget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: arTargetKeys.all }),
  });
};

export const useArchiveArTargetMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => arTargetService.archiveArTarget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: arTargetKeys.all }),
  });
};
