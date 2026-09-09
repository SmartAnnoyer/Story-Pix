import { useRef, useState } from 'react';
import { Button, Modal, Popconfirm } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { mediaService } from '@/services/media.service';
import { StudioMediaThumbnail } from './StudioMediaThumbnail';
import { VideoThumbnailSelectModal } from './VideoThumbnailSelectModal';
import {
  loadAuthenticatedMediaPreview,
  invalidateStudioMediaPreviewCache,
} from './StudioMediaThumbnail';
import { getErrorMessage } from '@/api/client';

interface FilePreviewModalProps {
  item: MediaItem | null;
  open: boolean;
  onClose: () => void;
  /** Return a promise so the confirm waits and the modal can close when done. */
  onDelete?: (id: string) => void | Promise<void>;
  linkedLinkCount?: number;
  onUpdated?: (item: MediaItem) => void;
}

export const FilePreviewModal = ({
  item,
  open,
  onClose,
  onDelete,
  linkedLinkCount = 0,
  onUpdated,
}: FilePreviewModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbPickerFile, setThumbPickerFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const loadPreview = async () => {
    const direct = item.publicUrl;
    if (direct) {
      setPreviewSrc(direct);
      return;
    }
    const blobUrl = await loadAuthenticatedMediaPreview(item.id, 'original');
    setPreviewSrc(blobUrl);
  };

  const kind = item.mediaType === MediaType.VIDEO ? 'video' : 'photo';
  const deleteTitle =
    linkedLinkCount > 0
      ? `Delete this ${kind} and ${linkedLinkCount} linked print → video?`
      : `Delete this ${kind}?`;
  const deleteDescription =
    linkedLinkCount > 0
      ? 'Related links will also be removed. Guests will no longer unlock video from this print.'
      : 'This cannot be undone.';

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        afterOpenChange={(visible) => {
          if (visible) void loadPreview();
          else setPreviewSrc(null);
        }}
        footer={
          onDelete ? (
            <Popconfirm
              title={deleteTitle}
              description={deleteDescription}
              okText="Delete"
              okButtonProps={{ danger: true, loading: deleting }}
              cancelText="Cancel"
              onConfirm={handleDelete}
            >
              <Button danger loading={deleting}>
                Delete
              </Button>
            </Popconfirm>
          ) : null
        }
        width={800}
        title={item.originalFileName}
      >
        <div className="mb-4 overflow-hidden rounded-lg bg-black">
          {item.mediaType === MediaType.VIDEO ? (
            previewSrc ? (
              <video ref={videoRef} src={previewSrc} controls className="max-h-[420px] w-full" />
            ) : (
              <div className="flex h-48 items-center justify-center text-white">
                Loading preview…
              </div>
            )
          ) : (
            <StudioMediaThumbnail
              item={item}
              className="max-h-[420px] w-full object-contain"
              variant="original"
            />
          )}
        </div>
        {item.mediaType === MediaType.VIDEO && previewSrc ? (
          <Button
            className="mb-4"
            onClick={async () => {
              try {
                const response = await fetch(previewSrc);
                const blob = await response.blob();
                setThumbPickerFile(new File([blob], item.originalFileName, { type: blob.type }));
              } catch {
                setThumbPickerFile(null);
              }
            }}
          >
            Choose cover frame
          </Button>
        ) : null}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-neutral-500">Status</dt>
          <dd>{item.status}</dd>
          <dt className="text-neutral-500">Size</dt>
          <dd>{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</dd>
          {item.width ? (
            <>
              <dt className="text-neutral-500">Dimensions</dt>
              <dd>
                {item.width} × {item.height}
              </dd>
            </>
          ) : null}
          {item.duration != null ? (
            <>
              <dt className="text-neutral-500">Duration</dt>
              <dd>{item.duration}s</dd>
            </>
          ) : null}
          {linkedLinkCount > 0 ? (
            <>
              <dt className="text-neutral-500">Linked</dt>
              <dd>
                {linkedLinkCount} print → video link{linkedLinkCount === 1 ? '' : 's'}
              </dd>
            </>
          ) : null}
        </dl>
      </Modal>

      <VideoThumbnailSelectModal
        open={Boolean(thumbPickerFile)}
        file={thumbPickerFile}
        onCancel={() => setThumbPickerFile(null)}
        onConfirm={async (payload) => {
          try {
            const updated = await mediaService.setMediaThumbnail(item.id, payload.thumbnailBase64);
            invalidateStudioMediaPreviewCache(item.id);
            onUpdated?.(updated);
            setThumbPickerFile(null);
          } catch (error) {
            window.alert(getErrorMessage(error, 'Could not save thumbnail'));
          }
        }}
      />
    </>
  );
};
