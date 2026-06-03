export enum ArTargetStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum ScanEventType {
  VIEWER_OPEN = 'viewer_open',
  SCAN_SUCCESS = 'scan_success',
  SCAN_FAILED = 'scan_failed',
  VIDEO_PLAY = 'video_play',
}

export interface ArTargetMediaSummary {
  id: string;
  publicUrl: string | null;
  thumbnailUrl: string | null;
  originalFileName: string;
  duration?: number | null;
}

export interface ArTarget {
  id: string;
  studioId: string;
  albumId: string;
  photoMediaId: string;
  videoMediaId: string;
  targetName: string;
  targetIndex: number | null;
  status: ArTargetStatus;
  mindFileUrl: string | null;
  photo: ArTargetMediaSummary | null;
  video: ArTargetMediaSummary | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PaginatedArTargets {
  items: ArTarget[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CreateArTargetPayload {
  albumId: string;
  photoMediaId: string;
  videoMediaId: string;
  targetName: string;
}

export interface UpdateArTargetPayload {
  photoMediaId?: string;
  videoMediaId?: string;
  targetName?: string;
}

export interface ArTargetQueryParams {
  albumId?: string;
  status?: ArTargetStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ViewerManifestTarget {
  id: string;
  targetName: string;
  targetIndex: number;
  photoMediaId: string;
  videoMediaId: string;
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  videoAvailable: boolean;
}

export interface ViewerManifest {
  album: {
    id: string;
    albumName: string;
    slug: string;
    coverImage: string | null;
    description: string | null;
  };
  targets: ViewerManifestTarget[];
  branding: {
    studioName: string | null;
    logoUrl: string | null;
  };
}

export interface RecordViewerEventPayload {
  eventType: ScanEventType;
  arTargetId?: string;
  targetIndex?: number;
  deviceType?: string;
  browser?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export type ScanOverlayMessage =
  | 'idle'
  | 'scanning'
  | 'recognized'
  | 'move_closer'
  | 'video_unavailable'
  | 'camera_required'
  | 'loading'
  | 'preparing'
  | 'compile_failed'
  | 'no_targets';
