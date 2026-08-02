import { useCallback, useEffect, useRef, useState } from 'react';
import { getPrefetchedBlobUrl, resolvePlayableVideoUrl } from '../utils/video-prefetch';
import { viewerLog } from '../utils/viewer-debug-log';
import './TargetFrameVideo.css';

export type VideoDisplayMode = 'frame' | 'fullscreen';

interface TargetFrameVideoProps {
  host: HTMLElement | null;
  targetEntity: HTMLElement | null;
  aspectRatio: number;
  primaryUrl: string | null;
  fallbackUrl?: string | null;
  active: boolean;
  mode: VideoDisplayMode;
  title?: string | null;
  preferDirectUrl?: boolean;
  onModeChange: (mode: VideoDisplayMode) => void;
  onPlay?: () => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
  onExitFullscreen?: () => void;
  onClose?: () => void;
}

const LOAD_TIMEOUT_MS = 25_000;

const isIOS = () => typeof navigator !== 'undefined' && /iP(hone|od|ad)/.test(navigator.userAgent);

const buildSourceList = (
  primaryUrl: string | null,
  fallbackUrl: string | null | undefined,
  preferDirect: boolean,
): string[] => {
  const direct = fallbackUrl ?? null;
  const proxied = primaryUrl ?? null;
  const ordered = preferDirect || Boolean(direct) ? [direct, proxied] : [proxied, direct];
  return ordered.filter((url): url is string => Boolean(url));
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
  video.preload = 'auto';
  video.volume = 1;
};

export const TargetFrameVideo = ({
  primaryUrl,
  fallbackUrl,
  active,
  mode,
  title,
  preferDirectUrl = true,
  onModeChange,
  onPlay,
  onError,
  onEnded,
  onClose,
}: TargetFrameVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlayRef = useRef(onPlay);
  const onErrorRef = useRef(onError);
  const onEndedRef = useRef(onEnded);
  const hasNotifiedPlayRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onError, onEnded]);

  const enableSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return false;
    video.muted = false;
    video.volume = 1;
    setSoundOn(true);
    return true;
  }, []);

  const notifyPlay = useCallback(() => {
    if (hasNotifiedPlayRef.current) return;
    hasNotifiedPlayRef.current = true;
    setIsPlaying(true);
    onPlayRef.current?.();
  }, []);

  const tryPlay = useCallback(
    async (withSound = false) => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return false;

      video.muted = !withSound;
      if (withSound) video.volume = 1;

      try {
        await video.play();
      } catch {
        if (withSound) {
          video.muted = true;
          try {
            await video.play();
          } catch {
            setNeedsTap(true);
            return false;
          }
        } else {
          setNeedsTap(true);
          return false;
        }
      }

      if (video.paused || video.videoWidth === 0) {
        setNeedsTap(true);
        return false;
      }

      if (withSound && !video.muted) setSoundOn(true);
      setNeedsTap(false);
      setIsPlaying(true);
      notifyPlay();
      return true;
    },
    [notifyPlay],
  );

  const loadAndPlay = useCallback(
    async (sources: string[]) => {
      const video = videoRef.current;
      if (!video || !sources.length) throw new Error('No video source');

      prepareVideoElement(video);
      video.muted = true;
      let lastError: unknown;
      const uniqueSources = [...new Set(sources)];
      viewerLog('info', 'video load start', { sources: uniqueSources.length });

      for (const source of uniqueSources) {
        try {
          // Prefer HTTPS/API URL on iPhone — blob playback often reports ready but paints black.
          const resolved =
            (await resolvePlayableVideoUrl(source, { allowBlob: !isIOS() })) ?? source;
          const blobCached = !isIOS() ? getPrefetchedBlobUrl(source) : null;
          const src = blobCached ?? resolved;
          viewerLog('debug', 'video trying source', {
            blob: src.startsWith('blob:'),
            ios: isIOS(),
            src: src.slice(0, 120),
          });
          video.src = src;
          video.load();
          await waitForVideoReady(video);
          const played = await tryPlay(false);
          if (played) {
            const rect = video.getBoundingClientRect();
            viewerLog('info', 'video play ok', {
              width: video.videoWidth,
              height: video.videoHeight,
              paused: video.paused,
              muted: video.muted,
              rect: {
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                top: Math.round(rect.top),
                left: Math.round(rect.left),
              },
            });
            return;
          }
          lastError = new Error('play() rejected');
        } catch (error) {
          lastError = error;
          viewerLog('warn', 'video source failed', {
            message: error instanceof Error ? error.message : String(error),
            src: source.slice(0, 96),
          });
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
      setSoundOn(false);
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
    setSoundOn(false);

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
    const video = videoRef.current;
    if (!video || !active) return;

    const onPlayEvt = () => setIsPlaying(true);
    const onPauseEvt = () => setIsPlaying(false);
    video.addEventListener('play', onPlayEvt);
    video.addEventListener('pause', onPauseEvt);
    return () => {
      video.removeEventListener('play', onPlayEvt);
      video.removeEventListener('pause', onPauseEvt);
    };
  }, [active]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void tryPlay(soundOn);
      return;
    }
    video.pause();
    setIsPlaying(false);
  }, [tryPlay, soundOn]);

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (soundOn) {
      video.muted = true;
      setSoundOn(false);
      return;
    }
    enableSound();
    if (video.paused) void video.play().catch(() => undefined);
  }, [soundOn, enableSound]);

  const handleToggleFullscreen = useCallback(() => {
    onModeChange(mode === 'fullscreen' ? 'frame' : 'fullscreen');
  }, [mode, onModeChange]);

  if (!active) return null;

  const showFullscreen = mode === 'fullscreen';
  const showControls = !loading;

  return (
    <div
      className={`ar-video-shell${showFullscreen ? ' ar-video-shell--fullscreen' : ''}`}
      role="presentation"
    >
      {!showFullscreen && title ? (
        <p className="ar-video-nowplaying">Now playing · {title}</p>
      ) : null}
      <div className="ar-video-stage">
        {!showFullscreen ? <div className="ar-video-glow-pulse" aria-hidden /> : null}
        <div className="ar-video-glow" aria-hidden />
        <div className="ar-video-media">
          <video
            ref={videoRef}
            playsInline
            muted={!soundOn}
            autoPlay
            onEnded={() => {
              if (mode === 'fullscreen') onEndedRef.current?.();
            }}
          />
          {needsTap ? (
            <button type="button" className="ar-video-tap-play" onClick={() => void tryPlay(true)}>
              Tap to play
            </button>
          ) : null}
        </div>
      </div>

      {showControls ? (
        <div className="ar-video-controls" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="ar-video-controls__primary"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={handleTogglePlay}
          >
            <span className="ar-video-controls__icon">{isPlaying ? '❚❚' : '▶'}</span>
          </button>
          <button type="button" aria-label={soundOn ? 'Mute' : 'Unmute'} onClick={handleToggleMute}>
            <span className="ar-video-controls__icon">{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            type="button"
            aria-label={showFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={handleToggleFullscreen}
          >
            {showFullscreen ? 'Exit' : 'Full'}
          </button>
          {onClose ? (
            <button type="button" aria-label="Close video" onClick={onClose}>
              Done
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
