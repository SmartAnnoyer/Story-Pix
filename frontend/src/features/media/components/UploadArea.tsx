import { useCallback, useRef, useState } from 'react';
import { CameraOutlined, InboxOutlined, PictureOutlined } from '@ant-design/icons';
import { Upload, message } from 'antd';
import { mediaService } from '@/services/media.service';
import { useUploadStore } from '@/store/upload.store';
import { MediaType } from '@/types/media.types';
import type { ConfirmUploadPayload, OverlayFrame } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';
import { readImageDimensions } from '@/features/media/utils/video-frame-capture';
import { compressImageFile } from '@/features/media/utils/compress-image';
import { assertVideoWithinLimits, formatMb } from '@/features/media/utils/video-limits';
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

const toFileList = (files: FileList | File[] | null | undefined): File[] => {
  if (!files) return [];
  return Array.from(files);
};

/** Ant Design passes RcFile (extends File) in beforeUpload fileList. */
const asFiles = (items: File[]): File[] => items.filter((file) => file instanceof Blob);

export const UploadArea = ({ albumId, mediaType, disabled, onComplete }: UploadAreaProps) => {
  const { addTask, updateTask } = useUploadStore();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const photoQueueRef = useRef<File[]>([]);
  const videoQueueRef = useRef<File[]>([]);
  const photoBatchTotalRef = useRef(0);
  const photoBatchDoneRef = useRef(0);
  const videoBatchTotalRef = useRef(0);
  const videoBatchDoneRef = useRef(0);
  const prepBusyRef = useRef(false);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState('photo.jpg');
  const [cropOriginalFile, setCropOriginalFile] = useState<File | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [videoThumbOpen, setVideoThumbOpen] = useState(false);
  const [prepLabel, setPrepLabel] = useState<string | null>(null);

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
        let uploadFile = file;

        if (mediaType === MediaType.PHOTO) {
          updateTask(taskId, { status: 'compressing', progress: 5 });
          uploadFile = await compressImageFile(file);
          updateTask(taskId, { file: uploadFile, progress: 15 });
          if (uploadFile.size < file.size) {
            message.success(
              `Photo compressed ${formatMb(file.size)} → ${formatMb(uploadFile.size)}`,
              2,
            );
          }
        }

        if (mediaType === MediaType.VIDEO) {
          await assertVideoWithinLimits(file);
        }

        updateTask(taskId, { status: 'uploading', progress: 20 });
        const initiated = await mediaService.initiateUpload({
          albumId,
          mediaType,
          originalFileName: uploadFile.name,
          mimeType: uploadFile.type || 'application/octet-stream',
          fileSize: uploadFile.size,
        });

        updateTask(taskId, { mediaId: initiated.media.id });

        await mediaService.uploadToStorage(initiated.upload.uploadUrl, uploadFile, (percent) =>
          updateTask(taskId, { progress: Math.max(20, Math.round(percent * 0.75 + 20)) }),
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
    setCropOriginalFile(file);
    setCropSrc(url);
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropOriginalFile(null);
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

  const refreshPhotoPrepLabel = () => {
    const total = photoBatchTotalRef.current;
    const done = photoBatchDoneRef.current;
    if (total <= 1) {
      setPrepLabel(null);
      return;
    }
    setPrepLabel(`Preparing photo ${Math.min(done + 1, total)} of ${total}`);
  };

  const pumpPhotoQueue = () => {
    if (prepBusyRef.current) return;
    const next = photoQueueRef.current.shift();
    if (!next) {
      photoBatchTotalRef.current = 0;
      photoBatchDoneRef.current = 0;
      setPrepLabel(null);
      return;
    }
    prepBusyRef.current = true;
    refreshPhotoPrepLabel();
    // Multi-file batches skip crop and go straight to frame placement.
    if (photoBatchTotalRef.current > 1) {
      openFrameSelect(next);
    } else {
      openGalleryCrop(next);
    }
  };

  const enqueuePhotos = (files: File[]) => {
    const valid = files.filter(
      (file) => file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name),
    );
    if (!valid.length) {
      message.warning('No supported photos in that selection');
      return;
    }
    const wasIdle = photoQueueRef.current.length === 0 && !prepBusyRef.current;
    photoQueueRef.current.push(...valid);
    if (wasIdle) {
      photoBatchTotalRef.current = valid.length;
      photoBatchDoneRef.current = 0;
    } else {
      photoBatchTotalRef.current += valid.length;
    }
    if (valid.length > 1) {
      message.info(`Added ${valid.length} photos — set the video area for each`);
    }
    if (!cropSrc && !pendingPhoto && !prepBusyRef.current) {
      pumpPhotoQueue();
    } else {
      refreshPhotoPrepLabel();
    }
  };

  const finishPhotoPrep = () => {
    prepBusyRef.current = false;
    photoBatchDoneRef.current += 1;
    closeFrameSelect();
    closeCrop();
    window.setTimeout(() => pumpPhotoQueue(), 0);
  };

  const closeVideoThumbnail = () => {
    setVideoThumbOpen(false);
    setPendingVideo(null);
  };

  const refreshVideoPrepLabel = () => {
    const total = videoBatchTotalRef.current;
    const done = videoBatchDoneRef.current;
    if (total <= 1) {
      setPrepLabel(null);
      return;
    }
    setPrepLabel(`Preparing video ${Math.min(done + 1, total)} of ${total}`);
  };

  const pumpVideoQueue = () => {
    if (prepBusyRef.current) return;
    const next = videoQueueRef.current.shift();
    if (!next) {
      videoBatchTotalRef.current = 0;
      videoBatchDoneRef.current = 0;
      setPrepLabel(null);
      return;
    }
    prepBusyRef.current = true;
    refreshVideoPrepLabel();
    void (async () => {
      try {
        await assertVideoWithinLimits(next);
        setPendingVideo(next);
        setVideoThumbOpen(true);
      } catch (error) {
        message.error(getErrorMessage(error, 'Video not accepted'));
        prepBusyRef.current = false;
        videoBatchDoneRef.current += 1;
        window.setTimeout(() => pumpVideoQueue(), 0);
      }
    })();
  };

  const enqueueVideos = (files: File[]) => {
    const valid = files.filter(
      (file) => file.type.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name),
    );
    if (!valid.length) {
      message.warning('No supported videos in that selection');
      return;
    }
    const wasIdle = videoQueueRef.current.length === 0 && !prepBusyRef.current;
    videoQueueRef.current.push(...valid);
    if (wasIdle) {
      videoBatchTotalRef.current = valid.length;
      videoBatchDoneRef.current = 0;
    } else {
      videoBatchTotalRef.current += valid.length;
    }
    if (valid.length > 1) {
      message.info(`Added ${valid.length} videos — pick a cover frame for each`);
    }
    if (!videoThumbOpen && !prepBusyRef.current) {
      pumpVideoQueue();
    } else {
      refreshVideoPrepLabel();
    }
  };

  const finishVideoPrep = () => {
    prepBusyRef.current = false;
    videoBatchDoneRef.current += 1;
    closeVideoThumbnail();
    window.setTimeout(() => pumpVideoQueue(), 0);
  };

  if (mediaType === MediaType.PHOTO) {
    return (
      <div className="media-upload">
        <p className="media-upload__hint">
          Take a photo or pick several from gallery. Large photos are compressed automatically. Keep
          the full image or trim edges, then mark where the video should play.
        </p>
        {prepLabel ? <p className="media-upload__queue">{prepLabel}</p> : null}
        <div className="media-upload__actions">
          <button
            type="button"
            className="media-upload__btn media-upload__btn--primary"
            disabled={disabled}
            onClick={() => setCaptureOpen(true)}
          >
            <CameraOutlined /> Take photo
          </button>
          <button
            type="button"
            className="media-upload__btn"
            disabled={disabled}
            onClick={() => galleryInputRef.current?.click()}
          >
            <PictureOutlined /> Gallery
          </button>
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const files = toFileList(event.target.files);
            event.target.value = '';
            if (files.length) enqueuePhotos(files);
          }}
        />
        <Dragger
          multiple
          disabled={disabled}
          accept={PHOTO_ACCEPT}
          showUploadList={false}
          beforeUpload={(file, fileList) => {
            const index = fileList.findIndex((item) => item.uid === file.uid);
            if (index === fileList.length - 1) {
              enqueuePhotos(asFiles(fileList));
            }
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Drop photos here</p>
          <p className="ant-upload-hint">JPG, PNG, WEBP — select or drop many at once</p>
        </Dragger>

        <PhotoCaptureModal
          open={captureOpen}
          onCancel={() => setCaptureOpen(false)}
          onCapture={(file) => {
            setCaptureOpen(false);
            enqueuePhotos([file]);
          }}
        />
        <PhotoCropModal
          open={Boolean(cropSrc)}
          imageSrc={cropSrc}
          fileName={cropFileName}
          originalFile={cropOriginalFile}
          onConfirm={(file) => {
            closeCrop();
            openFrameSelect(file);
          }}
          onCancel={() => {
            closeCrop();
            prepBusyRef.current = false;
            photoBatchDoneRef.current += 1;
            window.setTimeout(() => pumpPhotoQueue(), 0);
          }}
        />
        <PhotoFrameSelectModal
          open={Boolean(pendingPhoto && frameSrc)}
          imageSrc={frameSrc}
          onCancel={() => {
            closeFrameSelect();
            prepBusyRef.current = false;
            photoBatchDoneRef.current += 1;
            window.setTimeout(() => pumpPhotoQueue(), 0);
          }}
          onConfirm={(overlayFrame: OverlayFrame) => {
            const file = pendingPhoto;
            if (!file) {
              finishPhotoPrep();
              return;
            }
            // Start upload immediately; continue queue for the next file.
            void readImageDimensions(file)
              .then((dimensions) =>
                processFile(file, {
                  overlayFrame,
                  width: dimensions.width,
                  height: dimensions.height,
                }),
              )
              .catch(() => processFile(file, { overlayFrame }));
            finishPhotoPrep();
          }}
        />
      </div>
    );
  }

  return (
    <div className="media-upload">
      <p className="media-upload__hint">
        Drop or choose one or more videos, then pick a cover frame for each. Keep clips under 80 MB
        and about 90 seconds — compress to 720p first if the file is larger.
      </p>
      {prepLabel ? <p className="media-upload__queue">{prepLabel}</p> : null}
      <Dragger
        multiple
        disabled={disabled}
        accept={VIDEO_ACCEPT}
        showUploadList={false}
        beforeUpload={(file, fileList) => {
          const index = fileList.findIndex((item) => item.uid === file.uid);
          if (index === fileList.length - 1) {
            enqueueVideos(asFiles(fileList));
          }
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Drop videos here</p>
        <p className="ant-upload-hint">MP4, MOV — select or drop many at once · max 80 MB, ~90s</p>
      </Dragger>

      <VideoThumbnailSelectModal
        open={videoThumbOpen}
        file={pendingVideo}
        onCancel={() => {
          closeVideoThumbnail();
          prepBusyRef.current = false;
          videoBatchDoneRef.current += 1;
          window.setTimeout(() => pumpVideoQueue(), 0);
        }}
        onConfirm={(payload) => {
          const file = pendingVideo;
          if (file) void processFile(file, payload);
          finishVideoPrep();
        }}
      />
    </div>
  );
};
