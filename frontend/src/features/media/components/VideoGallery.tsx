import { useState } from 'react';
import type { MediaItem } from '@/types/media.types';
import { MediaCard } from './MediaCard';
import { FilePreviewModal } from './FilePreviewModal';

interface VideoGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
  getLinkedLinkCount?: (id: string) => number;
  onMediaUpdated?: () => void;
}

export const VideoGallery = ({
  items,
  loading,
  onDelete,
  getLinkedLinkCount,
  onMediaUpdated,
}: VideoGalleryProps) => {
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
        linkedLinkCount={preview ? (getLinkedLinkCount?.(preview.id) ?? 0) : 0}
        onUpdated={() => {
          onMediaUpdated?.();
        }}
      />
    </>
  );
};
