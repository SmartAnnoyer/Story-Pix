import type { ViewerManifestTarget } from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';
import { isBrokenCdnUrl } from './viewer-media-proxy';

/** Best URL to show a mapping photo in the welcome / overlay UI. */
export const getTargetPreviewUrl = (
  albumSlug: string,
  target: ViewerManifestTarget,
): string | null => {
  const proxy = viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId);
  if (target.photoThumbnailUrl && !isBrokenCdnUrl(target.photoThumbnailUrl)) {
    return target.photoThumbnailUrl;
  }
  if (target.photoUrl && !isBrokenCdnUrl(target.photoUrl)) {
    return target.photoUrl;
  }
  return proxy;
};
