import axios from 'axios';
import { env } from '@/utils/env';
import type { ApiResponse } from '@/types/api.types';
import type {
  RecordViewerEventPayload,
  ViewerManifest,
} from '@/types/ar-target.types';

const publicClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const viewerService = {
  getTrackingImageUrl(albumSlug: string, targetId: string, photoMediaId: string) {
    const params = new URLSearchParams({ media: photoMediaId });
    return `${env.apiBaseUrl}/viewer/public/${albumSlug}/targets/${targetId}/tracking-image?${params}`;
  },

  async getManifest(albumSlug: string): Promise<ViewerManifest> {
    const { data } = await publicClient.get<ApiResponse<ViewerManifest>>(
      `/viewer/public/${albumSlug}/manifest`,
    );
    return data.data;
  },

  async recordEvent(albumSlug: string, payload: RecordViewerEventPayload) {
    const { data } = await publicClient.post<ApiResponse<{ id: string }>>(
      `/viewer/public/${albumSlug}/events`,
      payload,
    );
    return data.data;
  },
};

export const detectDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const browserMatch = ua.match(/(Chrome|Safari|Firefox|Edg|Opera)\/[\d.]+/);
  return {
    deviceType: isMobile ? 'mobile' : 'desktop',
    browser: browserMatch?.[0] ?? 'unknown',
    userAgent: ua.slice(0, 512),
  };
};

const SESSION_KEY = 'storypix-viewer-session';

export const getViewerSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};
