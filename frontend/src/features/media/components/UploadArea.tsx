import { useCallback, useRef, useState } from 'react';
import { CameraOutlined, InboxOutlined, PictureOutlined } from '@ant-design/icons';
import { Button, Space, Upload, message } from 'antd';
import { mediaService } from '@/services/media.service';
import { useUploadStore } from '@/store/upload.store';
import { MediaType } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { PhotoCropModal } from './PhotoCropModal';

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

  const processFile = useCallback(
    async (file: File) => {
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
        await mediaService.confirmUpload(initiated.media.id);
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

  if (mediaType === MediaType.PHOTO) {
    return (
      <div>
        <p className="mb-3 text-sm text-neutral-500">
          Use the camera frame or crop from gallery so the AR target matches what guests will scan.
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
            void processFile(file);
          }}
        />
        <PhotoCropModal
          open={Boolean(cropSrc)}
          imageSrc={cropSrc}
          fileName={cropFileName}
          onCancel={closeCrop}
          onConfirm={(file) => {
            closeCrop();
            void processFile(file);
          }}
        />
      </div>
    );
  }

  return (
    <Dragger
      multiple
      disabled={disabled}
      accept={VIDEO_ACCEPT}
      showUploadList={false}
      beforeUpload={(file) => {
        void processFile(file);
        return false;
      }}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag videos to upload</p>
      <p className="ant-upload-hint">MP4, MOV — multiple files supported</p>
    </Dragger>
  );
};
