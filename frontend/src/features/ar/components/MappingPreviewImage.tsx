import { useMemo, useState } from 'react';
import type { ViewerManifestTarget } from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';

interface MappingPreviewImageProps {
  albumSlug: string;
  target: ViewerManifestTarget;
  className?: string;
  size?: 'sm' | 'lg';
}

export const MappingPreviewImage = ({
  albumSlug,
  target,
  className = '',
  size = 'sm',
}: MappingPreviewImageProps) => {
  const candidates = useMemo(() => {
    const urls = [
      target.photoThumbnailUrl,
      target.photoUrl,
      viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId),
    ].filter((url): url is string => Boolean(url));
    return [...new Set(urls)];
  }, [albumSlug, target]);

  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? null;

  const sizeClass =
    size === 'lg' ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-16 w-16 sm:h-20 sm:w-20';

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/20 bg-white/5 text-[10px] text-white/60 ${sizeClass} ${className}`}
      >
        Photo
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={target.targetName}
      className={`rounded-xl border-2 border-[#8A2BE2]/50 object-cover shadow-md ${sizeClass} ${className}`}
      loading="eager"
      decoding="async"
      onError={() => {
        setIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
};
