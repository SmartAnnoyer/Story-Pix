import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type {
  Album,
  AlbumQueryParams,
  CreateAlbumPayload,
  PaginatedAlbums,
  PublicAlbum,
  UpdateAlbumPayload,
} from '@/types/album.types';

export const albumService = {
  async getAlbums(params?: AlbumQueryParams): Promise<PaginatedAlbums> {
    const { data } = await apiClient.get<ApiResponse<PaginatedAlbums>>('/albums', { params });
    return data.data;
  },

  async getRecentAlbums(limit = 5): Promise<Album[]> {
    const { data } = await apiClient.get<ApiResponse<Album[]>>('/albums/recent', { params: { limit } });
    return data.data;
  },

  async getAlbum(id: string): Promise<Album> {
    const { data } = await apiClient.get<ApiResponse<Album>>(`/albums/${id}`);
    return data.data;
  },

  async createAlbum(payload: CreateAlbumPayload): Promise<Album> {
    const { data } = await apiClient.post<ApiResponse<Album>>('/albums', payload);
    return data.data;
  },

  async updateAlbum(id: string, payload: UpdateAlbumPayload): Promise<Album> {
    const { data } = await apiClient.patch<ApiResponse<Album>>(`/albums/${id}`, payload);
    return data.data;
  },

  async deleteAlbum(id: string): Promise<{ id: string; deleted: boolean }> {
    const { data } = await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/albums/${id}`);
    return data.data;
  },

  async publishAlbum(id: string): Promise<Album> {
    const { data } = await apiClient.post<ApiResponse<Album>>(`/albums/${id}/publish`);
    return data.data;
  },

  async unpublishAlbum(id: string): Promise<Album> {
    const { data } = await apiClient.post<ApiResponse<Album>>(`/albums/${id}/unpublish`);
    return data.data;
  },

  async archiveAlbum(id: string): Promise<Album> {
    const { data } = await apiClient.post<ApiResponse<Album>>(`/albums/${id}/archive`);
    return data.data;
  },

  async getPublicAlbum(slug: string): Promise<PublicAlbum> {
    const { data } = await apiClient.get<ApiResponse<PublicAlbum>>(`/albums/public/${slug}`);
    return data.data;
  },
};
