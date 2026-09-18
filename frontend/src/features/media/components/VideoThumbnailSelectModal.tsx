import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, Input, Modal, Slider, Typography } from 'antd';
import {
  blobToDataUrl,
  pickDefaultVideoPosterTime,
  scaleToMaxEdge,
} from '@/features/media/utils/video-frame-capture';
import { stripFileExtension } from '@/features/media/utils/cache-bust';
import './VideoThumbnailSelectModal.css';

interface VideoThumbnailSelectModalProps {
  open: boolean;
  /** Local upload file (preferred when available). */
  file?: File | null;
  /** Remote/blob URL for existing library videos — avoids re-wrapping as File. */
  sourceUrl?: string | null;
  defaultDisplayName?: string;
  onCancel: () => void;
  onConfirm: (payload: {
    thumbnailBase64: string;
    width: number;
    height: number;
    duration: number;
    displayName: string;
  }) => void;
  /** When parent owns the save loading state (e.g. library cover update). */
  confirmingOverride?: boolean;
}

const SEEK_DEBOUNCE_MS = 120;

export const VideoThumbnailSelectModal = ({
  open,
  file = null,
  sourceUrl = null,
  defaultDisplayName,
  onCancel,
  onConfirm,
  confirmingOverride,
}: VideoThumbnailSelectModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seekTokenRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [time, setTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const busy = confirmingOverride ?? confirming;
  const needsCors = Boolean(videoUrl && /^https?:\/\//i.test(videoUrl));
  const stageStyle =
    width > 0 && height > 0
      ? ({ aspectRatio: `${width} / ${height}` } as CSSProperties)
      : undefined;

  const paintPreview = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return false;
    const scaled = scaleToMaxEdge(video.videoWidth, video.videoHeight, 960);
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.clearRect(0, 0, scaled.width, scaled.height);
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

        // Some browsers need a paint tick after seek before the frame is drawable.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        if (token !== seekTokenRef.current) return;
        if (!paintPreview(video, canvas)) {
          setLoadFailed(true);
          return;
        }
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
    if (!open) {
      setVideoUrl(null);
      setPreviewReady(false);
      setLoadFailed(false);
      setDuration(0);
      setWidth(0);
      setHeight(0);
      setTime(0);
      setSeeking(false);
      setConfirming(false);
      setDisplayName('');
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return undefined;
    }

    const fallbackName = defaultDisplayName || (file ? stripFileExtension(file.name) : 'Video');
    setDisplayName(stripFileExtension(fallbackName) || fallbackName);
    setPreviewReady(false);
    setLoadFailed(false);

    if (file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setVideoUrl(url);
    } else if (sourceUrl) {
      setVideoUrl(sourceUrl);
    } else {
      setVideoUrl(null);
    }

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open, file, sourceUrl, defaultDisplayName]);

  useEffect(() => {
    if (!open || !videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    const boot = () => {
      const nextWidth = video.videoWidth;
      const nextHeight = video.videoHeight;
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setWidth(nextWidth);
      setHeight(nextHeight);
      setDuration(nextDuration);
      const startAt = pickDefaultVideoPosterTime(nextDuration);
      setTime(startAt);
      void seekTo(startAt);
    };

    const onError = () => setLoadFailed(true);

    video.addEventListener('error', onError);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      boot();
    } else {
      video.addEventListener('loadedmetadata', boot, { once: true });
    }

    return () => {
      video.removeEventListener('error', onError);
    };
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
    if (!video || !canvas || !previewReady) return;

    setConfirming(true);
    try {
      await seekTo(time);
      if (!paintPreview(video, canvas)) throw new Error('Could not capture frame');

      let blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.82);
      });

      if (!blob) {
        const scaled = scaleToMaxEdge(video.videoWidth, video.videoHeight, 720);
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = scaled.width;
        exportCanvas.height = scaled.height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) throw new Error('Canvas unavailable');
        exportCtx.drawImage(video, 0, 0, scaled.width, scaled.height);
        blob = await new Promise<Blob>((resolve, reject) => {
          exportCanvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error('Could not capture frame'))),
            'image/jpeg',
            0.82,
          );
        });
      }

      if (!blob) throw new Error('Could not capture frame');

      const thumbnailBase64 = await blobToDataUrl(blob);
      onConfirm({
        thumbnailBase64,
        width: width || video.videoWidth,
        height: height || video.videoHeight,
        duration: duration || video.duration,
        displayName:
          displayName.trim() || stripFileExtension(file?.name || defaultDisplayName || 'Video'),
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Choose video cover"
      onCancel={onCancel}
      width={Math.min(720, typeof window !== 'undefined' ? window.innerWidth - 24 : 720)}
      destroyOnClose
      className="video-thumb-modal"
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={busy}
          disabled={!previewReady || busy || loadFailed}
          onClick={() => void handleConfirm()}
        >
          Use this frame
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary" className="!mb-3">
        Move the slider to pick the cover guests see in your library.
        {seeking ? ' Updating preview…' : ''}
      </Typography.Paragraph>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-neutral-500">Display name</label>
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={120}
          placeholder="Short name for this video"
          disabled={busy}
        />
      </div>

      <div className="video-thumb-picker" style={stageStyle}>
        <video
          ref={videoRef}
          src={videoUrl ?? undefined}
          className="video-thumb-picker__video"
          playsInline
          muted
          preload="auto"
          crossOrigin={needsCors ? 'anonymous' : undefined}
        />
        <canvas
          ref={canvasRef}
          className={`video-thumb-picker__preview${previewReady ? ' video-thumb-picker__preview--on' : ''}`}
        />
        {!previewReady && !loadFailed ? (
          <div className="video-thumb-picker__loading">Loading video…</div>
        ) : null}
        {loadFailed ? (
          <div className="video-thumb-picker__loading">
            Could not load this video for cover pick.
          </div>
        ) : null}
      </div>
      <Slider
        className="mt-4"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.05}
        value={time}
        disabled={duration <= 0 || busy || loadFailed}
        tooltip={{ formatter: (value) => `${(value ?? 0).toFixed(1)}s` }}
        onChange={handleSliderChange}
      />
    </Modal>
  );
};
