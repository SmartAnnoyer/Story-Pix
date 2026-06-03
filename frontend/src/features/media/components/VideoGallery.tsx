import { Empty, Row, Col } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaCard } from './MediaCard';
import { FilePreviewModal } from './FilePreviewModal';
import { useState } from 'react';

interface VideoGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  onDelete?: (id: string) => void;
}

export const VideoGallery = ({ items, loading, onDelete }: VideoGalleryProps) => {
  const [preview, setPreview] = useState<MediaItem | null>(null);

  if (!loading && !items.length) {
    return <Empty description="No videos uploaded yet" />;
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
            <MediaCard item={item} onClick={() => setPreview(item)} />
          </Col>
        ))}
      </Row>
      <FilePreviewModal
        item={preview}
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        onDelete={onDelete}
      />
    </>
  );
};
