import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clampOverlayFrame, type OverlayFrame } from '../utils/overlay-frame';
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
  prefetchVideo,
  resolvePlayableVideoUrl,
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

const LOAD_TIMEOUT_MS = 2_800;
const IOS_LOAD_TIMEOUT_MS = 12_000;
const IOS_BLOB_FALLBACK_TIMEOUT_MS = 18_000;

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
  videoCount: _videoCount = 1,
  videoIndex: _videoIndex = 0,
  onCycleVideo: _onCycleVideo,
  title,
  preferDirectUrl = true,
  onModeChange,
  onPlay,
  onError,
  onEnded,
  onClose,
  reveal = false,
  showInlineControls = true,
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
  const [needsTap, setNeedsTap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(soundOnProp ?? false);
  const soundOnRef = useRef(soundOnProp ?? false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const lastTapAtRef = useRef(0);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onError, onEnded]);

  useLayoutEffect(() => {
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
    const htmlCamera = Boolean(host?.classList.contains('ar-scene-host--html-camera'));
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

    const mountToMedia = () => {
      const parent = mediaRef.current;
      if (!parent) return false;
      video.style.position = 'absolute';
      video.style.inset = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.display = 'block';
      video.style.objectFit = mode === 'fullscreen' ? 'contain' : 'fill';
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

    const onEndedEvt = () => {
      if (mode === 'fullscreen') onEndedRef.current?.();
    };

    let cancelled = false;
    let retryFrame = 0;

    const ensureMounted = () => {
      if (cancelled) return;
      if (mountToMedia()) {
        video.addEventListener('ended', onEndedEvt);
        return;
      }
      retryFrame = window.requestAnimationFrame(ensureMounted);
    };

    ensureMounted();

    return () => {
      cancelled = true;
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
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

    const htmlCamera = host.classList.contains('ar-scene-host--html-camera');
    const useIosBlit = ios && !htmlCamera;

    const frame = clampOverlayFrame(overlayFrame);
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
      stage.style.opacity = '1';
      stage.style.visibility = 'visible';
      stage.style.zIndex = '10080';
      stage.style.background = 'transparent';
      stage.style.pointerEvents = 'none';

      mountVideoInStage();
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
      stage.style.opacity = '1';
      stage.style.visibility = 'visible';
      stage.style.zIndex = '10080';
      stage.style.background = 'transparent';
      stage.style.pointerEvents = 'none';
      mountVideoInStage();
      return true;
    };

    const layoutOverlay = () => {
      const tryAabb = () => {
        const box = getOverlayAabbViewport(host, entity, aspectRatio, frame);
        if (!box) return null;
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
  }, [active, mode, host, targetEntity, aspectRatio, overlayFrame]);

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
    onSoundOnChange?.(true);
    return true;
  }, [onSoundOnChange]);

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
      video.muted = true;
      soundOnRef.current = false;
      setSoundOn(false);
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
        video.src = src;
        video.load();
      };

      const tryResolvedSource = async (src: string, originalSource: string, label: string) => {
        viewerLog('debug', 'video trying source', {
          label,
          blob: src.startsWith('blob:'),
          ios: isIOS(),
          iosHtmlCamera,
          src: src.slice(0, 120),
        });
        applyVideoSrc(src, originalSource);
        await waitForVideoReady(video, loadTimeout);
        const played = await tryPlay(soundOnRef.current);
        if (played || (video.videoWidth > 0 && !video.paused) || Number.isFinite(video.duration)) {
          if (!played) notifyPlay();
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
          viewerLog('debug', 'video resolving source', {
            iosHtmlCamera,
            src: source.slice(0, 120),
          });

          prefetchVideo(source);

          if (iosHtmlCamera) {
            const cachedBlob = getPrefetchedBlobUrl(source);
            if (cachedBlob) {
              await tryResolvedSource(cachedBlob, source, 'cached-blob');
              return;
            }

            try {
              await tryResolvedSource(source, source, 'direct');
              return;
            } catch (directError) {
              lastError = directError;
              viewerLog('warn', 'direct iOS video load failed — trying blob', {
                message: directError instanceof Error ? directError.message : String(directError),
                code: video.error?.code ?? null,
              });
              const blobUrl =
                getPrefetchedBlobUrl(source) ??
                (await awaitSameOriginVideoUrl(source, IOS_BLOB_FALLBACK_TIMEOUT_MS));
              if (!blobUrl) {
                throw directError;
              }
              await tryResolvedSource(blobUrl, source, 'blob');
              return;
            }
          }

          let blobUrl = getPrefetchedBlobUrl(source);
          blobUrl =
            blobUrl ??
            (await awaitSameOriginVideoUrl(source, 2_500)) ??
            getPrefetchedBlobUrl(source);
          const resolved =
            blobUrl ?? (await resolvePlayableVideoUrl(source, { allowBlob: true })) ?? source;
          await tryResolvedSource(resolved, source, blobUrl ? 'blob' : 'direct');
          return;
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
            code: video.error?.code ?? null,
            src: source.slice(0, 96),
          });
        }
      }

      throw lastError ?? new Error('Video did not start');
    },
    [tryPlay, notifyPlay, host],
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
      soundOnRef.current = false;
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

    viewerLog('info', 'TargetFrameVideo active', {
      title,
      primaryUrl: primaryUrl?.slice(0, 120) ?? null,
      fallbackUrl: fallbackUrl?.slice(0, 120) ?? null,
      mode,
      hasHost: Boolean(host),
      hasEntity: Boolean(targetEntity),
      overlayFrame,
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
      },
      'info',
    );

    let cancelled = false;
    setLoading(true);
    setNeedsTap(false);
    hasNotifiedPlayRef.current = false;
    setIsPlaying(false);

    const sources = buildSourceList(primaryUrl, fallbackUrl, preferDirectUrl);
    viewerLog('info', 'TargetFrameVideo sources', {
      sources: sources.map((src) => src.slice(0, 120)),
    });

    void loadAndPlay(sources)
      .catch((error) => {
        if (cancelled) return;
        viewerLog('error', 'TargetFrameVideo loadAndPlay failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        // Instant-or-nothing: never leave a silent late-start / audio-only path hanging.
        onErrorRef.current?.(
          'Video did not start instantly. Hold the photo steady in the frame and try again.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    active,
    primaryUrl,
    fallbackUrl,
    preferDirectUrl,
    loadAndPlay,
    host,
    mode,
    title,
    targetEntity,
    overlayFrame,
  ]);

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

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      const next = !soundOnRef.current;
      setSoundOn(next);
      soundOnRef.current = next;
      onSoundOnChange?.(next);
      return;
    }
    if (soundOn) {
      video.muted = true;
      setSoundOn(false);
      soundOnRef.current = false;
      onSoundOnChange?.(false);
      return;
    }
    enableSound();
    if (video.paused) void video.play().catch(() => undefined);
  }, [soundOn, enableSound, onSoundOnChange]);

  useEffect(() => {
    if (typeof soundOnProp !== 'boolean') return;
    if (soundOnProp === soundOnRef.current) return;
    soundOnRef.current = soundOnProp;
    setSoundOn(soundOnProp);
    const video = videoRef.current;
    if (!video || !active) return;
    if (soundOnProp) {
      video.muted = false;
      video.volume = 1;
      if (video.paused) void video.play().catch(() => undefined);
    } else {
      video.muted = true;
    }
  }, [soundOnProp, active]);

  const handleToggleFullscreen = useCallback(() => {
    onModeChange(mode === 'fullscreen' ? 'frame' : 'fullscreen');
  }, [mode, onModeChange]);

  const handleStageTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAtRef.current < 340) {
      lastTapAtRef.current = 0;
      handleToggleFullscreen();
      return;
    }
    lastTapAtRef.current = now;
  }, [handleToggleFullscreen]);

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
  const showControlsBar = showInlineControls || Boolean(onClose);

  const controls = showControlsBar ? (
    <div
      className="ar-video-controls"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(18px, env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 2147483000,
        pointerEvents: 'auto',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {showInlineControls ? (
        <>
          <button
            type="button"
            className="ar-video-ctrl"
            aria-label={soundOn ? 'Mute' : 'Unmute'}
            onClick={handleToggleMute}
          >
            <span className="ar-video-ctrl__icon" aria-hidden>
              {soundOn ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 10v4h3.2L11 18.5V5.5L6.2 10H3zm11.5 2a3.5 3.5 0 0 0-2-3.15v6.3a3.5 3.5 0 0 0 2-3.15zm-2-7.05v1.55A6.01 6.01 0 0 1 17.5 12a6.01 6.01 0 0 1-5 5.5v1.55A7.52 7.52 0 0 0 19 12a7.52 7.52 0 0 0-6.5-7.05z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 10v4h3.2L11 18.5V5.5L6.2 10H3zm15.9-5.1-1.4-1.4L15 9l-2.5 2.5v.1L15 14.1l2.5 2.5 1.4-1.4L16.4 12.7l2.5-2.5z" />
                  <path d="M4.2 3.1 3 4.3 19.7 21l1.2-1.2z" />
                </svg>
              )}
            </span>
          </button>

          <button
            type="button"
            className="ar-video-ctrl"
            aria-label="Download video"
            onClick={() => void handleDownload()}
          >
            <span className="ar-video-ctrl__icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M11 4h2v9.2l3.1-3.1 1.4 1.4L12 17.1 6.5 11.5l1.4-1.4L11 13.2V4zM5 19h14v2H5v-2z" />
              </svg>
            </span>
          </button>
        </>
      ) : null}

      {onClose ? (
        <button type="button" className="ar-video-ctrl" aria-label="Close" onClick={onClose}>
          <span className="ar-video-ctrl__icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5z" />
            </svg>
          </span>
        </button>
      ) : null}
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
        {showFullscreen ? (
          <p className="ar-video-nowplaying">Double tap to exit · tap speaker for sound</p>
        ) : null}

        <div
          ref={stageRef}
          className="ar-video-stage"
          onClick={handleStageTap}
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
                  void tryPlay(soundOnRef.current);
                }}
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
