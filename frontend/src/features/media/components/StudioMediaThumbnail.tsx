import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import {
  getDirectMediaPreviewUrl,
  getStudioMediaPreviewPath,
  type StudioMediaPreviewVariant,
} from '@/features/media/utils/media-preview-url';
import './StudioMediaThumbnail.css';

const blobCache = new Map<string, string>();

export const loadAuthenticatedMediaPreview = async (
  mediaId: string,
  variant: StudioMediaPreviewVariant,
): Promise<string | null> => {
  const cacheKey = `${mediaId}:${variant}`;
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await apiClient.get<Blob>(getStudioMediaPreviewPath(mediaId, variant), {
      responseType: 'blob',
    });
    if (!data || data.size === 0) return null;
    const objectUrl = URL.createObjectURL(data);
    blobCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
};

const resolveStudioPreviewSrc = async (
  item: MediaItem,
  variant: StudioMediaPreviewVariant,
  skipDirect = false,
): Promise<string | null> => {
  if (!skipDirect) {
    const direct = getDirectMediaPreviewUrl(item, variant);
    if (direct) return direct;
  }

  const thumb = await loadAuthenticatedMediaPreview(item.id, 'thumbnail');
  if (thumb) return thumb;

  if (item.mediaType === MediaType.PHOTO) {
    const original = await loadAuthenticatedMediaPreview(item.id, 'original');
    if (original) return original;
  }

  if (variant === 'original') {
    return loadAuthenticatedMediaPreview(item.id, 'original');
  }

  return null;
};

interface StudioMediaThumbnailProps {
  item: MediaItem;
  alt?: string;
  className?: string;
  variant?: StudioMediaPreviewVariant;
}

export const StudioMediaThumbnail = ({
  item,
  alt,
  className = '',
  variant = 'thumbnail',
}: StudioMediaThumbnailProps) => {
  const [src, setSrc] = useState<string | null>(() => getDirectMediaPreviewUrl(item, variant));

  useEffect(() => {
    let cancelled = false;

    const load = async (skipDirect = false) => {
      const url = await resolveStudioPreviewSrc(item, variant, skipDirect);
      if (!cancelled) setSrc(url);
    };

    void load(false);

    return () => {
      cancelled = true;
    };
  }, [item.id, item.thumbnailUrl, item.publicUrl, item.mediaType, variant]);

  if (!src) {
    return (
      <div className={`studio-media-thumb__placeholder ${className}`.trim()} aria-hidden>
        {item.mediaType === MediaType.VIDEO ? '▶' : '🖼'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? item.originalFileName}
      className={`studio-media-thumb__image ${className}`.trim()}
      loading="lazy"
      decoding="async"
      onError={() => {
        void resolveStudioPreviewSrc(item, variant, true).then((fallback) => {
          setSrc(fallback);
        });
      }}
    />
  );
};

export const useStudioMediaPreviewSrc = (
  item: MediaItem | undefined,
  variant: StudioMediaPreviewVariant = 'thumbnail',
): string | null => {
  const [src, setSrc] = useState<string | null>(
    item ? getDirectMediaPreviewUrl(item, variant) : null,
  );

  useEffect(() => {
    if (!item) {
      setSrc(null);
      return undefined;
    }

    let cancelled = false;
    void resolveStudioPreviewSrc(item, variant).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [item, variant]);

  return src;
};

/** Clear cached blob URLs after media updates (e.g. new thumbnail). */
export const invalidateStudioMediaPreviewCache = (mediaId: string): void => {
  for (const key of blobCache.keys()) {
    if (key.startsWith(`${mediaId}:`)) {
      const url = blobCache.get(key);
      if (url) URL.revokeObjectURL(url);
      blobCache.delete(key);
    }
  }
};
