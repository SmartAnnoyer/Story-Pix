import { useState } from 'react';
import type { MediaItem } from '@/types/media.types';
import { MediaCard } from './MediaCard';
import { FilePreviewModal } from './FilePreviewModal';

interface VideoGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  onDelete?: (id: string) => void;
  onMediaUpdated?: () => void;
}

export const VideoGallery = ({ items, loading, onDelete, onMediaUpdated }: VideoGalleryProps) => {
  const [preview, setPreview] = useState<MediaItem | null>(null);

  if (!loading && !items.length) {
    return <p className="media-tile-empty">No videos yet</p>;
  }

  return (
    <>
      <div className="media-tile-grid">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onClick={() => setPreview(item)} />
        ))}
      </div>
      <FilePreviewModal
        item={preview}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        onDelete={onDelete}
        onUpdated={() => {
          onMediaUpdated?.();
        }}
      />
    </>
  );
};
