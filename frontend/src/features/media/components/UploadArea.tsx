import { useCallback } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Upload, message } from 'antd';
import { mediaService } from '@/services/media.service';
import { useUploadStore } from '@/store/upload.store';
import { MediaType } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';

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
          mimeType: file.type,
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

  return (
    <Dragger
      multiple
      disabled={disabled}
      accept={mediaType === MediaType.PHOTO ? PHOTO_ACCEPT : VIDEO_ACCEPT}
      showUploadList={false}
      beforeUpload={(file) => {
        void processFile(file);
        return false;
      }}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag files to upload</p>
      <p className="ant-upload-hint">
        {mediaType === MediaType.PHOTO ? 'JPG, PNG, WEBP' : 'MP4, MOV'} — multiple files supported
      </p>
    </Dragger>
  );
};
