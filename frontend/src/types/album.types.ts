export enum AlbumStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum AlbumSortField {
  CREATED_AT = 'createdAt',
  ALBUM_NAME = 'albumName',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export interface Album {
  id: string;
  studioId: string;
  albumCode: string;
  albumName: string;
  slug: string;
  publicViewerUrl: string;
  customerName: string;
  coverImage: string | null;
  status: AlbumStatus;
  isPublished: boolean;
  publishedAt: string | null;
  arScanFileReady: boolean;
  arScanFileStatus: 'idle' | 'building' | 'ready' | 'failed' | string;
  arScanFileProgress: number;
  arScanFileMessage: string | null;
  arScanFileError: string | null;
  arScanFileCompiledAt: string | null;
  arScanFileBuildStartedAt: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PublicAlbum {
  id: string;
  albumName: string;
  slug: string;
  publicViewerUrl: string;
  coverImage: string | null;
  publishedAt: string | null;
}

export interface PaginatedAlbums {
  items: Album[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CreateAlbumPayload {
  albumName: string;
  customerName: string;
  coverImage?: string;
}

export type UpdateAlbumPayload = Partial<CreateAlbumPayload>;

export interface AlbumQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AlbumStatus;
  sortBy?: AlbumSortField;
  sortOrder?: SortOrder;
}
