import { MediaType } from '@/types/media.types';
import type { ArTargetMediaSummary } from '@/types/ar-target.types';
import { StudioMediaThumbnail } from './StudioMediaThumbnail';
import { toStudioPreviewItem } from '@/features/media/utils/media-preview-item';

interface MappingMediaThumbProps {
  media: ArTargetMediaSummary | null | undefined;
  mediaType: MediaType;
  className?: string;
}

export const MappingMediaThumb = ({ media, mediaType, className = '' }: MappingMediaThumbProps) => {
  const item = toStudioPreviewItem(media, mediaType);
  if (!item) {
    return <div className={`studio-media-thumb__placeholder ${className}`.trim()}>—</div>;
  }

  return (
    <StudioMediaThumbnail
      item={item}
      className={`mapping-media-thumb ${className}`.trim()}
      variant="thumbnail"
    />
  );
};
