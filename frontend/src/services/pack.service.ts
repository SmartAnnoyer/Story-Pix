import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api.types';
import type { Album } from '@/types/album.types';
import type {
  AlbumPack,
  AssignPackPayload,
  PaginatedPackLedger,
  StudioPackCredit,
  StudioPackSummary,
  TopUpAlbumScansPayload,
} from '@/types/pack.types';

export const packService = {
  async getAdminPacks(): Promise<AlbumPack[]> {
    const { data } = await apiClient.get<ApiResponse<AlbumPack[]>>('/admin/packs');
    return data.data;
  },

  async getLedger(params?: {
    studioId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedPackLedger> {
    const { data } = await apiClient.get<ApiResponse<PaginatedPackLedger>>('/admin/packs/ledger', {
      params,
    });
    return data.data;
  },

  async getStudioCredits(studioId: string): Promise<StudioPackSummary> {
    const { data } = await apiClient.get<ApiResponse<StudioPackSummary>>(
      `/admin/packs/studios/${studioId}/credits`,
    );
    return data.data;
  },

  async assignPack(payload: AssignPackPayload): Promise<StudioPackCredit> {
    const { data } = await apiClient.post<ApiResponse<StudioPackCredit>>(
      '/admin/packs/assign',
      payload,
    );
    return data.data;
  },

  async topUpScans(payload: TopUpAlbumScansPayload): Promise<Album> {
    const { data } = await apiClient.post<ApiResponse<Album>>('/admin/packs/top-up-scans', payload);
    return data.data;
  },

  async getStudioSummary(): Promise<StudioPackSummary> {
    const { data } = await apiClient.get<ApiResponse<StudioPackSummary>>('/studio/packs/summary');
    return data.data;
  },

  async getStudioCreditsList(): Promise<StudioPackCredit[]> {
    const { data } = await apiClient.get<ApiResponse<StudioPackCredit[]>>('/studio/packs/credits');
    return data.data;
  },

  async getStudioHistory(): Promise<PaginatedPackLedger> {
    const { data } = await apiClient.get<ApiResponse<PaginatedPackLedger>>('/studio/packs/history');
    return data.data;
  },

  async getCatalog(): Promise<AlbumPack[]> {
    const { data } = await apiClient.get<ApiResponse<AlbumPack[]>>('/studio/packs/catalog');
    return data.data;
  },
};
