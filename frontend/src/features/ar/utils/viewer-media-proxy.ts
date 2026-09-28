import type {
  ViewerManifest,
  ViewerManifestMindFile,
  ViewerManifestTarget,
} from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';

const BROKEN_CDN_HOSTS = ['media.story-pix.app'];

export const isBrokenCdnUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return BROKEN_CDN_HOSTS.some((host) => url.includes(host));
};

/** Single source of truth for which URL a mapping's video plays from (keeps caches keyed alike). */
export const getTargetPlaybackUrl = (albumSlug: string, target: ViewerManifestTarget): string =>
  target.videoUrl ?? viewerService.getMappingVideoUrl(albumSlug, target.id, target.videoMediaId);

/** AR scan file: public R2 URL first, API proxy as fallback (or only source). */
export const getMindFileUrls = (
  albumSlug: string,
  mindFile: ViewerManifestMindFile,
): { url: string; fallbackUrl: string | null } => {
  const proxyUrl = viewerService.getMindFileUrl(albumSlug, mindFile.hash);
  const directUrl =
    mindFile.directUrl && !isBrokenCdnUrl(mindFile.directUrl) ? mindFile.directUrl : null;
  return directUrl
    ? { url: directUrl, fallbackUrl: proxyUrl }
    : { url: proxyUrl, fallbackUrl: null };
};

/** Prefer API media proxies — never rely on broken CDN hosts like media.story-pix.app. */
export const withViewerMediaProxies = (
  albumSlug: string,
  manifest: ViewerManifest,
): ViewerManifest => {
  const targets: ViewerManifestTarget[] = manifest.targets.map((target) => {
    const trackingUrl = viewerService.getTrackingImageUrl(
      albumSlug,
      target.id,
      target.photoMediaId,
    );
    const videoProxyUrl = viewerService.getMappingVideoUrl(
      albumSlug,
      target.id,
      target.videoMediaId,
    );
    const videoDirectUrl =
      target.videoDirectUrl && !isBrokenCdnUrl(target.videoDirectUrl)
        ? target.videoDirectUrl
        : null;
    const hasVideo = target.videoAvailable !== false;

    return {
      ...target,
      photoUrl: trackingUrl,
      photoThumbnailUrl: trackingUrl,
      videoUrl: hasVideo ? (videoDirectUrl ?? videoProxyUrl) : null,
      videoFallbackUrl: hasVideo && videoDirectUrl ? videoProxyUrl : null,
      videoThumbnailUrl:
        target.videoThumbnailUrl && !isBrokenCdnUrl(target.videoThumbnailUrl)
          ? target.videoThumbnailUrl
          : null,
    };
  });

  return {
    ...manifest,
    album: {
      ...manifest.album,
      coverImage:
        manifest.album.coverImage && !isBrokenCdnUrl(manifest.album.coverImage)
          ? manifest.album.coverImage
          : null,
    },
    branding: {
      ...manifest.branding,
      logoUrl:
        manifest.branding.logoUrl && !isBrokenCdnUrl(manifest.branding.logoUrl)
          ? manifest.branding.logoUrl
          : null,
    },
    mindFile: manifest.mindFile
      ? {
          ...manifest.mindFile,
          url: getMindFileUrls(albumSlug, manifest.mindFile).url,
        }
      : null,
    targets,
  };
};
