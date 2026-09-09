import { useMemo, useState } from 'react';
import type { MediaItem } from '@/types/media.types';
import { MediaCard } from './MediaCard';
import { FilePreviewModal } from './FilePreviewModal';

interface PhotoGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
  getLinkedLinkCount?: (id: string) => number;
  onMediaUpdated?: () => void;
}

export const PhotoGallery = ({
  items,
  loading,
  onDelete,
  getLinkedLinkCount,
  onMediaUpdated,
}: PhotoGalleryProps) => {
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.originalFileName.toLowerCase().includes(q));
  }, [items, search]);

  if (!loading && !items.length) {
    return <p className="media-tile-empty">No photos yet</p>;
  }

  return (
    <div>
      {items.length > 8 ? (
        <input
          className="mb-3 w-full max-w-xs rounded-lg border border-[#e6e4ea] bg-white px-3 py-2 text-sm"
          type="search"
          placeholder="Search photos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search photos"
        />
      ) : null}

      {!filtered.length ? (
        <p className="media-tile-empty">No photos match</p>
      ) : (
        <div className="media-tile-grid">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} onClick={() => setPreview(item)} />
          ))}
        </div>
      )}

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
    </div>
  );
};
