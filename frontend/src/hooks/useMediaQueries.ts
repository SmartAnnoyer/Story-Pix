import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mediaService } from '@/services/media.service';
import {
  MediaStatus,
  type InitiateUploadPayload,
  type MediaQueryParams,
} from '@/types/media.types';

export const mediaKeys = {
  all: ['media'] as const,
  list: (params?: MediaQueryParams) => [...mediaKeys.all, 'list', params] as const,
  album: (albumId: string, params?: MediaQueryParams) =>
    [...mediaKeys.all, 'album', albumId, params] as const,
  detail: (id: string) => [...mediaKeys.all, 'detail', id] as const,
};

export const useAlbumMediaQuery = (albumId: string, params?: MediaQueryParams) =>
  useQuery({
    queryKey: mediaKeys.album(albumId, params),
    queryFn: () => mediaService.getAlbumMedia(albumId, params),
    enabled: Boolean(albumId),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const waiting = items.some(
        (item) => item.status === MediaStatus.PROCESSING || item.status === MediaStatus.UPLOADING,
      );
      return waiting ? 2000 : false;
    },
  });

export const useMediaQuery = (params?: MediaQueryParams) =>
  useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: () => mediaService.getMedia(params),
  });

export const useDeleteMediaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mediaService.deleteMedia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
};

export const useInitiateUploadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InitiateUploadPayload) => mediaService.initiateUpload(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
};

export const useConfirmUploadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      overlayFrame,
    }: {
      id: string;
      overlayFrame?: { x: number; y: number; width: number; height: number };
    }) => mediaService.confirmUpload(id, overlayFrame ? { overlayFrame } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
};

export const useUpdateMediaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, originalFileName }: { id: string; originalFileName: string }) =>
      mediaService.updateMedia(id, { originalFileName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
};
