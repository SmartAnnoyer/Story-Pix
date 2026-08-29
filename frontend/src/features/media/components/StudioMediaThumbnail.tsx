import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { MediaItem } from '@/types/media.types';
import {
  getDirectMediaPreviewUrl,
  getStudioMediaPreviewPath,
  needsAuthenticatedMediaPreview,
  type StudioMediaPreviewVariant,
} from '@/features/media/utils/media-preview-url';

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
    const objectUrl = URL.createObjectURL(data);
    blobCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
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
  const directUrl = getDirectMediaPreviewUrl(item, variant);
  const [src, setSrc] = useState<string | null>(directUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (directUrl) {
      setSrc(directUrl);
      return undefined;
    }

    if (!needsAuthenticatedMediaPreview(item, variant)) {
      setSrc(null);
      return undefined;
    }

    let cancelled = false;
    void loadAuthenticatedMediaPreview(item.id, variant).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [directUrl, item.id, variant]);

  useEffect(() => {
    if (!directUrl || !failed || !needsAuthenticatedMediaPreview(item, variant)) return;
    void loadAuthenticatedMediaPreview(item.id, variant).then((url) => {
      if (url) {
        setFailed(false);
        setSrc(url);
      }
    });
  }, [directUrl, failed, item.id, variant]);

  if (!src) {
    return <div className={`studio-media-thumb__placeholder ${className}`.trim()}>No preview</div>;
  }

  return (
    <img
      src={src}
      alt={alt ?? item.originalFileName}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (directUrl && !failed) {
          setFailed(true);
          return;
        }
        setSrc(null);
      }}
    />
  );
};

export const useStudioMediaPreviewSrc = (
  item: MediaItem | undefined,
  variant: StudioMediaPreviewVariant = 'thumbnail',
): string | null => {
  const directUrl = item ? getDirectMediaPreviewUrl(item, variant) : null;
  const [src, setSrc] = useState<string | null>(directUrl);

  useEffect(() => {
    if (!item) {
      setSrc(null);
      return undefined;
    }
    if (directUrl) {
      setSrc(directUrl);
      return undefined;
    }

    let cancelled = false;
    void loadAuthenticatedMediaPreview(item.id, variant).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [directUrl, item, variant]);

  return src;
};
