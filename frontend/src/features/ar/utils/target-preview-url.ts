import type { ViewerManifestTarget } from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';

/** Best URL to show a mapping photo in the welcome / overlay UI. */
export const getTargetPreviewUrl = (
  albumSlug: string,
  target: ViewerManifestTarget,
): string | null => {
  if (target.photoThumbnailUrl) return target.photoThumbnailUrl;
  if (target.photoUrl) return target.photoUrl;
  return viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId);
};
