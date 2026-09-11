import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { clampOverlayFrame, type OverlayFrame } from '../utils/overlay-frame';
import {
  getPlaybackVideoElement,
  stopPlaybackVideoImmediately,
  unlockPlaybackAudio,
  setPlaybackMuted,
} from '../utils/camera-permission';
import { clearVideoResumePosition } from '../utils/playback-resume';
import {
  ensureTransparentRenderer,
  hideIosTrackingCanvas,
  keepMindArCameraPlaying,
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
  syncMindArCameraToHost,
  isUsableOverlayBox,
  quadToCssMatrix3d,
} from '../utils/target-projection';
import {
  awaitSameOriginVideoUrl,
  getPrefetchedBlobUrl,
  boostVideoBlobPriority,
  ensureVideoBlobForPlayback,
  getPrimedVideoBlobUrl,
  isPlaybackElementPrimed,
  isVideoDecoderPrimed,
  prefetchVideo,
  primeVideoDecoder,
  shouldStreamVideoProgressively,
} from '../utils/video-prefetch';
import { dumpArOverlayDebug } from '../utils/ar-overlay-debug';
import { logViewerDiagnostics } from '../utils/viewer-debug-diagnostics';
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
  /** Stable id for resume (usually videoMediaId). */
  playbackKey?: string | null;
  /** Soft-resume playhead after the same clip was briefly lost. */
  resumeAtSeconds?: number | null;
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
  /** When false, mute/download are owned by parent chrome. */
  showInlineControls?: boolean;
  soundOn?: boolean;
  onSoundOnChange?: (soundOn: boolean) => void;
  onDownloadReady?: (download: (() => void) | null) => void;
  onClose?: () => void;
  /** Fade in chrome once the clip is playing on the photo. */
  reveal?: boolean;
}

const LOAD_TIMEOUT_MS = 12_000;
const PRIMED_LOAD_TIMEOUT_MS = 1_200;
const BLOB_WAIT_MS = 20_000;
const LARGE_BLOB_WAIT_MS = 60_000;
const IOS_LOAD_TIMEOUT_MS = 20_000;
const PROGRESSIVE_LOAD_TIMEOUT_MS = 25_000;
const PLAY_READY_FALLBACK_MS = 900;

const isIOS = () => typeof navigator !== 'undefined' && /iP(hone|od|ad)/.test(navigator.userAgent);

const formatClock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const hideNativeVideoControls = (video: HTMLVideoElement) => {
  video.controls = false;
  video.removeAttribute('controls');
  video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
  video.disablePictureInPicture = true;
  video.setAttribute('disablepictureinpicture', '');
};

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

const waitForVideoReady = (video: HTMLVideoElement, timeoutMs = LOAD_TIMEOUT_MS): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Video load timed out (${timeoutMs}ms, ready=${video.readyState}, size=${video.videoWidth}x${video.videoHeight}, code=${video.error?.code ?? 'none'})`,
        ),
      );
    }, timeoutMs);

    const checkReady = () => {
      if (video.videoWidth > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        cleanup();
        resolve();
        return;
      }
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration)) {
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
  overlayFrame,
  primaryUrl,
  fallbackUrl,
  active,
  mode,
  playbackKey = null,
  resumeAtSeconds = null,
  videoCount: _videoCount = 1,
  videoIndex: _videoIndex = 0,
  onCycleVideo: _onCycleVideo,
  title,
  preferDirectUrl = true,
  onModeChange,
  onPlay,
  onError,
  onEnded,
  onClose: _onClose,
  reveal = false,
  showInlineControls: _showInlineControls = true,
  soundOn: soundOnProp,
  onSoundOnChange,
  onDownloadReady,
}: TargetFrameVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const onPlayRef = useRef(onPlay);
  const onErrorRef = useRef(onError);
  const onEndedRef = useRef(onEnded);
  const hasNotifiedPlayRef = useRef(false);
  const overlayPlacedRef = useRef(false);
  const resumeAtRef = useRef(resumeAtSeconds);
  const playbackKeyRef = useRef(playbackKey);
  const resumeAppliedRef = useRef(false);
  const seekingRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(soundOnProp ?? true);
  const soundOnRef = useRef(soundOnProp ?? true);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastTapAtRef = useRef(0);
  const prevPrimaryUrlRef = useRef<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  resumeAtRef.current = resumeAtSeconds;
  playbackKeyRef.current = playbackKey;

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onError, onEnded]);

  const applyResumeSeek = useCallback((video: HTMLVideoElement) => {
    if (resumeAppliedRef.current) return;
    const resumeAt = resumeAtRef.current;
    resumeAppliedRef.current = true;
    const key = playbackKeyRef.current;
    if (key) clearVideoResumePosition(key);
    if (resumeAt == null || !Number.isFinite(resumeAt) || resumeAt < 0.35) {
      video.currentTime = 0;
      return;
    }
    const max =
      Number.isFinite(video.duration) && video.duration > 0
        ? Math.max(0, video.duration - 0.05)
        : resumeAt;
    video.currentTime = Math.min(resumeAt, max);
  }, []);

  const notifyPlay = useCallback(() => {
    if (hasNotifiedPlayRef.current) return;
    hasNotifiedPlayRef.current = true;
    setIsPlaying(true);
    onPlayRef.current?.();
  }, []);

  const tryNotifyPlaybackReady = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasNotifiedPlayRef.current) return;
    if (video.videoWidth < 2 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.paused) return;
    // Overlay placement can lag on some targets — once frames are decoding, treat as ready
    // so chrome / status do not stay stuck while the plane catches up.
    if (!overlayPlacedRef.current && modeRef.current !== 'fullscreen') {
      return;
    }
    notifyPlay();
  }, [notifyPlay]);

  const markOverlayReady = useCallback(() => {
    overlayPlacedRef.current = true;
    tryNotifyPlaybackReady();
  }, [tryNotifyPlaybackReady]);

  useLayoutEffect(() => {
    if (!active) {
      prevPrimaryUrlRef.current = null;
      return undefined;
    }
    if (prevPrimaryUrlRef.current && prevPrimaryUrlRef.current !== primaryUrl) {
      stopPlaybackVideoImmediately();
    }
    prevPrimaryUrlRef.current = primaryUrl;
    return undefined;
  }, [primaryUrl, active]);

  useLayoutEffect(() => {
    if (!active) return undefined;
    const video = getPlaybackVideoElement();
    videoRef.current = video;

    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;
    video.controls = false;
    hideNativeVideoControls(video);
    video.autoplay = true;
    if (isIOS()) {
      video.removeAttribute('crossorigin');
      video.crossOrigin = null;
    } else {
      video.crossOrigin = 'anonymous';
      video.setAttribute('crossorigin', 'anonymous');
    }

    const onEnded = () => {
      if (modeRef.current === 'fullscreen') onEndedRef.current?.();
    };
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('ended', onEnded);
      // Soft teardown only — never wipe src here (mode switches reuse the same element).
      video.pause();
      if (host && video.parentElement === host) {
        host.removeChild(video);
      } else if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      video.removeAttribute('id');
      if (host) keepMindArCameraPlaying(host);
    };
  }, [active, host]);

  useLayoutEffect(() => {
    if (!active) return undefined;
    const video = videoRef.current ?? getPlaybackVideoElement();
    videoRef.current = video;
    const htmlCamera = Boolean(host?.classList.contains('ar-scene-host--html-camera'));
    const keepPlaying = !video.paused;
    const resume = () => {
      if (keepPlaying) void video.play().catch(() => undefined);
    };

    const mountToMedia = (objectFit: 'contain' | 'fill') => {
      const parent = mediaRef.current;
      if (!parent) return false;
      video.id = 'sp-mapped-video';
      video.style.position = 'absolute';
      video.style.inset = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.display = 'block';
      video.style.objectFit = objectFit;
      video.style.background = htmlCamera && mode === 'frame' ? 'transparent' : '#000';
      video.style.opacity = '1';
      video.style.visibility = 'visible';
      video.style.zIndex = '2';
      video.style.pointerEvents = 'none';
      video.style.transform = 'none';
      if (video.parentElement !== parent) {
        parent.appendChild(video);
      }
      return true;
    };

    if (mode === 'fullscreen') {
      const stage = stageRef.current;
      if (stage) {
        stage.style.position = 'relative';
        stage.style.left = '0';
        stage.style.top = '0';
        stage.style.width = '100%';
        stage.style.height = '100%';
        stage.style.transform = 'none';
        stage.style.opacity = '1';
        stage.style.visibility = 'visible';
        stage.style.pointerEvents = 'auto';
        stage.style.background = '#000';
      }
      let cancelled = false;
      let retryFrame = 0;
      const ensureMounted = () => {
        if (cancelled) return;
        if (mountToMedia('contain')) {
          if (keepPlaying) void video.play().catch(() => undefined);
          return;
        }
        retryFrame = window.requestAnimationFrame(ensureMounted);
      };
      ensureMounted();
      return () => {
        cancelled = true;
        if (retryFrame) window.cancelAnimationFrame(retryFrame);
      };
    }

    const iosFrame = isIOS();
    const useIosDecoderPark = iosFrame && host && !htmlCamera;

    if (useIosDecoderPark) {
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
      if (host && video.parentElement !== host) {
        host.insertBefore(video, host.firstChild);
      }
      resume();
      // Do not clear src on cleanup — fullscreen reuses this element.
      return undefined;
    }

    let cancelled = false;
    let retryFrame = 0;
    const ensureMounted = () => {
      if (cancelled) return;
      if (mountToMedia('fill')) {
        resume();
        return;
      }
      retryFrame = window.requestAnimationFrame(ensureMounted);
    };
    ensureMounted();
    return () => {
      cancelled = true;
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
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

    const htmlCamera = host.classList.contains('ar-scene-host--html-camera');
    const useIosBlit = ios && !htmlCamera;

    const frame = clampOverlayFrame(overlayFrame);
    installPoseCapture(entity);
    ensureTransparentRenderer(host);
    hideIosTrackingCanvas(host);
    syncMindArCameraToHost(host);

    if (stage) {
      stage.style.opacity = '0';
      stage.style.visibility = 'hidden';
      stage.style.pointerEvents = 'none';
    }

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
    if (ios && useIosBlit) {
      parkDecoder();
      if (stage) {
        stage.style.opacity = '0';
        stage.style.visibility = 'hidden';
        stage.style.width = '0px';
        stage.style.height = '0px';
      }
    }

    let cancelled = false;
    let missFrames = 0;
    let planeAttached = false;
    let lastBox: { left: number; top: number; width: number; height: number } | null = null;
    let smoothBox: { left: number; top: number; width: number; height: number } | null = null;
    const srcSize = 400;
    const SMOOTH = 0.42;

    let blitCanvas: HTMLCanvasElement | null = null;
    let blitCtx: CanvasRenderingContext2D | null = null;
    if (ios && useIosBlit && stage) {
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

    const blendBox = (box: { left: number; top: number; width: number; height: number }) => {
      if (!smoothBox) {
        smoothBox = { ...box };
        return smoothBox;
      }
      smoothBox = {
        left: smoothBox.left + (box.left - smoothBox.left) * SMOOTH,
        top: smoothBox.top + (box.top - smoothBox.top) * SMOOTH,
        width: smoothBox.width + (box.width - smoothBox.width) * SMOOTH,
        height: smoothBox.height + (box.height - smoothBox.height) * SMOOTH,
      };
      return smoothBox;
    };

    const mountVideoInStage = () => {
      if (ios && useIosBlit) return;
      const video = videoRef.current;
      const media = mediaRef.current;
      if (!video || !media) return;
      video.style.position = 'absolute';
      video.style.inset = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.opacity = '1';
      video.style.visibility = 'visible';
      video.style.zIndex = '2';
      video.style.objectFit = 'fill';
      video.style.background = 'transparent';
      video.style.transform = 'none';
      if (video.parentElement !== media) {
        media.appendChild(video);
      }
    };

    const applyBox = (box: { left: number; top: number; width: number; height: number }) => {
      if (!stage) return;
      const next = blendBox(box);
      lastBox = box;
      stage.style.position = 'fixed';
      stage.style.left = `${next.left}px`;
      stage.style.top = `${next.top}px`;
      stage.style.width = `${next.width}px`;
      stage.style.height = `${next.height}px`;
      stage.style.transform = 'none';
      stage.style.transformOrigin = '0 0';
      stage.style.opacity = '0';
      stage.style.visibility = 'hidden';
      stage.style.zIndex = '10080';
      stage.style.background = 'transparent';
      // pointer-events owned by setStageVisible — do not reset every frame or taps die.

      mountVideoInStage();
    };

    const setStageVisible = (visible: boolean) => {
      if (!stage) return;
      stage.style.opacity = visible ? '1' : '0';
      stage.style.visibility = visible ? 'visible' : 'hidden';
      stage.style.pointerEvents = visible ? 'auto' : 'none';
    };

    const applyQuad = (corners: Parameters<typeof quadToCssMatrix3d>[2]) => {
      if (!stage) return false;
      const matrix = quadToCssMatrix3d(srcSize, srcSize, corners);
      if (!matrix) return false;
      // Perspective quads already track the photo; skip AABB smoothing here.
      smoothBox = null;
      stage.style.position = 'fixed';
      stage.style.left = '0px';
      stage.style.top = '0px';
      stage.style.width = `${srcSize}px`;
      stage.style.height = `${srcSize}px`;
      stage.style.transformOrigin = '0 0';
      stage.style.transform = matrix;
      stage.style.opacity = '0';
      stage.style.visibility = 'hidden';
      stage.style.zIndex = '10080';
      stage.style.background = 'transparent';

      mountVideoInStage();
      return true;
    };

    const layoutOverlay = () => {
      syncMindArCameraToHost(host);

      const tryAabb = () => {
        const box = getOverlayAabbViewport(host, entity, aspectRatio, frame);
        if (!box) return null;
        applyBox(box);
        return box;
      };

      const tryFullTargetFallback = () => {
        if (missFrames < 6) return null;
        const box = getOverlayAabbViewport(host, entity, aspectRatio, {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        });
        if (!box || box.width < 24 || box.height < 24) return null;
        applyBox(box);
        return box;
      };

      // Full-viewport HTML camera: axis-aligned box is more reliable on mobile Safari.
      if (htmlCamera) {
        const aligned = tryAabb();
        if (aligned) return aligned;
      }

      // Prefer perspective quad using the studio crop frame for correct placement.
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
      const box = tryAabb();
      if (box) return box;
      const fallback = tryFullTargetFallback();
      if (fallback) return fallback;
      if (lastBox && isUsableOverlayBox(lastBox, host)) {
        applyBox(lastBox);
        return lastBox;
      }
      return null;
    };

    const tryAttachPlane = () => {
      if (ios || htmlCamera || cancelled || planeAttached) return false;
      const video = videoRef.current;
      if (!video || video.videoWidth < 2 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return false;
      }
      const result = attachOverlayVideoPlane(entity, video, frame, aspectRatio);
      if (!result.ok) return false;
      planeAttached = true;
      setOverlayVideoPlaneVisible(entity, true);
      markOverlayReady();
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
      if (!useIosBlit || !blitCanvas || !blitCtx) return;
      const video = videoRef.current;
      if (!video || video.videoWidth < 2 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }
      if (blitCanvas.width !== video.videoWidth) blitCanvas.width = video.videoWidth;
      if (blitCanvas.height !== video.videoHeight) blitCanvas.height = video.videoHeight;
      blitCtx.drawImage(video, 0, 0, blitCanvas.width, blitCanvas.height);
    };

    const tick = () => {
      if (cancelled) return;
      keepMindArCameraPlaying(host);
      hideIosTrackingCanvas(host);
      if (useIosBlit && videoRef.current?.parentElement !== host) parkDecoder();
      const placed = layoutOverlay();
      tryAttachPlane();
      paintIosBlit();
      const video = videoRef.current;
      const hasPicture = Boolean(
        video &&
        video.videoWidth > 0 &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        !video.paused,
      );
      if (placed && hasPicture) {
        setStageVisible(true);
      } else if (placed) {
        setStageVisible(false);
      }
      if (planeAttached && hasPicture) {
        markOverlayReady();
      }
      if (placed && hasPicture && missFrames >= 0) {
        missFrames = -1;
        markOverlayReady();
        viewerLog('info', 'mapped video on crop rectangle', {
          ios,
          size: `${video?.videoWidth ?? 0}x${video?.videoHeight ?? 0}`,
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
      overlayPlacedRef.current = false;
      blitCanvas?.remove();
      detachOverlayVideoPlane(entity);
      keepMindArCameraPlaying(host);
    };
  }, [active, mode, host, targetEntity, aspectRatio, overlayFrame, markOverlayReady]);

  useEffect(() => {
    if (mode !== 'fullscreen' || !stageRef.current) return;
    const stage = stageRef.current;
    stage.style.left = '0';
    stage.style.top = '0';
    stage.style.width = '100%';
    stage.style.height = '100%';
    stage.style.transform = 'none';
    stage.style.opacity = '1';
    stage.style.visibility = 'visible';
    stage.style.pointerEvents = 'auto';
    // Keep the already-decoded frame on screen while layout settles.
    const video = videoRef.current;
    if (video && video.paused) void video.play().catch(() => undefined);
  }, [mode]);

  const tryPlay = useCallback(
    async (withSound = true) => {
      const video = videoRef.current;
      if (!video) return false;

      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      video.autoplay = true;
      video.volume = 1;

      // Prefer sound on by default. If the browser blocks unmuted autoplay, fall back muted.
      const attempt = async (muted: boolean) => {
        video.muted = muted;
        await video.play();
      };

      try {
        await attempt(!withSound);
      } catch {
        if (withSound) {
          try {
            await attempt(true);
          } catch {
            setNeedsTap(true);
            return video.videoWidth > 0 && !video.paused;
          }
        } else {
          setNeedsTap(true);
          return video.videoWidth > 0 && !video.paused;
        }
      }

      if (host) keepMindArCameraPlaying(host);

      if (withSound && video.muted) {
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
        onSoundOnChange?.(false);
      } else {
        setSoundOn(true);
        soundOnRef.current = true;
        onSoundOnChange?.(true);
      }
      setNeedsTap(false);
      setIsPlaying(true);
      // Fullscreen does not need crop placement; frame mode gets a short fallback if pose lags.
      if (modeRef.current === 'fullscreen') {
        markOverlayReady();
      } else {
        tryNotifyPlaybackReady();
        window.setTimeout(() => {
          const playing = videoRef.current;
          if (!playing || hasNotifiedPlayRef.current || playing.paused) return;
          if (playing.videoWidth < 2) return;
          markOverlayReady();
        }, PLAY_READY_FALLBACK_MS);
      }
      return true;
    },
    [tryNotifyPlaybackReady, markOverlayReady, host, onSoundOnChange],
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
      hideNativeVideoControls(video);
      video.volume = 1;
      // Default to sound on; fall back muted only if autoplay blocks it in tryPlay.
      const preferSound = soundOnRef.current !== false;
      video.muted = !preferSound;
      setSoundOn(preferSound);
      let lastError: unknown;
      const uniqueSources = [...new Set(sources)];
      const iosHtmlCamera =
        isIOS() && Boolean(host?.classList.contains('ar-scene-host--html-camera'));
      const loadTimeout = iosHtmlCamera ? IOS_LOAD_TIMEOUT_MS : LOAD_TIMEOUT_MS;
      viewerLog('info', 'video load start', {
        sources: uniqueSources.length,
        iosHtmlCamera,
        loadTimeout,
      });

      const applyVideoSrc = (src: string, originalSource: string) => {
        if (src.startsWith('blob:') || iosHtmlCamera) {
          video.removeAttribute('crossorigin');
          video.crossOrigin = null;
        } else {
          video.crossOrigin = 'anonymous';
          video.setAttribute('crossorigin', 'anonymous');
        }
        setPlaybackUrl(src.startsWith('blob:') ? originalSource : src);
        if (
          video.src === src &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0
        ) {
          return;
        }
        video.src = src;
        video.load();
      };

      const tryResolvedSource = async (
        src: string,
        originalSource: string,
        label: string,
        timeoutMs = loadTimeout,
      ) => {
        viewerLog('debug', 'video trying source', {
          label,
          blob: src.startsWith('blob:'),
          ios: isIOS(),
          iosHtmlCamera,
          src: src.slice(0, 120),
        });
        const alreadyReady =
          video.src === src &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0;
        if (!alreadyReady) {
          applyVideoSrc(src, originalSource);
          hideNativeVideoControls(video);
          await waitForVideoReady(video, timeoutMs);
        }
        applyResumeSeek(video);
        const played = await tryPlay(soundOnRef.current);
        if (played || (!video.paused && video.videoWidth > 0)) {
          tryNotifyPlaybackReady();
          window.setTimeout(() => {
            const rect = video.getBoundingClientRect();
            viewerLog('info', 'video play ok', {
              label,
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
        throw new Error('play() rejected');
      };

      for (const source of uniqueSources) {
        try {
          void primeVideoDecoder(source);
          boostVideoBlobPriority(source);
          viewerLog('debug', 'video resolving source', {
            iosHtmlCamera,
            blobReady: Boolean(getPrefetchedBlobUrl(source) ?? getPrimedVideoBlobUrl(source)),
            primed: isVideoDecoderPrimed(source),
            playbackPrimed: isPlaybackElementPrimed(source),
            src: source.slice(0, 120),
          });

          if (isPlaybackElementPrimed(source)) {
            setPlaybackUrl(source);
            hideNativeVideoControls(video);
            applyResumeSeek(video);
            const played = await tryPlay(soundOnRef.current);
            if (played || (!video.paused && video.videoWidth > 0)) {
              tryNotifyPlaybackReady();
              viewerLog('info', 'video play ok', {
                label: 'playback-primed-instant',
                width: video.videoWidth,
                height: video.videoHeight,
                paused: video.paused,
              });
              return;
            }
          }

          prefetchVideo(source);

          // Large clips (> previous 25MB cache) must stream — don't block waiting on a full blob.
          if (shouldStreamVideoProgressively(source)) {
            await tryResolvedSource(
              source,
              source,
              'progressive-direct',
              PROGRESSIVE_LOAD_TIMEOUT_MS,
            );
            return;
          }

          const cachedBlob = getPrimedVideoBlobUrl(source) ?? getPrefetchedBlobUrl(source) ?? null;
          const blobWaitMs = iosHtmlCamera ? LARGE_BLOB_WAIT_MS : BLOB_WAIT_MS;
          const blobUrl = cachedBlob ?? (await ensureVideoBlobForPlayback(source, blobWaitMs));

          if (shouldStreamVideoProgressively(source)) {
            await tryResolvedSource(
              source,
              source,
              'progressive-direct',
              PROGRESSIVE_LOAD_TIMEOUT_MS,
            );
            return;
          }

          if (blobUrl) {
            await tryResolvedSource(
              blobUrl,
              source,
              isVideoDecoderPrimed(source) || isPlaybackElementPrimed(source)
                ? 'primed-blob'
                : 'blob',
              isVideoDecoderPrimed(source) || isPlaybackElementPrimed(source)
                ? PRIMED_LOAD_TIMEOUT_MS
                : Math.max(loadTimeout, PROGRESSIVE_LOAD_TIMEOUT_MS),
            );
            return;
          }

          // Blob not ready (slow network / large file) — stream the URL directly.
          viewerLog('info', 'blob unavailable — streaming progressive URL', {
            iosHtmlCamera,
            src: source.slice(0, 120),
          });
          await tryResolvedSource(
            source,
            source,
            'progressive-direct',
            PROGRESSIVE_LOAD_TIMEOUT_MS,
          );
          return;
        } catch (error) {
          if (video.videoWidth > 0 && !video.paused) {
            viewerLog('warn', 'video error ignored — clip already playing', {
              message: error instanceof Error ? error.message : String(error),
            });
            tryNotifyPlaybackReady();
            return;
          }
          lastError = error;
          viewerLog('warn', 'video source failed', {
            message: error instanceof Error ? error.message : String(error),
            code: video.error?.code ?? null,
            src: source.slice(0, 96),
          });

          try {
            await tryResolvedSource(
              source,
              source,
              'progressive-fallback',
              PROGRESSIVE_LOAD_TIMEOUT_MS,
            );
            return;
          } catch (directError) {
            lastError = directError;
          }

          const fallbackBlob = await awaitSameOriginVideoUrl(source, LARGE_BLOB_WAIT_MS);
          if (fallbackBlob) {
            try {
              await tryResolvedSource(
                fallbackBlob,
                source,
                'blob-fallback',
                PROGRESSIVE_LOAD_TIMEOUT_MS,
              );
              return;
            } catch (blobError) {
              lastError = blobError;
            }
          }
        }
      }

      throw lastError ?? new Error('Video did not start');
    },
    [tryPlay, tryNotifyPlaybackReady, host, applyResumeSeek],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      hasNotifiedPlayRef.current = false;
      overlayPlacedRef.current = false;
      resumeAppliedRef.current = false;
      setNeedsTap(false);
      setLoading(false);
      setIsPlaying(false);
      setPlaybackUrl(null);
      setCurrentTime(0);
      setDuration(0);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.removeAttribute('id');
      video.parentNode?.removeChild(video);
      if (host) {
        keepMindArCameraPlaying(host);
        // Parent (ARViewer) owns MindAR restart — avoid double-restart thrash here.
      }
      return;
    }

    viewerLog('info', 'TargetFrameVideo active', {
      title,
      primaryUrl: primaryUrl?.slice(0, 120) ?? null,
      fallbackUrl: fallbackUrl?.slice(0, 120) ?? null,
      mode,
      hasHost: Boolean(host),
      hasEntity: Boolean(targetEntity),
      overlayFrame,
      resumeAtSeconds,
    });
    logViewerDiagnostics(
      'TargetFrameVideo active',
      host,
      {
        title,
        mode,
        primaryUrl: primaryUrl?.slice(0, 120) ?? null,
        fallbackUrl: fallbackUrl?.slice(0, 120) ?? null,
        overlayFrame,
        resumeAtSeconds,
      },
      'info',
    );

    let cancelled = false;
    setLoading(true);
    setNeedsTap(false);
    hasNotifiedPlayRef.current = false;
    resumeAppliedRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const sources = buildSourceList(primaryUrl, fallbackUrl, preferDirectUrl);
    viewerLog('info', 'TargetFrameVideo sources', {
      sources: sources.map((src) => src.slice(0, 120)),
    });

    void loadAndPlay(sources)
      .catch(async (error) => {
        if (cancelled) return;
        viewerLog('warn', 'TargetFrameVideo loadAndPlay first attempt failed — retrying', {
          message: error instanceof Error ? error.message : String(error),
        });
        try {
          await loadAndPlay(sources);
        } catch (retryError) {
          if (cancelled) return;
          viewerLog('error', 'TargetFrameVideo loadAndPlay failed', {
            message: retryError instanceof Error ? retryError.message : String(retryError),
          });
          onErrorRef.current?.(
            'Video did not start. Hold the photo steady in the frame and try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, primaryUrl, fallbackUrl, preferDirectUrl, loadAndPlay, host, resumeAtSeconds]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = mode === 'frame';
    hideNativeVideoControls(video);
  }, [mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    const onPlayEvt = () => setIsPlaying(true);
    const onPauseEvt = () => setIsPlaying(false);
    const onTime = () => {
      if (seekingRef.current) return;
      setCurrentTime(video.currentTime);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };
    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };
    video.addEventListener('play', onPlayEvt);
    video.addEventListener('pause', onPauseEvt);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('durationchange', onMeta);
    onMeta();
    onTime();
    return () => {
      video.removeEventListener('play', onPlayEvt);
      video.removeEventListener('pause', onPauseEvt);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onMeta);
    };
  }, [active, primaryUrl]);

  useEffect(() => {
    if (typeof soundOnProp !== 'boolean') return;
    if (soundOnProp === soundOnRef.current) return;
    soundOnRef.current = soundOnProp;
    setSoundOn(soundOnProp);
    const video = videoRef.current;
    if (!video || !active) return;
    const resumeAt = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const wasPlaying = !video.paused;
    if (soundOnProp) {
      unlockPlaybackAudio();
      video.muted = false;
      video.volume = 1;
    } else {
      video.muted = true;
    }
    if (Number.isFinite(resumeAt) && Math.abs(video.currentTime - resumeAt) > 0.05) {
      video.currentTime = resumeAt;
    }
    if (wasPlaying && video.paused) {
      void video.play().catch(() => undefined);
    }
  }, [soundOnProp, active]);

  const handleToggleFullscreen = useCallback(() => {
    onModeChange(mode === 'fullscreen' ? 'frame' : 'fullscreen');
  }, [mode, onModeChange]);

  const handleTogglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const handleSeekInput = useCallback(
    (value: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(value)) return;
      const max =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : Math.max(value, duration);
      const next = Math.min(Math.max(0, value), max);
      seekingRef.current = true;
      setCurrentTime(next);
      video.currentTime = next;
    },
    [duration],
  );

  const handleSeekCommit = useCallback(() => {
    seekingRef.current = false;
    const video = videoRef.current;
    if (video) setCurrentTime(video.currentTime);
  }, []);

  const handleMuteClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      const video = videoRef.current;
      const resumeAt = video && Number.isFinite(video.currentTime) ? video.currentTime : null;
      const wasPlaying = Boolean(video && !video.paused);
      const next = !soundOnRef.current;
      setPlaybackMuted(!next);
      soundOnRef.current = next;
      setSoundOn(next);
      if (video && resumeAt != null && Math.abs(video.currentTime - resumeAt) > 0.05) {
        video.currentTime = resumeAt;
      }
      if (video && wasPlaying && video.paused) {
        void video.play().catch(() => undefined);
      }
      onSoundOnChange?.(next);
    },
    [onSoundOnChange],
  );

  const handleStageDoubleTap = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      const now = Date.now();
      if (now - lastTapAtRef.current < 450) {
        lastTapAtRef.current = 0;
        handleToggleFullscreen();
        return;
      }
      lastTapAtRef.current = now;
    },
    [handleToggleFullscreen],
  );

  const handleDownload = useCallback(async () => {
    const source = playbackUrl || primaryUrl || fallbackUrl;
    if (!source) return;
    const filename = `${(title || 'story-pix').replace(/[^\w.-]+/g, '_')}.mp4`;
    try {
      const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`download ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
    } catch {
      window.open(source, '_blank', 'noopener,noreferrer');
    }
  }, [playbackUrl, primaryUrl, fallbackUrl, title]);

  useEffect(() => {
    onDownloadReady?.(active ? () => void handleDownload() : null);
    return () => onDownloadReady?.(null);
  }, [active, onDownloadReady, handleDownload]);

  if (!active || typeof document === 'undefined') return null;

  const showFullscreen = mode === 'fullscreen';
  const showPlaybackChrome = Boolean(isPlaying || reveal) && !needsTap;

  const playbackChrome = showPlaybackChrome ? (
    <div
      className="ar-video-playback-chrome"
      style={{
        position: 'fixed',
        top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))',
        right: 'max(12px, env(safe-area-inset-right, 0px))',
        zIndex: 100150,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem',
        borderRadius: 999,
        background: 'rgba(12, 12, 18, 0.82)',
        border: '1.5px solid rgba(233, 58, 138, 0.55)',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={`ar-video-playback-chrome__btn${soundOn ? '' : ' ar-video-playback-chrome__btn--muted'}`}
        aria-label={soundOn ? 'Mute' : 'Unmute'}
        onClick={handleMuteClick}
        style={{
          width: '2.7rem',
          height: '2.7rem',
          border: 'none',
          borderRadius: 999,
          background: soundOn ? 'rgba(255,255,255,0.1)' : 'rgba(233,58,138,0.28)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {soundOn ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
            <path d="M16.5 12a3.5 3.5 0 0 0-1.8-3.05v6.1A3.5 3.5 0 0 0 16.5 12zm2.5 0c0 2.5-1.4 4.67-3.5 5.74v2.06A7.5 7.5 0 0 0 21.5 12 7.5 7.5 0 0 0 15.5 4.2v2.06A5.5 5.5 0 0 1 19 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
            <path d="M16.2 12.7 19 15.5l1.4-1.4-2.8-2.8 2.8-2.8L19 7.1l-2.8 2.8-2.8-2.8-1.4 1.4 2.8 2.8-2.8 2.8 1.4 1.4 2.8-2.8z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={`ar-video-playback-chrome__btn${showFullscreen ? ' ar-video-playback-chrome__btn--active' : ''}`}
        aria-label={showFullscreen ? 'Exit fullscreen' : 'Expand fullscreen'}
        onClick={(event) => {
          event.stopPropagation();
          handleToggleFullscreen();
        }}
        style={{
          width: '2.7rem',
          height: '2.7rem',
          border: 'none',
          borderRadius: 999,
          background: showFullscreen
            ? 'linear-gradient(135deg, rgba(59,79,232,0.55), rgba(233,58,138,0.45))'
            : 'rgba(255,255,255,0.1)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {showFullscreen ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M9 3H3v6h2V5h4V3zm12 0h-6v2h4v4h2V3zM5 15H3v6h6v-2H5v-4zm16 0h-2v4h-4v2h6v-6z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M3 3h7v2H5v5H3V3zm18 0v7h-2V5h-5V3h7zM3 21v-7h2v5h5v2H3zm18 0h-7v-2h5v-5h2v7z" />
          </svg>
        )}
      </button>
    </div>
  ) : null;

  // Full-screen double-tap catcher — below chrome/controls, above video.
  const doubleTapCatcher =
    active && !needsTap && (isPlaying || reveal || showFullscreen) ? (
      <div
        role="presentation"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10085,
          pointerEvents: 'auto',
          background: 'transparent',
          touchAction: 'manipulation',
        }}
        onPointerUp={handleStageDoubleTap}
      />
    ) : null;

  const fullscreenTransport =
    showFullscreen && active && !needsTap ? (
      <div
        className="ar-video-fs-controls"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="ar-video-fs-controls__play"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={handleTogglePlayPause}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>
        <span className="ar-video-fs-controls__time">{formatClock(currentTime)}</span>
        <input
          className="ar-video-fs-controls__seek"
          type="range"
          min={0}
          max={Math.max(duration || 0, currentTime, 0.1)}
          step={0.05}
          value={Math.min(currentTime, Math.max(duration || 0, currentTime))}
          aria-label="Seek"
          style={
            {
              '--seek-pct': `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
            } as CSSProperties
          }
          onChange={(event) => handleSeekInput(Number(event.target.value))}
          onPointerUp={handleSeekCommit}
          onTouchEnd={handleSeekCommit}
          onMouseUp={handleSeekCommit}
          onBlur={handleSeekCommit}
        />
        <span className="ar-video-fs-controls__time">{formatClock(duration)}</span>
      </div>
    ) : null;

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
                  pointerEvents: 'auto',
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
                onClick={(event) => {
                  event.stopPropagation();
                  void tryPlay(true);
                }}
              >
                Tap to play
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {doubleTapCatcher}
      {fullscreenTransport}
      {playbackChrome}
    </>,
    document.body,
  );
};
