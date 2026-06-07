import { useCallback, useEffect, useRef, useState } from 'react';
import { getTargetScreenBounds, type TargetScreenBounds } from '../utils/target-projection';

export type VideoDisplayMode = 'frame' | 'fullscreen';

interface TargetFrameVideoProps {
  host: HTMLElement | null;
  targetEntity: HTMLElement | null;
  aspectRatio: number;
  primaryUrl: string | null;
  fallbackUrl?: string | null;
  active: boolean;
  mode: VideoDisplayMode;
  preferDirectUrl?: boolean;
  onModeChange: (mode: VideoDisplayMode) => void;
  onPlay?: () => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
  onExitFullscreen?: () => void;
}

const LOAD_TIMEOUT_MS = 25_000;
const DOUBLE_TAP_MS = 320;

const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const buildSourceList = (
  primaryUrl: string | null,
  fallbackUrl: string | null | undefined,
  preferDirect: boolean,
): string[] => {
  const direct = fallbackUrl ?? null;
  const proxied = primaryUrl ?? null;

  if (preferDirect) {
    return [direct, proxied].filter((url): url is string => Boolean(url));
  }
  return [proxied, direct].filter((url): url is string => Boolean(url));
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

const prepareVideoElement = (video: HTMLVideoElement) => {
  video.removeAttribute('crossorigin');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.playsInline = true;
  video.muted = true;
  video.preload = 'auto';
};

export const TargetFrameVideo = ({
  host,
  targetEntity,
  aspectRatio,
  primaryUrl,
  fallbackUrl,
  active,
  mode,
  preferDirectUrl = isMobileDevice(),
  onModeChange,
  onPlay,
  onError,
  onEnded,
  onExitFullscreen,
}: TargetFrameVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlayRef = useRef(onPlay);
  const onErrorRef = useRef(onError);
  const onEndedRef = useRef(onEnded);
  const hasNotifiedPlayRef = useRef(false);
  const lastTapRef = useRef(0);
  const [bounds, setBounds] = useState<TargetScreenBounds | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onError, onEnded]);

  const notifyPlay = useCallback(() => {
    if (hasNotifiedPlayRef.current) return;
    hasNotifiedPlayRef.current = true;
    setIsPlaying(true);
    onPlayRef.current?.();
  }, []);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return false;

    video.muted = true;
    try {
      await video.play();
    } catch {
      setNeedsTap(true);
      return false;
    }

    if (video.paused || video.videoWidth === 0) {
      setNeedsTap(true);
      return false;
    }

    setNeedsTap(false);
    notifyPlay();
    return true;
  }, [notifyPlay]);

  const loadAndPlay = useCallback(
    async (sources: string[]) => {
      const video = videoRef.current;
      if (!video || !sources.length) {
        throw new Error('No video source');
      }

      prepareVideoElement(video);
      let lastError: unknown;

      for (const source of sources) {
        try {
          video.src = source;
          video.load();
          await waitForVideoReady(video);
          const played = await tryPlay();
          if (played) return;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError ?? new Error('Video did not start');
    },
    [tryPlay],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      hasNotifiedPlayRef.current = false;
      setNeedsTap(false);
      setLoading(false);
      setIsPlaying(false);
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNeedsTap(false);
    hasNotifiedPlayRef.current = false;
    setIsPlaying(false);

    const sources = buildSourceList(primaryUrl, fallbackUrl, preferDirectUrl);

    void loadAndPlay(sources)
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current?.('Could not play the mapped video. Tap the photo or Try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, primaryUrl, fallbackUrl, preferDirectUrl, loadAndPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = mode === 'frame';
  }, [mode]);

  useEffect(() => {
    if (!active || mode !== 'frame' || !host || !targetEntity) {
      setBounds(null);
      return undefined;
    }

    let frameId = 0;

    const tick = () => {
      setBounds(getTargetScreenBounds(host, targetEntity, aspectRatio));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [active, mode, host, targetEntity, aspectRatio]);

  const handleDoubleTap = useCallback(() => {
    if (!isPlaying && !needsTap) return;
    onModeChange('fullscreen');
  }, [isPlaying, needsTap, onModeChange]);

  const handleTap = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if ('detail' in event && event.detail === 2) {
        handleDoubleTap();
        return;
      }

      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        handleDoubleTap();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    },
    [handleDoubleTap],
  );

  if (!active) return null;

  const showFrame = mode === 'frame' && bounds?.visible && !loading;
  const showFullscreen = mode === 'fullscreen';

  const frameStyle = showFrame && bounds
    ? {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    : showFullscreen
      ? { inset: 0, width: '100%', height: '100%' }
      : { left: -9999, top: 0, width: 1, height: 1 };

  return (
    <div
      className={`pointer-events-auto absolute z-[15] overflow-hidden ${
        showFullscreen ? 'inset-0 z-[40] flex flex-col bg-black' : 'rounded-sm shadow-lg'
      } ${showFrame || showFullscreen ? '' : 'opacity-0'}`}
      style={frameStyle}
      onClick={showFrame ? handleTap : undefined}
      onTouchEnd={showFrame ? handleTap : undefined}
      role="presentation"
    >
      <video
        ref={videoRef}
        className={showFullscreen ? 'h-full w-full flex-1 object-contain' : 'h-full w-full object-cover'}
        playsInline
        muted
        autoPlay
        onEnded={() => {
          if (mode === 'fullscreen') onEndedRef.current?.();
        }}
      />

      {showFrame && needsTap ? (
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white"
          onClick={(event) => {
            event.stopPropagation();
            void tryPlay();
          }}
        >
          Tap to play
        </button>
      ) : null}

      {showFrame && isPlaying ? (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
          Double-tap for full screen
        </span>
      ) : null}

      {showFullscreen ? (
        <button
          type="button"
          className="absolute left-3 top-3 z-[41] rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
          onClick={(event) => {
            event.stopPropagation();
            onExitFullscreen?.();
          }}
        >
          Back
        </button>
      ) : null}
    </div>
  );
};
