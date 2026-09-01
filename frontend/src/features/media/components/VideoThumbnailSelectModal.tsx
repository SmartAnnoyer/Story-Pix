import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal, Slider, Typography } from 'antd';
import {
  blobToDataUrl,
  captureVideoFrameToBlob,
  pickDefaultVideoPosterTime,
  readVideoMetadata,
} from '@/features/media/utils/video-frame-capture';

interface VideoThumbnailSelectModalProps {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (payload: {
    thumbnailBase64: string;
    width: number;
    height: number;
    duration: number;
  }) => void;
}

export const VideoThumbnailSelectModal = ({
  open,
  file,
  onCancel,
  onConfirm,
}: VideoThumbnailSelectModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const paintPreview = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth <= 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    setPreviewReady(true);
  }, []);

  const seekTo = useCallback(
    async (seconds: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      setBusy(true);
      try {
        video.currentTime = Math.max(0, Math.min(seconds, Math.max(0, video.duration - 0.05)));
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });
        await paintPreview(video, canvas);
        setTime(video.currentTime);
      } finally {
        setBusy(false);
      }
    },
    [paintPreview],
  );

  useEffect(() => {
    if (!open || !file) {
      setVideoUrl(null);
      setPreviewReady(false);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setPreviewReady(false);

    void readVideoMetadata(file)
      .then((meta) => {
        setDuration(meta.duration);
        setWidth(meta.width);
        setHeight(meta.height);
        setTime(pickDefaultVideoPosterTime(meta.duration));
      })
      .catch(() => undefined);

    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  useEffect(() => {
    if (!open || !videoUrl || duration <= 0) return;
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      void seekTo(pickDefaultVideoPosterTime(video.duration || duration));
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onLoaded();
    } else {
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
    }
  }, [open, videoUrl, duration, seekTo]);

  const handleConfirm = async () => {
    const video = videoRef.current;
    if (!video || !file) return;
    setBusy(true);
    try {
      const blob = await captureVideoFrameToBlob(video, time);
      const thumbnailBase64 = await blobToDataUrl(blob);
      onConfirm({
        thumbnailBase64,
        width: width || video.videoWidth,
        height: height || video.videoHeight,
        duration: duration || video.duration,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Choose video thumbnail"
      onCancel={onCancel}
      width={720}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={busy}
          disabled={!previewReady}
          onClick={() => void handleConfirm()}
        >
          Use this frame
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary" className="!mb-3">
        Drag the slider to pick the frame guests will see in your library and mapping screens.
      </Typography.Paragraph>
      <div className="video-thumb-picker">
        <canvas ref={canvasRef} className="video-thumb-picker__preview" />
        <video ref={videoRef} src={videoUrl ?? undefined} className="hidden" playsInline muted />
      </div>
      <Slider
        className="mt-4"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.05}
        value={time}
        disabled={busy || duration <= 0}
        tooltip={{ formatter: (value) => `${(value ?? 0).toFixed(1)}s` }}
        onChange={(value) => void seekTo(Array.isArray(value) ? value[0] : value)}
      />
    </Modal>
  );
};
