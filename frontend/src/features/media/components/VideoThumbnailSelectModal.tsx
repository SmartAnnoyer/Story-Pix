import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal, Slider, Typography } from 'antd';
import { blobToDataUrl, scaleToMaxEdge } from '@/features/media/utils/video-frame-capture';

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

const SEEK_DEBOUNCE_MS = 120;

export const VideoThumbnailSelectModal = ({
  open,
  file,
  onCancel,
  onConfirm,
}: VideoThumbnailSelectModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seekTokenRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [time, setTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const paintPreview = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth <= 0) return false;

    // Preview at a capped size so large 4K frames do not stall the UI thread.
    const scaled = scaleToMaxEdge(video.videoWidth, video.videoHeight, 720);
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    ctx.drawImage(video, 0, 0, scaled.width, scaled.height);
    setPreviewReady(true);
    return true;
  }, []);

  const seekTo = useCallback(
    async (seconds: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !Number.isFinite(video.duration) || video.duration <= 0) return;

      const token = ++seekTokenRef.current;
      const target = Math.max(0, Math.min(seconds, Math.max(0, video.duration - 0.05)));
      setSeeking(true);

      try {
        if (Math.abs(video.currentTime - target) > 0.02) {
          await new Promise<void>((resolve, reject) => {
            const onSeeked = () => {
              cleanup();
              resolve();
            };
            const onError = () => {
              cleanup();
              reject(new Error('Could not seek video'));
            };
            const cleanup = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
            };
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
            video.currentTime = target;
          });
        }

        if (token !== seekTokenRef.current) return;
        paintPreview(video, canvas);
        setTime(video.currentTime);
        setWidth(video.videoWidth || width);
        setHeight(video.videoHeight || height);
        setDuration(Number.isFinite(video.duration) ? video.duration : duration);
      } catch {
        // Keep last good preview if a seek fails mid-drag.
      } finally {
        if (token === seekTokenRef.current) setSeeking(false);
      }
    },
    [duration, height, paintPreview, width],
  );

  useEffect(() => {
    if (!open || !file) {
      setVideoUrl(null);
      setPreviewReady(false);
      setDuration(0);
      setWidth(0);
      setHeight(0);
      setTime(0);
      setSeeking(false);
      setConfirming(false);
      return undefined;
    }

    // One object URL only — avoid a second metadata pass over the full file.
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setPreviewReady(false);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  useEffect(() => {
    if (!open || !videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    const boot = () => {
      setWidth(video.videoWidth);
      setHeight(video.videoHeight);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      // First keyframe (~0s) enables the button quickly; deep mid-file seeks are slow on large videos.
      void seekTo(0);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      boot();
    } else {
      video.addEventListener('loadedmetadata', boot, { once: true });
    }
  }, [open, videoUrl, seekTo]);

  const handleSliderChange = (value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setTime(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void seekTo(next);
    }, SEEK_DEBOUNCE_MS);
  };

  const handleConfirm = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !file || !previewReady) return;

    setConfirming(true);
    try {
      // Prefer the already-painted preview canvas when possible — no second full-res seek.
      let blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.82);
      });

      if (!blob) {
        const exportCanvas = document.createElement('canvas');
        const scaled = scaleToMaxEdge(video.videoWidth, video.videoHeight);
        exportCanvas.width = scaled.width;
        exportCanvas.height = scaled.height;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(video, 0, 0, scaled.width, scaled.height);
        blob = await new Promise((resolve, reject) => {
          exportCanvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error('Could not capture frame'))),
            'image/jpeg',
            0.82,
          );
        });
      }

      const thumbnailBase64 = await blobToDataUrl(blob);
      onConfirm({
        thumbnailBase64,
        width: width || video.videoWidth,
        height: height || video.videoHeight,
        duration: duration || video.duration,
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Choose video thumbnail"
      onCancel={onCancel}
      width={720}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={confirming}
          disabled={!previewReady || confirming}
          onClick={() => void handleConfirm()}
        >
          Use this frame
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary" className="!mb-3">
        Drag the slider to pick the frame guests will see in your library and mapping screens.
        {seeking ? ' Updating preview…' : ''}
      </Typography.Paragraph>
      <div className="video-thumb-picker">
        <canvas ref={canvasRef} className="video-thumb-picker__preview" />
        <video
          ref={videoRef}
          src={videoUrl ?? undefined}
          className="hidden"
          playsInline
          muted
          preload="metadata"
        />
      </div>
      <Slider
        className="mt-4"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.05}
        value={time}
        disabled={duration <= 0 || confirming}
        tooltip={{ formatter: (value) => `${(value ?? 0).toFixed(1)}s` }}
        onChange={handleSliderChange}
      />
    </Modal>
  );
};
