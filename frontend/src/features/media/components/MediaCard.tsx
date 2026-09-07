import type { MediaItem } from '@/types/media.types';
import { MediaStatus, MediaType } from '@/types/media.types';
import { StudioMediaThumbnail } from '@/features/media/components/StudioMediaThumbnail';

interface MediaCardProps {
  item: MediaItem;
  onClick?: () => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const statusLabel = (status: MediaStatus) => {
  if (status === MediaStatus.READY) return 'Ready';
  if (status === MediaStatus.PROCESSING) return 'Processing';
  if (status === MediaStatus.UPLOADING) return 'Uploading';
  if (status === MediaStatus.FAILED) return 'Failed';
  return status;
};

export const MediaCard = ({ item, onClick }: MediaCardProps) => {
  const isVideo = item.mediaType === MediaType.VIDEO;

  return (
    <button type="button" className="media-tile" onClick={onClick}>
      <div className="media-tile__thumb">
        <StudioMediaThumbnail item={item} className="absolute inset-0 h-full w-full" />
        {isVideo && item.duration != null ? (
          <span className="media-tile__duration">{formatDuration(item.duration)}</span>
        ) : null}
      </div>
      <span className="media-tile__name" title={item.originalFileName}>
        {item.originalFileName}
      </span>
      <div className="media-tile__meta">
        <span className={`media-tile__status media-tile__status--${item.status}`}>
          {statusLabel(item.status)}
        </span>
        <span className="media-tile__size">{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
      </div>
    </button>
  );
};
