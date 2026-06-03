export interface ApiMeta {
  requestId?: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
  error: null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  data: null;
  meta: ApiMeta;
  error: ApiError;
}

export interface PaginatedMeta extends ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}
