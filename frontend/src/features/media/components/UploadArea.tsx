import { useCallback, useRef, useState } from 'react';
import { CameraOutlined, InboxOutlined, PictureOutlined } from '@ant-design/icons';
import { Button, Space, Upload, message } from 'antd';
import { mediaService } from '@/services/media.service';
import { useUploadStore } from '@/store/upload.store';
import { MediaType } from '@/types/media.types';
import type { ConfirmUploadPayload, OverlayFrame } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';
import { readImageDimensions } from '@/features/media/utils/video-frame-capture';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { PhotoCropModal } from './PhotoCropModal';
import { PhotoFrameSelectModal } from './PhotoFrameSelectModal';
import { VideoThumbnailSelectModal } from './VideoThumbnailSelectModal';

const { Dragger } = Upload;

interface UploadAreaProps {
  albumId: string;
  mediaType: MediaType;
  disabled?: boolean;
  onComplete?: () => void;
}

const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
const VIDEO_ACCEPT = '.mp4,.mov,video/mp4,video/quicktime';

export const UploadArea = ({ albumId, mediaType, disabled, onComplete }: UploadAreaProps) => {
  const { addTask, updateTask } = useUploadStore();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState('photo.jpg');
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [videoThumbOpen, setVideoThumbOpen] = useState(false);

  const processFile = useCallback(
    async (file: File, confirmPayload?: ConfirmUploadPayload) => {
      const taskId = crypto.randomUUID();
      addTask({
        id: taskId,
        file,
        mediaType,
        progress: 0,
        status: 'pending',
      });

      try {
        updateTask(taskId, { status: 'uploading' });
        const initiated = await mediaService.initiateUpload({
          albumId,
          mediaType,
          originalFileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        });

        updateTask(taskId, { mediaId: initiated.media.id });

        await mediaService.uploadToStorage(initiated.upload.uploadUrl, file, (percent) =>
          updateTask(taskId, { progress: percent }),
        );

        updateTask(taskId, { status: 'confirming', progress: 95 });
        await mediaService.confirmUpload(initiated.media.id, confirmPayload);
        updateTask(taskId, { status: 'done', progress: 100 });
        onComplete?.();
      } catch (error) {
        updateTask(taskId, {
          status: 'failed',
          error: getErrorMessage(error, 'Upload failed'),
        });
        message.error(getErrorMessage(error, 'Upload failed'));
      }
    },
    [albumId, mediaType, addTask, updateTask, onComplete],
  );

  const openGalleryCrop = (file: File) => {
    const url = URL.createObjectURL(file);
    setCropFileName(file.name);
    setCropSrc(url);
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const openFrameSelect = (file: File) => {
    if (frameSrc) URL.revokeObjectURL(frameSrc);
    setPendingPhoto(file);
    setFrameSrc(URL.createObjectURL(file));
  };

  const closeFrameSelect = () => {
    if (frameSrc) URL.revokeObjectURL(frameSrc);
    setFrameSrc(null);
    setPendingPhoto(null);
  };

  const openVideoThumbnail = (file: File) => {
    setPendingVideo(file);
    setVideoThumbOpen(true);
  };

  const closeVideoThumbnail = () => {
    setVideoThumbOpen(false);
    setPendingVideo(null);
  };

  if (mediaType === MediaType.PHOTO) {
    return (
      <div>
        <p className="mb-3 text-sm text-neutral-500">
          Use the camera frame or crop from gallery, then mark the printed frame so the video plays
          inside it while guests scan.
        </p>
        <Space wrap className="mb-3 w-full">
          <Button
            type="primary"
            icon={<CameraOutlined />}
            disabled={disabled}
            onClick={() => setCaptureOpen(true)}
          >
            Take photo
          </Button>
          <Button
            icon={<PictureOutlined />}
            disabled={disabled}
            onClick={() => galleryInputRef.current?.click()}
          >
            Gallery &amp; crop
          </Button>
        </Space>
        <input
          ref={galleryInputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) openGalleryCrop(file);
          }}
        />
        <Dragger
          multiple
          disabled={disabled}
          accept={PHOTO_ACCEPT}
          showUploadList={false}
          beforeUpload={(file) => {
            openGalleryCrop(file);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Or drop photos here to crop</p>
          <p className="ant-upload-hint">JPG, PNG, WEBP — each file opens the crop frame</p>
        </Dragger>

        <PhotoCaptureModal
          open={captureOpen}
          onCancel={() => setCaptureOpen(false)}
          onCapture={(file) => {
            setCaptureOpen(false);
            openFrameSelect(file);
          }}
        />
        <PhotoCropModal
          open={Boolean(cropSrc)}
          imageSrc={cropSrc}
          fileName={cropFileName}
          onConfirm={(file) => {
            closeCrop();
            openFrameSelect(file);
          }}
          onCancel={closeCrop}
        />
        <PhotoFrameSelectModal
          open={Boolean(pendingPhoto && frameSrc)}
          imageSrc={frameSrc}
          onCancel={closeFrameSelect}
          onConfirm={(overlayFrame: OverlayFrame) => {
            const file = pendingPhoto;
            closeFrameSelect();
            if (!file) return;
            void readImageDimensions(file)
              .then((dimensions) =>
                processFile(file, {
                  overlayFrame,
                  width: dimensions.width,
                  height: dimensions.height,
                }),
              )
              .catch(() => processFile(file, { overlayFrame }));
          }}
        />
      </div>
    );
  }

  return (
    <>
      <Dragger
        multiple
        disabled={disabled}
        accept={VIDEO_ACCEPT}
        showUploadList={false}
        beforeUpload={(file) => {
          openVideoThumbnail(file);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag videos to upload</p>
        <p className="ant-upload-hint">MP4, MOV — pick a cover frame before upload completes</p>
      </Dragger>

      <VideoThumbnailSelectModal
        open={videoThumbOpen}
        file={pendingVideo}
        onCancel={closeVideoThumbnail}
        onConfirm={(payload) => {
          const file = pendingVideo;
          closeVideoThumbnail();
          if (file) void processFile(file, payload);
        }}
      />
    </>
  );
};
