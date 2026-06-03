import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/utils/env';
import { tokenStorage } from '@/utils/storage';
import { useAuthStore } from '@/store/auth.store';
import type { ApiErrorResponse, ApiResponse } from '@/types/api.types';
import type { RefreshResponse } from '@/types/auth.types';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30000,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processRefreshQueue = (error: unknown, token: string | null = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  refreshQueue = [];
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/reset-password');

    if (isAuthEndpoint || originalRequest._retry) {
      if (!isAuthEndpoint) {
        tokenStorage.clearAccessToken();
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post<ApiResponse<RefreshResponse>>('/auth/refresh');
      const accessToken = data.data.accessToken;
      tokenStorage.setAccessToken(accessToken);
      useAuthStore.getState().setAccessToken(accessToken);
      processRefreshQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(refreshError, null);
      tokenStorage.clearAccessToken();
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
