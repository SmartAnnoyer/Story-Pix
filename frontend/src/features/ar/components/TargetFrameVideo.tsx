import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  clampOverlayFrame,
  DEFAULT_OVERLAY_FRAME,
  type OverlayFrame,
} from '../utils/overlay-frame';
import { getOverlayQuadScreenCorners, quadToCssMatrix3d } from '../utils/target-projection';
import { getPrefetchedBlobUrl, resolvePlayableVideoUrl } from '../utils/video-prefetch';
import { viewerLog } from '../utils/viewer-debug-log';
import './TargetFrameVideo.css';

export type VideoDisplayMode = 'frame' | 'fullscreen';

interface TargetFrameVideoProps {
  host: HTMLElement | null;
  targetEntity: HTMLElement | null;
  aspectRatio: number;
  overlayFrame?: OverlayFrame | null;
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
const QUAD_SIZE = 1000;

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

export const TargetFrameVideo = ({
  host,
  targetEntity,
  aspectRatio,
  overlayFrame,
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
  const stageRef = useRef<HTMLDivElement>(null);
  const lastMatrixRef = useRef<string | null>(null);
  const onPlayRef = useRef(onPlay);
  const onErrorRef = useRef(onError);
  const onEndedRef = useRef(onEnded);
  const hasNotifiedPlayRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [hasPose, setHasPose] = useState(false);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onError, onEnded]);

  // Hide the MindAR camera only in full-screen so in-frame AR can sit on the live photo.
  useEffect(() => {
    if (!host) return undefined;
    const hideCamera = active && mode === 'fullscreen';
    const videos = host.querySelectorAll('video');
    videos.forEach((node) => {
      const el = node as HTMLVideoElement;
      if (hideCamera) {
        el.dataset.spPrevVisibility = el.style.visibility || '';
        el.dataset.spPrevOpacity = el.style.opacity || '';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
      } else if (el.dataset.spPrevVisibility !== undefined) {
        el.style.visibility = el.dataset.spPrevVisibility;
        el.style.opacity = el.dataset.spPrevOpacity || '';
        delete el.dataset.spPrevVisibility;
        delete el.dataset.spPrevOpacity;
      }
    });
    return () => {
      videos.forEach((node) => {
        const el = node as HTMLVideoElement;
        if (el.dataset.spPrevVisibility !== undefined) {
          el.style.visibility = el.dataset.spPrevVisibility;
          el.style.opacity = el.dataset.spPrevOpacity || '';
          delete el.dataset.spPrevVisibility;
          delete el.dataset.spPrevOpacity;
        }
      });
    };
  }, [active, host, mode]);

  useEffect(() => {
    if (!active || mode === 'fullscreen' || !host || !targetEntity) {
      return undefined;
    }

    let raf = 0;
    const frame = clampOverlayFrame(overlayFrame ?? DEFAULT_OVERLAY_FRAME);

    const tick = () => {
      const quad = getOverlayQuadScreenCorners(host, targetEntity, aspectRatio, frame);
      if (quad?.visible) {
        const matrix = quadToCssMatrix3d(QUAD_SIZE, QUAD_SIZE, quad.corners);
        if (matrix) {
          lastMatrixRef.current = matrix;
          if (stageRef.current) {
            stageRef.current.style.transform = matrix;
            stageRef.current.style.visibility = 'visible';
          }
          setHasPose((value) => value || true);
        }
      } else if (lastMatrixRef.current && stageRef.current) {
        stageRef.current.style.transform = lastMatrixRef.current;
        stageRef.current.style.visibility = 'visible';
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active, mode, host, targetEntity, aspectRatio, overlayFrame]);

  useEffect(() => {
    if (mode !== 'fullscreen' || !stageRef.current) return;
    stageRef.current.style.transform = '';
    stageRef.current.style.visibility = '';
  }, [mode]);

  useEffect(() => {
    if (!active) {
      lastMatrixRef.current = null;
      setHasPose(false);
    }
  }, [active]);

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

      video.removeAttribute('crossorigin');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      video.preload = 'auto';
      video.controls = false;
      video.volume = 1;
      video.muted = true;
      let lastError: unknown;
      const uniqueSources = [...new Set(sources)];
      viewerLog('info', 'video load start', { sources: uniqueSources.length });

      for (const source of uniqueSources) {
        try {
          const resolved =
            (await resolvePlayableVideoUrl(source, { allowBlob: !isIOS() })) ?? source;
          const blobCached = !isIOS() ? getPrefetchedBlobUrl(source) : null;
          const src = blobCached ?? resolved;
          setPlaybackUrl(src.startsWith('blob:') ? source : src);
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
            window.setTimeout(() => {
              const rect = video.getBoundingClientRect();
              viewerLog('info', 'video play ok', {
                width: video.videoWidth,
                height: video.videoHeight,
                paused: video.paused,
                muted: video.muted,
                currentTime: Number(video.currentTime.toFixed(2)),
                rect: {
                  w: Math.round(rect.width),
                  h: Math.round(rect.height),
                  top: Math.round(rect.top),
                  left: Math.round(rect.left),
                },
              });
            }, 120);
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
      setPlaybackUrl(null);
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
          onErrorRef.current?.('Could not play the mapped video. Tap Try again or open the link.');
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
    video.controls = mode === 'fullscreen';
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

  if (!active || typeof document === 'undefined') return null;

  const showFullscreen = mode === 'fullscreen';
  const showControls = !loading;

  return createPortal(
    <div
      className={`ar-video-shell${showFullscreen ? ' ar-video-shell--fullscreen' : ' ar-video-shell--tracked'}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10040,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: showFullscreen ? 'stretch' : 'flex-end',
        gap: showFullscreen ? 0 : 12,
        padding: showFullscreen ? 0 : '0 16px max(16px, env(safe-area-inset-bottom))',
        background: showFullscreen ? '#000' : 'transparent',
        pointerEvents: showFullscreen ? 'auto' : 'none',
      }}
      role="dialog"
      aria-label={title ? `Playing ${title}` : 'Playing mapped video'}
    >
      {showFullscreen ? (
        <p className="ar-video-nowplaying">
          {loading ? 'Loading video…' : `Now playing${title ? ` · ${title}` : ''}`}
        </p>
      ) : null}

      <div
        ref={stageRef}
        className="ar-video-stage"
        style={
          showFullscreen
            ? {
                position: 'relative',
                width: '100%',
                flex: 1,
                minHeight: 0,
                border: 'none',
                borderRadius: 0,
                overflow: 'hidden',
                background: '#000',
                pointerEvents: 'auto',
              }
            : {
                position: 'fixed',
                left: 0,
                top: 0,
                width: QUAD_SIZE,
                height: QUAD_SIZE,
                transformOrigin: '0 0',
                visibility: hasPose || lastMatrixRef.current ? 'visible' : 'hidden',
                overflow: 'hidden',
                background: '#000',
                pointerEvents: 'auto',
                willChange: 'transform',
              }
        }
      >
        {showFullscreen ? null : <div className="ar-video-frame-edge" aria-hidden />}
        <div className="ar-video-media">
          <video
            ref={videoRef}
            playsInline
            muted={!soundOn}
            autoPlay
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: showFullscreen ? 'contain' : 'cover',
              background: '#000',
            }}
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
            className="ar-video-ctrl ar-video-ctrl--play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={handleTogglePlay}
          >
            <span className="ar-video-ctrl__icon" aria-hidden>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <rect x="5" y="4" width="5" height="16" rx="1.5" />
                  <rect x="14" y="4" width="5" height="16" rx="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M8 5.2v13.6c0 .9 1 1.4 1.7.9l10-6.8c.7-.5.7-1.4 0-1.8l-10-6.8C9 3.8 8 4.3 8 5.2z" />
                </svg>
              )}
            </span>
            <span className="ar-video-ctrl__label">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            className="ar-video-ctrl"
            aria-label={soundOn ? 'Mute' : 'Unmute'}
            onClick={handleToggleMute}
          >
            <span className="ar-video-ctrl__icon" aria-hidden>
              {soundOn ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M4 9v6h3.2L12 19.2V4.8L7.2 9H4zm13.5 3c0-1.8-1-3.3-2.5-4.1v8.2c1.5-.8 2.5-2.3 2.5-4.1zm-2.5-7v1.6c2.9.9 5 3.6 5 6.9s-2.1 6-5 6.9V20c3.8-1 6.5-4.5 6.5-8.5S18.8 6 15 5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M4 9v6h3.2L12 19.2V4.8L7.2 9H4zm16.3-3.1-1.4-1.4L15 8.4l-3.9 3.9v.1L15 15.6l3.9 3.9 1.4-1.4L16.4 14l3.9-3.9-1.4-1.4L15 12.2z" />
                </svg>
              )}
            </span>
            <span className="ar-video-ctrl__label">{soundOn ? 'Mute' : 'Sound'}</span>
          </button>
          <button
            type="button"
            className="ar-video-ctrl"
            aria-label={showFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={handleToggleFullscreen}
          >
            <span className="ar-video-ctrl__icon" aria-hidden>
              {showFullscreen ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm0-4h2V7h3V5H5v5h2zm10 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm12 5h-5v-2h3v-3h2v5zM5 5h5v2H7v3H5V5zm14 5h-2V7h-3V5h5v5z" />
                </svg>
              )}
            </span>
            <span className="ar-video-ctrl__label">{showFullscreen ? 'Exit' : 'Full'}</span>
          </button>
          {playbackUrl ? (
            <a
              className="ar-video-ctrl"
              href={playbackUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open video"
            >
              <span className="ar-video-ctrl__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" />
                </svg>
              </span>
              <span className="ar-video-ctrl__label">Open</span>
            </a>
          ) : null}
          {onClose ? (
            <button
              type="button"
              className="ar-video-ctrl ar-video-ctrl--done"
              aria-label="Close video"
              onClick={onClose}
            >
              <span className="ar-video-ctrl__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5z" />
                </svg>
              </span>
              <span className="ar-video-ctrl__label">Done</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body,
  );
};
