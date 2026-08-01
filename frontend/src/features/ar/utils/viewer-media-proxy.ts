import type { ViewerManifest, ViewerManifestTarget } from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';

const BROKEN_CDN_HOSTS = ['media.story-pix.app'];

export const isBrokenCdnUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return BROKEN_CDN_HOSTS.some((host) => url.includes(host));
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

    return {
      ...target,
      photoUrl: trackingUrl,
      photoThumbnailUrl: trackingUrl,
      videoUrl: target.videoAvailable === false ? null : videoProxyUrl,
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
          url: viewerService.getMindFileUrl(albumSlug, manifest.mindFile.hash),
        }
      : null,
    targets,
  };
};
