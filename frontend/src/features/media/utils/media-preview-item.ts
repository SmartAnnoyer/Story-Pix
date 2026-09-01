import type { ArTargetMediaSummary } from '@/types/ar-target.types';
import { MediaStatus, MediaType, type MediaItem } from '@/types/media.types';

/** Minimal MediaItem for authenticated preview components. */
export const toStudioPreviewItem = (
  summary: ArTargetMediaSummary | null | undefined,
  mediaType: MediaType,
): MediaItem | null => {
  if (!summary) return null;

  return {
    id: summary.id,
    studioId: '',
    albumId: '',
    mediaType,
    fileName: summary.originalFileName,
    originalFileName: summary.originalFileName,
    mimeType: mediaType === MediaType.VIDEO ? 'video/mp4' : 'image/jpeg',
    fileSize: 0,
    width: null,
    height: null,
    duration: summary.duration ?? null,
    r2ObjectKey: '',
    publicUrl: summary.publicUrl,
    thumbnailUrl: summary.thumbnailUrl,
    status: MediaStatus.READY,
    uploadedBy: '',
    failureReason: null,
    createdAt: null,
    updatedAt: null,
  };
};
