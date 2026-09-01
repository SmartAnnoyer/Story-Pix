import type { DragEvent } from 'react';
import { Tag, Typography } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { StudioMediaThumbnail } from '@/features/media/components/StudioMediaThumbnail';
import './MappingWorkspace.css';

const { Text } = Typography;

interface MappingPickerTileProps {
  item: MediaItem;
  selected?: boolean;
  mappedCount?: number;
  dropHighlight?: boolean;
  draggable?: boolean;
  droppable?: boolean;
  onSelect?: () => void;
  onPhotoDrop?: (photoMediaId: string) => void;
  onDragEnterTile?: () => void;
  onDragLeaveTile?: () => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MappingPickerTile = ({
  item,
  selected = false,
  mappedCount = 0,
  dropHighlight = false,
  draggable = false,
  droppable = false,
  onSelect,
  onPhotoDrop,
  onDragEnterTile,
  onDragLeaveTile,
}: MappingPickerTileProps) => {
  const isVideo = item.mediaType === MediaType.VIDEO;

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    if (!draggable) return;
    event.dataTransfer.setData('application/x-storypix-photo-id', item.id);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      type="button"
      className={[
        'mapping-picker-tile',
        selected ? 'mapping-picker-tile--selected' : '',
        dropHighlight ? 'mapping-picker-tile--drop-target' : '',
        mappedCount > 0 ? 'mapping-picker-tile--mapped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={draggable}
      onClick={onSelect}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        if (!droppable) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragEnter={(event) => {
        if (!droppable) return;
        event.preventDefault();
        onDragEnterTile?.();
      }}
      onDragLeave={() => onDragLeaveTile?.()}
      onDrop={(event) => {
        if (!droppable || !onPhotoDrop) return;
        event.preventDefault();
        const photoId =
          event.dataTransfer.getData('application/x-storypix-photo-id') ||
          event.dataTransfer.getData('text/plain');
        if (photoId) onPhotoDrop(photoId);
      }}
    >
      <div className="mapping-picker-tile__thumb studio-media-thumb">
        <StudioMediaThumbnail
          item={item}
          className="mapping-picker-tile__image"
          variant={isVideo ? 'thumbnail' : 'thumbnail'}
        />
        {isVideo && item.duration != null ? (
          <Tag className="mapping-picker-tile__duration">{formatDuration(item.duration)}</Tag>
        ) : null}
        {mappedCount > 0 ? (
          <Tag color="purple" className="mapping-picker-tile__badge">
            {mappedCount} mapped
          </Tag>
        ) : null}
        {selected ? <span className="mapping-picker-tile__selected-ring" aria-hidden /> : null}
      </div>
      <Text ellipsis className="mapping-picker-tile__name">
        {item.originalFileName}
      </Text>
    </button>
  );
};
