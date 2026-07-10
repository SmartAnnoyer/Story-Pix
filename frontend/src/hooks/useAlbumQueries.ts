import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { albumService } from '@/services/album.service';
import { AlbumStatus, type AlbumQueryParams, type CreateAlbumPayload, type UpdateAlbumPayload } from '@/types/album.types';

export const albumKeys = {
  all: ['albums'] as const,
  list: (params?: AlbumQueryParams) => [...albumKeys.all, 'list', params] as const,
  recent: () => [...albumKeys.all, 'recent'] as const,
  detail: (id: string) => [...albumKeys.all, 'detail', id] as const,
};

export const useAlbumsQuery = (params?: AlbumQueryParams) =>
  useQuery({
    queryKey: albumKeys.list(params),
    queryFn: () => albumService.getAlbums(params),
  });

export const useRecentAlbumsQuery = (limit = 5) =>
  useQuery({
    queryKey: albumKeys.recent(),
    queryFn: () => albumService.getRecentAlbums(limit),
  });

export const useAlbumQuery = (id: string, enabled = true) =>
  useQuery({
    queryKey: albumKeys.detail(id),
    queryFn: () => albumService.getAlbum(id),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => {
      const album = query.state.data;
      if (!album) return false;
      if (album.status === AlbumStatus.PUBLISHED && !album.arScanFileReady) {
        return 3000;
      }
      return false;
    },
  });

export const useCreateAlbumMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlbumPayload) => albumService.createAlbum(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: albumKeys.all }),
  });
};

export const useUpdateAlbumMutation = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAlbumPayload) => albumService.updateAlbum(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: albumKeys.all }),
  });
};

export const useAlbumActionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'publish' | 'unpublish' | 'archive' | 'delete';
    }) => {
      switch (action) {
        case 'publish':
          return albumService.publishAlbum(id);
        case 'unpublish':
          return albumService.unpublishAlbum(id);
        case 'archive':
          return albumService.archiveAlbum(id);
        case 'delete':
          return albumService.deleteAlbum(id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: albumKeys.all }),
  });
};
