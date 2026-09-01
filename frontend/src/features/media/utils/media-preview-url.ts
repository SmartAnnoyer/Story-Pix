import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { isBrokenCdnUrl } from '@/features/ar/utils/viewer-media-proxy';

export type StudioMediaPreviewVariant = 'thumbnail' | 'original';

export const isUsableDirectMediaUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  if (isBrokenCdnUrl(url)) return false;
  return /^https?:\/\//i.test(url);
};

const isVideoFileUrl = (url: string): boolean =>
  /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) || url.includes('/videos/');

/** Prefer CDN/public URLs when they resolve; otherwise callers should use the API preview route. */
export const getDirectMediaPreviewUrl = (
  item: MediaItem,
  variant: StudioMediaPreviewVariant = 'thumbnail',
): string | null => {
  if (variant === 'thumbnail') {
    if (isUsableDirectMediaUrl(item.thumbnailUrl)) return item.thumbnailUrl;
    // Photos can fall back to the original image in grids; videos cannot use mp4 in <img>.
    if (
      item.mediaType === MediaType.PHOTO &&
      isUsableDirectMediaUrl(item.publicUrl) &&
      !isVideoFileUrl(item.publicUrl)
    ) {
      return item.publicUrl;
    }
    return null;
  }

  if (isUsableDirectMediaUrl(item.publicUrl)) return item.publicUrl;
  if (isUsableDirectMediaUrl(item.thumbnailUrl)) return item.thumbnailUrl;
  return null;
};

export const needsAuthenticatedMediaPreview = (
  item: MediaItem,
  variant: StudioMediaPreviewVariant = 'thumbnail',
): boolean => !getDirectMediaPreviewUrl(item, variant);

export const getStudioMediaPreviewPath = (
  mediaId: string,
  variant: StudioMediaPreviewVariant = 'thumbnail',
): string => `/media/${mediaId}/${variant === 'thumbnail' ? 'thumbnail' : 'preview'}`;
