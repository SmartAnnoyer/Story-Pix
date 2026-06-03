import { Card, Image, Tag, Typography } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaStatus, MediaType } from '@/types/media.types';

const { Text } = Typography;

interface MediaCardProps {
  item: MediaItem;
  onClick?: () => void;
}

const STATUS_COLORS: Record<MediaStatus, string> = {
  [MediaStatus.UPLOADING]: 'processing',
  [MediaStatus.PROCESSING]: 'processing',
  [MediaStatus.READY]: 'success',
  [MediaStatus.FAILED]: 'error',
  [MediaStatus.DELETED]: 'default',
};

export const MediaCard = ({ item, onClick }: MediaCardProps) => {
  const previewUrl = item.thumbnailUrl ?? item.publicUrl;
  const isVideo = item.mediaType === MediaType.VIDEO;

  return (
    <Card hoverable={Boolean(onClick)} className="overflow-hidden" onClick={onClick}>
      <div className="relative mb-3 aspect-square overflow-hidden rounded-md bg-gray-100">
        {previewUrl ? (
          <Image src={previewUrl} alt={item.originalFileName} className="h-full w-full object-cover" preview={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No preview</div>
        )}
        {isVideo && item.duration != null ? (
          <Tag className="absolute bottom-2 right-2 m-0">{formatDuration(item.duration)}</Tag>
        ) : null}
      </div>
      <Text ellipsis className="block font-medium">
        {item.originalFileName}
      </Text>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Tag color={STATUS_COLORS[item.status]}>{item.status}</Tag>
        <Text type="secondary" className="text-xs">
          {(item.fileSize / (1024 * 1024)).toFixed(1)} MB
        </Text>
      </div>
    </Card>
  );
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
