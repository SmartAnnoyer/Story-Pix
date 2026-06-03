export enum AnalyticsEventType {
  ALBUM_CREATED = 'album_created',
  ALBUM_PUBLISHED = 'album_published',
  ALBUM_ARCHIVED = 'album_archived',
  ALBUM_VIEWED = 'album_viewed',
  VIEWER_OPENED = 'viewer_opened',
  CAMERA_PERMISSION_GRANTED = 'camera_permission_granted',
  CAMERA_PERMISSION_DENIED = 'camera_permission_denied',
  SCAN_ATTEMPT = 'scan_attempt',
  SCAN_SUCCESS = 'scan_success',
  SCAN_FAILED = 'scan_failed',
  VIDEO_STARTED = 'video_started',
  VIDEO_COMPLETED = 'video_completed',
  PLAN_ASSIGNED = 'plan_assigned',
  PLAN_UPGRADED = 'plan_upgraded',
  PLAN_DOWNGRADED = 'plan_downgraded',
  PLAN_EXPIRED = 'plan_expired',
  PHOTO_UPLOADED = 'photo_uploaded',
  VIDEO_UPLOADED = 'video_uploaded',
  MEDIA_DELETED = 'media_deleted',
}

export interface AnalyticsDateRange {
  from?: string;
  to?: string;
}

export interface StudioDashboardData {
  widgets: {
    totalAlbums: number;
    totalPhotos: number;
    totalVideos: number;
    totalScans: number;
    monthlyScans: number;
    storageUsageGB: number;
  };
  charts: {
    dailyScans: Array<{ date: string; count: number }>;
    monthlyScans: Array<{ label: string; count: number }>;
    albumActivity: Array<{ date: string; eventType: string; count: number }>;
    videoPlays: Array<{ date: string; eventType: string; count: number }>;
  };
  popularAlbums: Array<{ albumId: string; albumName: string; slug: string | null; views: number }>;
  dateRange: { from: string; to: string };
}

export interface PlatformDashboardData {
  widgets: {
    totalStudios: number;
    activeStudios: number;
    monthlyGrowth: number;
    totalAlbums: number;
    totalScans: number;
    platformStorageUsageGB: number;
  };
  charts: {
    studioGrowth: Array<{ date: string; count: number }>;
    subscriptionGrowth: Array<{ date: string; eventType: string; count: number }>;
    usageTrends: Array<{ date: string; events: number; scans: number }>;
  };
  dateRange: { from: string; to: string };
}

export interface AlbumInsightsData {
  album: { id: string; albumName: string; slug: string };
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    videosPlayed: number;
  };
  topPhotos: Array<{ arTargetId: string; scans: number }>;
  dateRange: { from: string; to: string };
}

export interface AnalyticsReportRow {
  id: string;
  studioId: string;
  albumId: string | null;
  arTargetId: string | null;
  eventType: AnalyticsEventType;
  browser: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
  country: string | null;
  city: string | null;
  sessionId: string | null;
  timestamp: string;
}

export interface PaginatedAnalyticsReport {
  items: AnalyticsReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  dateRange: { from: string; to: string };
}

export interface AnalyticsQueryParams extends AnalyticsDateRange {
  albumId?: string;
  eventType?: AnalyticsEventType;
  studioId?: string;
  page?: number;
  limit?: number;
}

export type AnalyticsExportFormat = 'csv' | 'xlsx';
