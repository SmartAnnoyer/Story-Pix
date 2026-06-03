export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}

export enum MediaStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export interface MediaItem {
  id: string;
  studioId: string;
  albumId: string;
  mediaType: MediaType;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  r2ObjectKey: string;
  publicUrl: string | null;
  thumbnailUrl: string | null;
  status: MediaStatus;
  uploadedBy: string;
  failureReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface InitiateUploadPayload {
  albumId: string;
  mediaType: MediaType;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export interface InitiateUploadResponse {
  media: MediaItem;
  upload: PresignedUploadResult;
}

export interface PaginatedMedia {
  items: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface MediaQueryParams {
  albumId?: string;
  mediaType?: MediaType;
  status?: MediaStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface UploadTask {
  id: string;
  file: File;
  mediaType: MediaType;
  progress: number;
  status: 'pending' | 'uploading' | 'confirming' | 'done' | 'failed' | 'cancelled';
  error?: string;
  mediaId?: string;
}
