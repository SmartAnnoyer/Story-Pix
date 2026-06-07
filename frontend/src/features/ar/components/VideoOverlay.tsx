import { useCallback, useEffect, useRef } from 'react';

interface VideoOverlayProps {
  videoUrl: string | null;
  fallbackUrl?: string | null;
  /** Start loading / playing when true */
  active: boolean;
  /** Show video picture (hide while loading to avoid black flash) */
  showFrame: boolean;
  onPlay?: () => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
}

const LOAD_TIMEOUT_MS = 20_000;

const applyVideoSource = (video: HTMLVideoElement, source: string) => {
  if (source.includes('/viewer/public/')) {
    video.crossOrigin = 'anonymous';
  } else {
    video.removeAttribute('crossorigin');
  }
  video.src = source;
  video.load();
};

const waitForVideoReady = (video: HTMLVideoElement): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Video load timed out'));
    }, LOAD_TIMEOUT_MS);

    const checkReady = () => {
      if (video.videoWidth > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        cleanup();
        resolve();
      }
    };

    const onReady = () => checkReady();
    const onFail = () => {
      cleanup();
      reject(new Error('Video load failed'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onFail);
    };

    checkReady();
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onFail);
  });

export const VideoOverlay = ({
  videoUrl,
  fallbackUrl,
  active,
  showFrame,
  onPlay,
  onError,
  onEnded,
}: VideoOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlayRef = useRef(onPlay);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
  }, [onPlay, onError]);

  const tryPlaySource = useCallback(async (source: string) => {
    const video = videoRef.current;
    if (!video) throw new Error('Video element missing');

    applyVideoSource(video, source);
    await waitForVideoReady(video);

    video.playsInline = true;
    video.muted = true;

    await video.play();

    if (video.paused || video.videoWidth === 0) {
      throw new Error('Video did not start');
    }

    onPlayRef.current?.();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active || !videoUrl) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        await tryPlaySource(videoUrl);
      } catch {
        if (cancelled) return;
        if (fallbackUrl) {
          try {
            await tryPlaySource(fallbackUrl);
            return;
          } catch {
            // fall through
          }
        }
        if (!cancelled) {
          onErrorRef.current?.('Could not play the mapped video. Tap Try again or reload.');
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [videoUrl, fallbackUrl, active, tryPlaySource]);

  return (
    <video
      ref={videoRef}
      className={`ar-video-overlay pointer-events-none absolute inset-0 h-full w-full ${
        showFrame && active && videoUrl ? 'opacity-100' : 'opacity-0'
      }`}
      playsInline
      muted
      loop
      onEnded={onEnded}
    />
  );
};
