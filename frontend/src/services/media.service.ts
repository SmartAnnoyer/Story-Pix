import axios from 'axios';
import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  InitiateUploadPayload,
  InitiateUploadResponse,
  MediaItem,
  MediaQueryParams,
  PaginatedMedia,
} from '@/types/media.types';

export const mediaService = {
  async initiateUpload(payload: InitiateUploadPayload): Promise<InitiateUploadResponse> {
    const { data } = await apiClient.post<ApiResponse<InitiateUploadResponse>>('/media/upload', payload);
    return data.data;
  },

  async uploadToStorage(uploadUrl: string, file: File, onProgress?: (percent: number) => void) {
    if (uploadUrl.includes('/mock-upload/')) {
      onProgress?.(100);
      return;
    }

    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': String(file.size),
      },
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
  },

  async confirmUpload(id: string): Promise<MediaItem> {
    const { data } = await apiClient.post<ApiResponse<MediaItem>>(`/media/${id}/confirm`, {});
    return data.data;
  },

  async retryUpload(id: string): Promise<InitiateUploadResponse> {
    const { data } = await apiClient.post<ApiResponse<InitiateUploadResponse>>(`/media/${id}/retry`);
    return data.data;
  },

  async cancelUpload(id: string): Promise<{ id: string; cancelled: boolean }> {
    const { data } = await apiClient.post<ApiResponse<{ id: string; cancelled: boolean }>>(
      `/media/${id}/cancel`,
    );
    return data.data;
  },

  async getMedia(params?: MediaQueryParams): Promise<PaginatedMedia> {
    const { data } = await apiClient.get<ApiResponse<PaginatedMedia>>('/media', { params });
    return data.data;
  },

  async getAlbumMedia(albumId: string, params?: MediaQueryParams): Promise<PaginatedMedia> {
    const { data } = await apiClient.get<ApiResponse<PaginatedMedia>>(`/albums/${albumId}/media`, {
      params,
    });
    return data.data;
  },

  async getMediaItem(id: string): Promise<MediaItem> {
    const { data } = await apiClient.get<ApiResponse<MediaItem>>(`/media/${id}`);
    return data.data;
  },

  async deleteMedia(id: string): Promise<{ id: string; deleted: boolean }> {
    const { data } = await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/media/${id}`);
    return data.data;
  },
};
