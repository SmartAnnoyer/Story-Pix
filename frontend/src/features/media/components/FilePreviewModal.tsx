import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { mediaService } from '@/services/media.service';
import { apiClient, getErrorMessage } from '@/api/client';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  StudioMediaThumbnail,
  invalidateStudioMediaPreviewCache,
  loadAuthenticatedMediaPreview,
} from './StudioMediaThumbnail';
import { VideoThumbnailSelectModal } from './VideoThumbnailSelectModal';
import { getStudioMediaPreviewPath } from '@/features/media/utils/media-preview-url';
import { withCacheBust } from '@/features/media/utils/cache-bust';

interface FilePreviewModalProps {
  item: MediaItem | null;
  open: boolean;
  onClose: () => void;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!item) return;
    setDisplayName(item.originalFileName.replace(/\.[^.]+$/, '') || item.originalFileName);
  }, [item]);

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
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const openCoverPicker = async () => {
    setLoadingCover(true);
    try {
      const { data } = await apiClient.get<Blob>(getStudioMediaPreviewPath(item.id, 'original'), {
        responseType: 'blob',
      });
      if (!data || data.size === 0) throw new Error('Video preview unavailable');
      const type = data.type || 'video/mp4';
      setThumbPickerFile(new File([data], item.originalFileName, { type }));
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not open cover picker'));
      setThumbPickerFile(null);
    } finally {
      setLoadingCover(false);
    }
  };

  const saveDisplayName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      message.warning('Enter a name');
      return;
    }
    const ext = item.originalFileName.includes('.')
      ? item.originalFileName.slice(item.originalFileName.lastIndexOf('.'))
      : '';
    const nextName = /\.[^.]+$/.test(trimmed) ? trimmed : `${trimmed}${ext}`;
    if (nextName === item.originalFileName) return;
    setSavingName(true);
    try {
      const updated = await mediaService.updateMedia(item.id, { originalFileName: nextName });
      onUpdated?.(updated);
      message.success('Name saved');
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not rename'));
    } finally {
      setSavingName(false);
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
            <Button danger loading={deleting} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
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

        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-500">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              placeholder="Short name"
            />
          </div>
          <Button loading={savingName} onClick={() => void saveDisplayName()}>
            Save name
          </Button>
        </div>

        {item.mediaType === MediaType.VIDEO ? (
          <Button className="mb-4" loading={loadingCover} onClick={() => void openCoverPicker()}>
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

      <ConfirmModal
        open={confirmDelete}
        title={deleteTitle}
        description={deleteDescription}
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      <VideoThumbnailSelectModal
        open={Boolean(thumbPickerFile)}
        file={thumbPickerFile}
        confirmingOverride={savingCover}
        onCancel={() => {
          if (!savingCover) setThumbPickerFile(null);
        }}
        onConfirm={async (payload) => {
          setSavingCover(true);
          try {
            const updated = await mediaService.setMediaThumbnail(item.id, payload.thumbnailBase64);
            invalidateStudioMediaPreviewCache(item.id);
            onUpdated?.({
              ...updated,
              thumbnailUrl: withCacheBust(updated.thumbnailUrl),
            });
            setThumbPickerFile(null);
            message.success('Cover frame updated');
          } catch (error) {
            message.error(getErrorMessage(error, 'Could not save thumbnail'));
          } finally {
            setSavingCover(false);
          }
        }}
      />
    </>
  );
};
