import { useMemo, useState } from 'react';
import { Col, Empty, Input, Row, Segmented } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { MediaItem } from '@/types/media.types';
import { MediaCard } from './MediaCard';
import { FilePreviewModal } from './FilePreviewModal';

interface PhotoGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  onDelete?: (id: string) => void;
}

export const PhotoGallery = ({ items, loading, onDelete }: PhotoGalleryProps) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.originalFileName.toLowerCase().includes(q));
  }, [items, search]);

  if (!loading && !filtered.length) {
    return <Empty description="No photos uploaded yet" />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search photos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className="max-w-sm"
        />
        <Segmented options={['Grid', 'List']} value={view === 'grid' ? 'Grid' : 'List'} onChange={(v) => setView(v === 'Grid' ? 'grid' : 'list')} />
      </div>

      {view === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filtered.map((item) => (
            <Col key={item.id} xs={12} sm={8} md={6} lg={4}>
              <MediaCard item={item} onClick={() => setPreview(item)} />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="space-y-3">
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
      />
    </div>
  );
};
