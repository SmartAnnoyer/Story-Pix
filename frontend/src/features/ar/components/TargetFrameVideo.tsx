import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FULL_OVERLAY_FRAME, type OverlayFrame } from '../utils/overlay-frame';
import { getPlaybackVideoElement } from '../utils/camera-permission';
import {
  ensureTransparentRenderer,
  hideIosTrackingCanvas,
  keepMindArCameraPlaying,
  restartMindArTracking,
  setOverlayPlaybackActive,
} from '../utils/mindar-scene';
import {
  attachOverlayVideoPlane,
  detachOverlayVideoPlane,
  setOverlayVideoPlaneVisible,
} from '../utils/overlay-plane';
import {
  describeOverlayLayout,
  getOverlayAabbViewport,
  getOverlayQuadScreenCorners,
  getTargetScreenBounds,
  installPoseCapture,
  isUsableOverlayBox,
  quadToCssMatrix3d,
} from '../utils/target-projection';
import {
  awaitSameOriginVideoUrl,
  getPrefetchedBlobUrl,
  resolvePlayableVideoUrl,
} from '../utils/video-prefetch';
import { dumpArOverlayDebug } from '../utils/ar-overlay-debug';
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
  videoCount?: number;
  videoIndex?: number;
  onCycleVideo?: (direction: 1 | -1) => void;
  title?: string | null;
  preferDirectUrl?: boolean;
  onModeChange: (mode: VideoDisplayMode) => void;
  onPlay?: () => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
  onExitFullscreen?: () => void;
  onClose?: () => void;
  /** Fade in chrome once the clip is playing on the photo. */
  reveal?: boolean;
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
      if (video.videoWidth > 0) {
        cleanup();
        resolve();
        return;
      }
      cleanup();
      reject(new Error('Video load failed'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('playing', onReady);
      video.removeEventListener('error', onFail);
    };

    checkReady();
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);
    video.addEventListener('error', onFail);
  });

export const TargetFrameVideo = ({
  host,
  targetEntity,
  aspectRatio,
  overlayFrame: _overlayFrame,
  primaryUrl,
  fallbackUrl,
  active,
  mode,
  videoCount = 1,
  videoIndex = 0,
  onCycleVideo,
  title,
  preferDirectUrl = true,
  onModeChange,
  onPlay,
  onError,
  onEnded,
  onClose,
  reveal = false,
}: TargetFrameVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const onPlayRef = useRef(onPlay);
  const onErrorRef = useRef(onError);
  const onEndedRef = useRef(onEnded);
  const hasNotifiedPlayRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(true);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onError, onEnded]);

  useEffect(() => {
    if (!active) return undefined;
    const video = getPlaybackVideoElement();
    videoRef.current = video;

    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;
    video.controls = false;
    video.autoplay = true;
    if (isIOS()) {
      video.removeAttribute('crossorigin');
      video.crossOrigin = null;
    } else {
      video.crossOrigin = 'anonymous';
      video.setAttribute('crossorigin', 'anonymous');
    }

    const iosFrame = isIOS() && mode === 'frame';

    if (iosFrame && host) {
      video.id = 'sp-mapped-video';
      video.style.position = 'fixed';
      video.style.left = '0';
      video.style.top = '0';
      video.style.width = '2px';
      video.style.height = '2px';
      video.style.opacity = '0.02';
      video.style.visibility = 'visible';
      video.style.pointerEvents = 'none';
      video.style.objectFit = 'fill';
      video.style.background = 'transparent';
      video.style.zIndex = '0';
      if (video.parentElement !== host) {
        host.insertBefore(video, host.firstChild);
      }

      return () => {
        video.pause();
        video.removeAttribute('src');
        video.src = '';
        video.srcObject = null;
        video.removeAttribute('id');
        if (video.parentElement === host) {
          host.removeChild(video);
        }
        keepMindArCameraPlaying(host);
      };
    }

    const parent = mediaRef.current;
    if (!parent) return undefined;

    video.style.position = 'absolute';
    video.style.inset = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.display = 'block';
    video.style.objectFit = mode === 'fullscreen' ? 'contain' : 'fill';
    video.style.background = '#000';
    video.style.opacity = '1';
    video.style.visibility = 'visible';
    video.style.zIndex = '2';
    video.style.pointerEvents = 'none';
    video.style.transform = 'none';
    parent.appendChild(video);

    const onEndedEvt = () => {
      if (mode === 'fullscreen') onEndedRef.current?.();
    };
    video.addEventListener('ended', onEndedEvt);

    return () => {
      video.removeEventListener('ended', onEndedEvt);
      video.pause();
      video.parentNode?.removeChild(video);
      if (host) keepMindArCameraPlaying(host);
    };
  }, [active, mode, host]);

  useEffect(() => {
    if (!host) return undefined;
    const iosCrop = Boolean(active && mode === 'frame' && isIOS());
    setOverlayPlaybackActive(host, iosCrop);
    return () => setOverlayPlaybackActive(host, false);
  }, [active, mode, host]);

  useEffect(() => {
    if (!active || mode === 'fullscreen') {
      setOverlayVideoPlaneVisible(targetEntity, false);
      return undefined;
    }

    const entity = targetEntity;
    const stage = stageRef.current;
    const ios = isIOS();
    if (!entity || !host || !stage) {
      viewerLog('warn', 'AR overlay skipped', {
        hasVideo: Boolean(videoRef.current),
        hasEntity: Boolean(entity),
        hasHost: Boolean(host),
        hasStage: Boolean(stage),
        mode,
        active,
      });
      return undefined;
    }

    const frame = FULL_OVERLAY_FRAME;
    installPoseCapture(entity);
    ensureTransparentRenderer(host);
    hideIosTrackingCanvas(host);

    const parkDecoder = () => {
      const video = videoRef.current;
      if (!video) return;
      video.id = 'sp-mapped-video';
      video.style.position = 'fixed';
      video.style.left = '0';
      video.style.top = '0';
      video.style.width = '2px';
      video.style.height = '2px';
      video.style.opacity = '0.02';
      video.style.visibility = 'visible';
      video.style.zIndex = '0';
      video.style.objectFit = 'fill';
      video.style.pointerEvents = 'none';
      if (video.parentElement !== host) {
        host.insertBefore(video, host.firstChild);
      }
    };
    parkDecoder();
    if (stage) {
      stage.style.opacity = '0';
      stage.style.visibility = 'hidden';
      stage.style.width = '0px';
      stage.style.height = '0px';
    }

    let cancelled = false;
    let missFrames = 0;
    let planeAttached = false;
    let lastBox: { left: number; top: number; width: number; height: number } | null = null;
    const srcSize = 400;

    let blitCanvas: HTMLCanvasElement | null = null;
    let blitCtx: CanvasRenderingContext2D | null = null;
    if (ios && stage) {
      blitCanvas = document.createElement('canvas');
      blitCanvas.setAttribute('aria-hidden', 'true');
      blitCanvas.style.position = 'absolute';
      blitCanvas.style.inset = '0';
      blitCanvas.style.width = '100%';
      blitCanvas.style.height = '100%';
      blitCanvas.style.display = 'block';
      blitCanvas.style.pointerEvents = 'none';
      stage.appendChild(blitCanvas);
      blitCtx = blitCanvas.getContext('2d', { alpha: false });
    }

    const applyBox = (box: { left: number; top: number; width: number; height: number }) => {
      if (!stage) return;
      lastBox = box;
      stage.style.position = 'fixed';
      stage.style.left = `${box.left}px`;
      stage.style.top = `${box.top}px`;
      stage.style.width = `${box.width}px`;
      stage.style.height = `${box.height}px`;
      stage.style.transform = 'none';
      stage.style.transformOrigin = '0 0';
      stage.style.opacity = '1';
      stage.style.visibility = 'visible';
      stage.style.zIndex = '10080';
      stage.style.background = ios ? 'transparent' : '#000';
      stage.style.pointerEvents = 'none';

      if (ios) return;

      const video = videoRef.current;
      const media = mediaRef.current;
      if (video && media && video.parentElement !== media) {
        video.style.position = 'absolute';
        video.style.inset = '0';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.opacity = '1';
        video.style.visibility = 'visible';
        video.style.zIndex = '2';
        media.appendChild(video);
      }
    };

    const applyQuad = (corners: Parameters<typeof quadToCssMatrix3d>[2]) => {
      if (!stage) return false;
      const matrix = quadToCssMatrix3d(srcSize, srcSize, corners);
      if (!matrix) return false;
      stage.style.position = 'fixed';
      stage.style.left = '0px';
      stage.style.top = '0px';
      stage.style.width = `${srcSize}px`;
      stage.style.height = `${srcSize}px`;
      stage.style.transformOrigin = '0 0';
      stage.style.transform = matrix;
      stage.style.opacity = '1';
      stage.style.visibility = 'visible';
      stage.style.zIndex = '10080';
      stage.style.background = ios ? 'transparent' : '#000';
      stage.style.pointerEvents = 'none';
      return true;
    };

    const layoutOverlay = () => {
      const box = getOverlayAabbViewport(host, entity, aspectRatio, frame);
      if (box && isUsableOverlayBox(box, host)) {
        applyBox(box);
        return box;
      }
      if (lastBox && isUsableOverlayBox(lastBox, host)) {
        applyBox(lastBox);
        return lastBox;
      }
      const quad = getOverlayQuadScreenCorners(host, entity, aspectRatio, frame);
      if (quad?.visible && applyQuad(quad.corners)) {
        const xs = quad.corners.map((corner) => corner.x);
        const ys = quad.corners.map((corner) => corner.y);
        const quadBox = {
          left: Math.min(...xs),
          top: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
        lastBox = quadBox;
        return quadBox;
      }
      return null;
    };

    const tryAttachPlane = () => {
      if (ios || cancelled || planeAttached) return false;
      const video = videoRef.current;
      if (!video || video.videoWidth < 2 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return false;
      }
      const result = attachOverlayVideoPlane(entity, video, frame, aspectRatio);
      if (!result.ok) return false;
      planeAttached = true;
      setOverlayVideoPlaneVisible(entity, true);
      dumpArOverlayDebug({
        host,
        entity,
        video,
        frame,
        aspectRatio,
        attached: true,
        reason: 'crop-plane',
      });
      viewerLog('info', 'mapped video placed in studio crop', {
        ios,
        ready: video.readyState,
        paused: video.paused,
        size: `${video.videoWidth}x${video.videoHeight}`,
        reason: result.reason,
        frame,
      });
      return true;
    };

    const paintIosBlit = () => {
      const video = videoRef.current;
      if (!ios || !blitCanvas || !blitCtx || !video) return;
      if (video.videoWidth < 2 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (blitCanvas.width !== video.videoWidth) blitCanvas.width = video.videoWidth;
      if (blitCanvas.height !== video.videoHeight) blitCanvas.height = video.videoHeight;
      blitCtx.drawImage(video, 0, 0, blitCanvas.width, blitCanvas.height);
    };

    const tick = () => {
      if (cancelled) return;
      keepMindArCameraPlaying(host);
      hideIosTrackingCanvas(host);
      if (videoRef.current?.parentElement !== host) parkDecoder();
      const placed = layoutOverlay();
      tryAttachPlane();
      paintIosBlit();
      if (placed && missFrames >= 0) {
        missFrames = -1;
        viewerLog('info', 'mapped video on crop rectangle', {
          ios,
          size: `${videoRef.current?.videoWidth ?? 0}x${videoRef.current?.videoHeight ?? 0}`,
          rect: {
            w: Math.round(placed.width),
            h: Math.round(placed.height),
            top: Math.round(placed.top),
            left: Math.round(placed.left),
          },
          target: getTargetScreenBounds(host, entity, aspectRatio),
          frame,
        });
      }
      if (!placed && missFrames >= 0) {
        missFrames += 1;
        if (missFrames === 1 || missFrames % 45 === 0) {
          const video = videoRef.current;
          viewerLog('warn', 'crop overlay waiting', {
            misses: missFrames,
            size: `${video?.videoWidth ?? 0}x${video?.videoHeight ?? 0}`,
            ready: video?.readyState,
            plane: planeAttached,
            target: getTargetScreenBounds(host, entity, aspectRatio),
            box: getOverlayAabbViewport(host, entity, aspectRatio, frame),
            ...describeOverlayLayout(host, entity),
          });
        }
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      blitCanvas?.remove();
      detachOverlayVideoPlane(entity);
      keepMindArCameraPlaying(host);
    };
  }, [active, mode, host, targetEntity, aspectRatio]);

  useEffect(() => {
    if (mode !== 'fullscreen' || !stageRef.current) return;
    stageRef.current.style.left = '';
    stageRef.current.style.top = '';
    stageRef.current.style.width = '';
    stageRef.current.style.height = '';
    stageRef.current.style.transform = '';
    stageRef.current.style.opacity = '1';
    stageRef.current.style.visibility = '';
  }, [mode]);

  const enableSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return false;
    video.muted = false;
    video.volume = 1;
    setSoundOn(true);
    soundOnRef.current = true;
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
      if (!video) return false;

      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      video.autoplay = true;

      // iOS blocks unmuted autoplay. Start muted so the picture runs, then unmute.
      video.muted = true;
      try {
        await video.play();
      } catch {
        setNeedsTap(true);
        return video.videoWidth > 0 && !video.paused;
      }

      if (host) keepMindArCameraPlaying(host);

      if (withSound) {
        video.muted = false;
        video.volume = 1;
        if (video.paused) {
          try {
            await video.play();
          } catch {
            video.muted = true;
            await video.play().catch(() => undefined);
          }
        }
      }

      if (video.paused) {
        setNeedsTap(true);
        return false;
      }

      if (video.muted) {
        setSoundOn(false);
        soundOnRef.current = false;
      } else {
        setSoundOn(true);
        soundOnRef.current = true;
      }
      setNeedsTap(false);
      setIsPlaying(true);
      notifyPlay();
      return true;
    },
    [notifyPlay, host],
  );

  const loadAndPlay = useCallback(
    async (sources: string[]) => {
      const video = videoRef.current;
      if (!video || !sources.length) throw new Error('No video source');

      video.removeAttribute('crossorigin');
      video.crossOrigin = null;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      video.preload = 'auto';
      video.controls = false;
      video.volume = 1;
      video.muted = !soundOnRef.current;
      let lastError: unknown;
      const uniqueSources = [...new Set(sources)];
      viewerLog('info', 'video load start', { sources: uniqueSources.length });

      for (const source of uniqueSources) {
        try {
          const blobUrl = (await awaitSameOriginVideoUrl(source)) ?? getPrefetchedBlobUrl(source);
          const resolved =
            blobUrl ?? (await resolvePlayableVideoUrl(source, { allowBlob: true })) ?? source;
          const src = resolved;
          if (!src.startsWith('blob:')) {
            video.crossOrigin = 'anonymous';
            video.setAttribute('crossorigin', 'anonymous');
          }
          setPlaybackUrl(src.startsWith('blob:') ? source : src);
          viewerLog('debug', 'video trying source', {
            blob: src.startsWith('blob:'),
            ios: isIOS(),
            src: src.slice(0, 120),
          });
          video.src = src;
          video.load();
          await waitForVideoReady(video);
          const played = await tryPlay(true);
          if (played || (video.videoWidth > 0 && !video.paused)) {
            if (!played) notifyPlay();
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
          if (video.videoWidth > 0 && !video.paused) {
            viewerLog('warn', 'video error ignored — clip already playing', {
              message: error instanceof Error ? error.message : String(error),
            });
            notifyPlay();
            return;
          }
          lastError = error;
          viewerLog('warn', 'video source failed', {
            message: error instanceof Error ? error.message : String(error),
            src: source.slice(0, 96),
          });
        }
      }

      throw lastError ?? new Error('Video did not start');
    },
    [tryPlay, notifyPlay],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      hasNotifiedPlayRef.current = false;
      setNeedsTap(false);
      setLoading(false);
      setIsPlaying(false);
      setSoundOn(true);
      soundOnRef.current = true;
      setPlaybackUrl(null);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.removeAttribute('id');
      video.parentNode?.removeChild(video);
      if (host) {
        keepMindArCameraPlaying(host);
        restartMindArTracking(host);
      }
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
        const video = videoRef.current;
        if (cancelled) return;
        if (video && video.videoWidth > 0) {
          viewerLog('warn', 'video start needed a tap; clip already has frames');
          setNeedsTap(true);
          return;
        }
        onErrorRef.current?.('Could not play the mapped video. Tap Try again or open the link.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, primaryUrl, fallbackUrl, preferDirectUrl, loadAndPlay, host]);

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
      void tryPlay(true);
      return;
    }
    video.pause();
    setIsPlaying(false);
  }, [tryPlay]);

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (soundOn) {
      video.muted = true;
      setSoundOn(false);
      soundOnRef.current = false;
      return;
    }
    enableSound();
    if (video.paused) void video.play().catch(() => undefined);
  }, [soundOn, enableSound]);

  const handleToggleFullscreen = useCallback(() => {
    onModeChange(mode === 'fullscreen' ? 'frame' : 'fullscreen');
  }, [mode, onModeChange]);

  const handleOpenVideo = useCallback(() => {
    if (!playbackUrl) return;
    window.open(playbackUrl, '_blank', 'noopener,noreferrer');
  }, [playbackUrl]);

  if (!active || typeof document === 'undefined') return null;

  const showFullscreen = mode === 'fullscreen';

  const controls = (
    <div
      className="ar-video-controls"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 2147483000,
        pointerEvents: 'auto',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="ar-video-ctrl"
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
      {videoCount > 1 && onCycleVideo ? (
        <button
          type="button"
          className="ar-video-ctrl"
          aria-label="Next mapped video"
          onClick={() => onCycleVideo(1)}
        >
          <span className="ar-video-ctrl__icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8 5.2v13.6c0 .9 1 1.4 1.7.9l10-6.8c.7-.5.7-1.4 0-1.8l-10-6.8C9 3.8 8 4.3 8 5.2z" />
            </svg>
          </span>
          <span className="ar-video-ctrl__label">
            {videoIndex + 1}/{videoCount}
          </span>
        </button>
      ) : null}
      {playbackUrl ? (
        <button
          type="button"
          className="ar-video-ctrl"
          aria-label="Open video"
          onClick={handleOpenVideo}
        >
          <span className="ar-video-ctrl__icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" />
            </svg>
          </span>
          <span className="ar-video-ctrl__label">Open</span>
        </button>
      ) : null}
      {onClose ? (
        <button type="button" className="ar-video-ctrl" aria-label="Close video" onClick={onClose}>
          <span className="ar-video-ctrl__icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5z" />
            </svg>
          </span>
          <span className="ar-video-ctrl__label">Done</span>
        </button>
      ) : null}
    </div>
  );

  return createPortal(
    <>
      <div
        className={`ar-video-shell${showFullscreen ? ' ar-video-shell--fullscreen' : ' ar-video-shell--tracked'}${reveal ? ' ar-video-shell--revealed' : ''}${loading && active ? ' ar-video-shell--loading' : ''}`}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10050,
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
                  overflow: 'hidden',
                  background: 'transparent',
                  pointerEvents: 'none',
                  zIndex: 10080,
                  transformOrigin: '0 0',
                }
          }
        >
          {showFullscreen ? null : <div className="ar-video-frame-edge" aria-hidden />}
          <div className="ar-video-media" ref={mediaRef}>
            {needsTap ? (
              <button
                type="button"
                className="ar-video-tap-play"
                onClick={() => void tryPlay(true)}
              >
                Tap to play
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {controls}
    </>,
    document.body,
  );
};
