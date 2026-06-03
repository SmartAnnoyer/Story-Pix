import { Button, Descriptions, Modal, Popconfirm } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';

interface FilePreviewModalProps {
  item: MediaItem | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const FilePreviewModal = ({ item, open, onClose, onDelete }: FilePreviewModalProps) => {
  if (!item) return null;

  const previewUrl = item.publicUrl ?? item.thumbnailUrl;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={
        onDelete ? (
          <Popconfirm title="Delete this file?" onConfirm={() => onDelete(item.id)}>
            <Button danger>Delete</Button>
          </Popconfirm>
        ) : null
      }
      width={800}
      title={item.originalFileName}
    >
      <div className="mb-4 overflow-hidden rounded-lg bg-black">
        {previewUrl ? (
          item.mediaType === MediaType.VIDEO ? (
            <video src={previewUrl} controls className="max-h-[420px] w-full" />
          ) : (
            <img src={previewUrl} alt={item.originalFileName} className="max-h-[420px] w-full object-contain" />
          )
        ) : (
          <div className="flex h-48 items-center justify-center text-white">Preview unavailable</div>
        )}
      </div>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Status">{item.status}</Descriptions.Item>
        <Descriptions.Item label="Size">{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</Descriptions.Item>
        {item.width ? (
          <Descriptions.Item label="Dimensions">
            {item.width} × {item.height}
          </Descriptions.Item>
        ) : null}
        {item.duration != null ? (
          <Descriptions.Item label="Duration">{item.duration}s</Descriptions.Item>
        ) : null}
        {item.createdAt ? (
          <Descriptions.Item label="Uploaded">{new Date(item.createdAt).toLocaleString()}</Descriptions.Item>
        ) : null}
      </Descriptions>
    </Modal>
  );
};
