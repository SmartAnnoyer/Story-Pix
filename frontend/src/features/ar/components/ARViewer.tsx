import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  ScanOverlayMessage,
  ViewerManifest,
  ViewerManifestTarget,
} from '@/types/ar-target.types';
import { ScanEventType } from '@/types/ar-target.types';
import { detectDeviceInfo, getViewerSessionId, viewerService } from '@/services/viewer.service';
import { ScanStatusOverlay } from './ScanStatusOverlay';
import { ScanFocusFrame, type ScanFocusPhase } from './ScanFocusFrame';
import { TargetFrameVideo, type VideoDisplayMode } from './TargetFrameVideo';
import { ViewerControlBar } from './ViewerControlBar';
import { ViewerTopChrome } from './ViewerTopChrome';
import type { ViewerPhase } from './ViewerProgressBar';
import {
  clearMindCacheForAlbum,
  compileMindFile,
  getMindCacheKey,
  loadArScripts,
  readMindCache,
} from '../utils/mindar-loader';
import {
  attachCameraStream,
  bootstrapGuestCameraLayout,
  buildMindArScene,
  destroyMindArScene,
  ensureCameraPreviewVisible,
  flipMindArCamera,
  getMindArSystem,
  isCameraPreviewLive,
  keepMindArCameraPlaying,
  releaseMappedVideoDecoder,
  restartMindArTracking,
  type CameraFacing,
} from '../utils/mindar-scene';
import { takeHeldCameraStream, releaseHeldCameraStream } from '../utils/camera-permission';
import { prefetchManifestVideos, prefetchVideo } from '../utils/video-prefetch';
import { getTargetAspectRatio, installPoseCapture } from '../utils/target-projection';
import { mappingsForMindIndex, uniqueTrackingPhotos } from '../utils/manifest-photos';
import { readMatchPercent, smoothMatchPercent } from '../utils/match-confidence';
import { detachOverlayVideoPlane } from '../utils/overlay-plane';
import { viewerLog } from '../utils/viewer-debug-log';
import './ARViewer.css';

interface ARViewerProps {
  albumSlug: string;
  manifest: ViewerManifest;
  /** Populated when welcome-screen warmup finished before Start. */
  prefetchedMindBundle?: { url: string; cacheKey: string } | null;
  initialFacingMode?: CameraFacing;
}

type MindBundle = {
  url: string;
  cacheKey: string;
};

const AR_INIT_TIMEOUT_MS = 35_000;
const SCAN_HINT_DELAY_MS = 18_000;
const SCAN_NO_MATCH_DELAY_MS = 30_000;
const TARGET_FOUND_CONFIRM_MS = 0;
const TARGET_SWITCH_CONFIRM_MS = 0;
/** Leave the print — stop shortly; other indices finding cancels this. */
const TARGET_LOST_GRACE_MS = 180;
const TARGET_LOST_PLAYING_GRACE_MS = 550;
const TARGET_SWITCH_COOLDOWN_MS = 450;

const buildServerMindBundle = (albumSlug: string, manifest: ViewerManifest): MindBundle | null => {
  if (!manifest.mindFile) return null;

  const sortedTargets = [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex);
  const uniquePhotos = uniqueTrackingPhotos(sortedTargets);
  const cacheKey = getMindCacheKey(
    albumSlug,
    uniquePhotos.map((target) => ({ id: target.photoMediaId, photoMediaId: target.photoMediaId })),
    manifest.mindFile.hash,
  );

  return {
    url: viewerService.getMindFileUrl(albumSlug, manifest.mindFile.hash),
    cacheKey,
  };
};

const resolveMindUrlForScene = async (url: string): Promise<{ url: string; revoke: boolean }> => {
  if (url.startsWith('blob:')) {
    return { url, revoke: false };
  }

  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Could not download AR scan file (${response.status})`);
  }

  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), revoke: true };
};

export const ARViewer = ({
  albumSlug,
  manifest,
  prefetchedMindBundle,
  initialFacingMode = 'environment',
}: ARViewerProps) => {
  const initialMindBundle = prefetchedMindBundle ?? buildServerMindBundle(albumSlug, manifest);
  const hasPreparedMind = Boolean(initialMindBundle);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneHost, setSceneHost] = useState<HTMLElement | null>(null);
  const targetEntitiesRef = useRef<HTMLElement[]>([]);
  const [trackedEntity, setTrackedEntity] = useState<HTMLElement | null>(null);
  const targetTrackedRef = useRef(false);
  const videoModeRef = useRef<VideoDisplayMode>('frame');
  const listenersAttachedRef = useRef(false);
  const targetFoundTimersRef = useRef<Map<number, number>>(new Map());
  const targetLostGraceRef = useRef<Map<number, number>>(new Map());
  const prefetchedOnWarmRef = useRef(false);
  const [status, setStatus] = useState<ScanOverlayMessage>(
    hasPreparedMind ? 'loading' : 'preparing',
  );
  const [activeTarget, setActiveTarget] = useState<ViewerManifestTarget | null>(null);
  const [activeMindIndex, setActiveMindIndex] = useState<number | null>(null);
  const activeMindIndexRef = useRef<number | null>(null);
  const lastTargetSwitchAtRef = useRef(0);
  const [targetAspectRatio, setTargetAspectRatio] = useState(1.414);
  const [videoMode, setVideoMode] = useState<VideoDisplayMode>('frame');
  const [mindBundle, setMindBundle] = useState<MindBundle | null>(initialMindBundle);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [progress, setProgress] = useState(hasPreparedMind ? 0.72 : 0.05);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [matchPercent, setMatchPercent] = useState(0);
  const [videoReveal, setVideoReveal] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const downloadActionRef = useRef<(() => void) | null>(null);
  const matchPercentRef = useRef(0);
  const [facingMode, setFacingMode] = useState<CameraFacing>(initialFacingMode);
  const [flipping, setFlipping] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const [prepareGeneration, setPrepareGeneration] = useState(0);
  const skipWarmupPrepareRef = useRef(hasPreparedMind);
  const scanHintTimeoutRef = useRef<number | null>(null);
  const scanNoMatchTimeoutRef = useRef<number | null>(null);
  const scanTickRef = useRef<number | null>(null);
  const statusRef = useRef<ScanOverlayMessage>(status);

  useLayoutEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    bootstrapGuestCameraLayout(host);
  }, []);
  const scanningEnabledRef = useRef(false);
  const deviceInfo = useMemo(() => detectDeviceInfo(), []);
  const sessionId = useMemo(() => getViewerSessionId(), []);

  const waitForCameraPreview = async (
    host: HTMLElement,
    attempts = 40,
    delayMs = 250,
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      ensureCameraPreviewVisible(host);
      if (isCameraPreviewLive(host)) return true;
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    return isCameraPreviewLive(host);
  };

  const targets = useMemo(
    () => [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex),
    [manifest.targets],
  );
  const uniquePhotos = useMemo(() => uniqueTrackingPhotos(targets), [targets]);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const mindCacheTargets = useMemo(
    () =>
      uniquePhotos.map((target) => ({
        id: target.photoMediaId,
        photoMediaId: target.photoMediaId,
      })),
    [uniquePhotos],
  );

  const mindCacheKey = useMemo(
    () => getMindCacheKey(albumSlug, mindCacheTargets, manifest.mindFile?.hash),
    [albumSlug, mindCacheTargets, manifest.mindFile?.hash],
  );

  const trackingImageUrls = useMemo(
    () =>
      uniquePhotos.map((target) =>
        viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId),
      ),
    [albumSlug, uniquePhotos],
  );

  const siblingVideos = useMemo(
    () => (activeMindIndex == null ? [] : mappingsForMindIndex(targets, activeMindIndex)),
    [activeMindIndex, targets],
  );
  const siblingIndex = siblingVideos.findIndex((item) => item.id === activeTarget?.id);

  const activeVideoUrl = useMemo(() => {
    if (!activeTarget?.videoAvailable) return null;
    return viewerService.getMappingVideoUrl(albumSlug, activeTarget.id, activeTarget.videoMediaId);
  }, [activeTarget, albumSlug]);

  const activeVideoFallbackUrl = useMemo(() => {
    if (!activeTarget?.videoAvailable) return null;
    return activeTarget.videoUrl;
  }, [activeTarget]);

  const viewerPhase: ViewerPhase = useMemo(() => {
    if (status === 'preparing') return 'preparing';
    if (status === 'loading') return 'loading';
    if (status === 'scanning' || status === 'move_closer') return 'scanning';
    if (status === 'match_found' || status === 'recognized') return 'done';
    if (status === 'compile_failed' || status === 'camera_required' || status === 'no_match') {
      return 'error';
    }
    return 'loading';
  }, [status]);

  const scanFocusPhase: ScanFocusPhase = useMemo(() => {
    if (status === 'match_found') return 'found';
    if (status === 'scanning' || status === 'move_closer') {
      if (matchPercent >= 82) return 'locking';
      if (matchPercent >= 42) return 'warming';
      return 'scanning';
    }
    return 'scanning';
  }, [status, matchPercent]);

  const clearScanTimers = useCallback(() => {
    if (scanHintTimeoutRef.current) window.clearTimeout(scanHintTimeoutRef.current);
    if (scanNoMatchTimeoutRef.current) window.clearTimeout(scanNoMatchTimeoutRef.current);
    if (scanTickRef.current) window.clearInterval(scanTickRef.current);
    scanHintTimeoutRef.current = null;
    scanNoMatchTimeoutRef.current = null;
    scanTickRef.current = null;
  }, []);

  const startScanTimers = useCallback(() => {
    clearScanTimers();
    setScanSeconds(0);
    scanTickRef.current = window.setInterval(() => {
      setScanSeconds((seconds) => seconds + 1);
    }, 1000);

    scanHintTimeoutRef.current = window.setTimeout(() => {
      if (containerRef.current && isCameraPreviewLive(containerRef.current)) {
        setStatus('move_closer');
        setStatusDetail(
          'Fill the frame with the printed photo. Plain passport backgrounds need steady, close alignment.',
        );
      }
    }, SCAN_HINT_DELAY_MS);

    scanNoMatchTimeoutRef.current = window.setTimeout(() => {
      setStatus('no_match');
      setStatusDetail(
        'No match after 25 seconds. Scan the exact printed photo (not your screen). Use bright, even light.',
      );
      void recordEventRef.current(ScanEventType.SCAN_FAILED);
    }, SCAN_NO_MATCH_DELAY_MS);
  }, [clearScanTimers]);

  const recordEventRef = useRef<
    (eventType: ScanEventType, target?: ViewerManifestTarget | null) => Promise<void>
  >(async () => undefined);

  const recordEvent = useCallback(
    async (eventType: ScanEventType, target?: ViewerManifestTarget | null) => {
      try {
        await viewerService.recordEvent(albumSlug, {
          eventType,
          arTargetId: target?.id,
          targetIndex: target?.targetIndex,
          sessionId,
          ...deviceInfo,
        });
      } catch {
        // Analytics should not block viewer UX
      }
    },
    [albumSlug, deviceInfo, sessionId],
  );

  recordEventRef.current = recordEvent;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    videoModeRef.current = videoMode;
  }, [videoMode]);

  useEffect(() => {
    void recordEvent(ScanEventType.VIEWER_OPEN);
  }, [recordEvent]);

  useEffect(() => {
    if (skipWarmupPrepareRef.current) {
      skipWarmupPrepareRef.current = false;
      return undefined;
    }

    let cancelled = false;
    let compiledMindUrl: string | null = null;

    const prepareMindFile = async () => {
      if (!targets.length) {
        setStatus('no_targets');
        return;
      }

      setMindBundle(null);
      setStatus('preparing');
      setPrepareError(null);
      setStatusDetail(null);
      setProgress(0.05);
      setActiveTarget(null);
      setActiveMindIndex(null);
      setTrackedEntity(null);
      activeMindIndexRef.current = null;
      setVideoMode('frame');
      targetTrackedRef.current = false;

      try {
        const cached = await readMindCache(mindCacheKey);
        if (cached && !cancelled) {
          setMindBundle({ url: cached.mindUrl, cacheKey: mindCacheKey });
          setProgress(0.72);
          setStatus('loading');
          return;
        }

        const compiled = await compileMindFile(trackingImageUrls, (value) => {
          if (!cancelled) setProgress(value * 0.7);
        });
        compiledMindUrl = compiled.mindUrl;

        sessionStorage.setItem(
          mindCacheKey,
          JSON.stringify({
            mindUrl: compiled.mindUrl,
            targetDimensions: compiled.targetDimensions,
          }),
        );

        if (!cancelled) {
          setMindBundle({ url: compiled.mindUrl, cacheKey: mindCacheKey });
          setProgress(0.72);
          setStatus('loading');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Story-pix AR] prepare failed:', error);
        clearMindCacheForAlbum(albumSlug, mindCacheTargets);
        if (!cancelled) {
          setPrepareError(message);
          setStatusDetail(message);
          setStatus('compile_failed');
          setProgress(0);
        }
      }
    };

    void prepareMindFile();

    return () => {
      cancelled = true;
      if (compiledMindUrl) {
        const cached = sessionStorage.getItem(mindCacheKey);
        if (cached && !cached.includes(compiledMindUrl)) {
          URL.revokeObjectURL(compiledMindUrl);
        }
      }
    };
  }, [
    albumSlug,
    mindCacheKey,
    mindCacheTargets,
    prepareGeneration,
    targets.length,
    trackingImageUrls,
  ]);

  useEffect(() => {
    if (status !== 'loading') return undefined;

    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(0.88, value + 0.02));
    }, 400);

    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!mindBundle || mindBundle.cacheKey !== mindCacheKey || !containerRef.current) {
      return undefined;
    }

    let mounted = true;
    const host = containerRef.current;
    let cameraObserver: MutationObserver | null = null;
    let mindBlobUrlToRevoke: string | null = null;
    listenersAttachedRef.current = false;
    scanningEnabledRef.current = false;
    const foundTimers = targetFoundTimersRef.current;
    const lostGraceTimers = targetLostGraceRef.current;

    const initScene = async () => {
      try {
        setStatus('loading');
        setStatusDetail('Starting camera…');
        setProgress((value) => Math.max(value, 0.75));
        viewerLog('info', 'AR scene init start', {
          mindUrl: mindBundle.url.slice(0, 80),
          targets: targets.length,
          facingMode,
          AFRAME: Boolean(window.AFRAME),
        });

        await loadArScripts();
        if (!mounted || !containerRef.current) return;
        viewerLog('info', 'AR scripts ready for scene');

        const resolvedMind = await resolveMindUrlForScene(mindBundle.url);
        if (!mounted || !containerRef.current) {
          if (resolvedMind.revoke) URL.revokeObjectURL(resolvedMind.url);
          return;
        }
        if (resolvedMind.revoke) {
          mindBlobUrlToRevoke = resolvedMind.url;
        }
        viewerLog('info', 'mind file resolved for scene', {
          blob: resolvedMind.revoke,
          url: resolvedMind.url.slice(0, 64),
        });

        setProgress((value) => Math.max(value, 0.82));

        const { scene, targetEntities } = buildMindArScene(host, {
          mindUrl: resolvedMind.url,
          targetCount: uniquePhotos.length,
          facingMode,
        });
        targetEntitiesRef.current = targetEntities;
        targetEntities.forEach((entity) => installPoseCapture(entity));
        setSceneHost(host);
        viewerLog('info', 'a-scene mounted', { targetEntities: targetEntities.length });

        const beginPlayback = (
          mindIndex: number,
          nextTarget: ViewerManifestTarget,
          isSwitch: boolean,
        ) => {
          targetLostGraceRef.current.forEach((timer, index) => {
            if (index === mindIndex) return;
            window.clearTimeout(timer);
            targetLostGraceRef.current.delete(index);
          });

          activeMindIndexRef.current = mindIndex;
          setActiveMindIndex(mindIndex);
          setTrackedEntity(targetEntities[mindIndex] ?? null);
          setTargetAspectRatio(
            manifest.mindFile?.targetDimensions?.[mindIndex]
              ? manifest.mindFile.targetDimensions[mindIndex].height /
                  manifest.mindFile.targetDimensions[mindIndex].width
              : getTargetAspectRatio(mindCacheKey, mindIndex),
          );
          if (!isSwitch) {
            setVideoMode('frame');
          }
          targetTrackedRef.current = true;
          statusRef.current = 'match_found';
          setStatus('match_found');
          setVideoReveal(false);
          void recordEventRef.current(ScanEventType.SCAN_SUCCESS, nextTarget);
          prefetchVideo(
            viewerService.getMappingVideoUrl(albumSlug, nextTarget.id, nextTarget.videoMediaId),
          );
          // Instant: mount the player on the same tick as MindAR targetFound.
          setActiveTarget(nextTarget);
        };

        const confirmTargetMatch = (mindIndex: number) => {
          if (!mounted) return;

          if (!scanningEnabledRef.current || !isCameraPreviewLive(host)) {
            return;
          }

          const group = mappingsForMindIndex(targetsRef.current, mindIndex);
          const nextTarget = group.find((item) => item.videoAvailable) ?? group[0];
          if (!nextTarget) return;

          const current = statusRef.current;
          const playing = current === 'match_found' || current === 'recognized';
          const activeIndex = activeMindIndexRef.current;

          if (playing && activeIndex === mindIndex) {
            return;
          }

          if (playing && activeIndex !== null && activeIndex !== mindIndex) {
            const activeGroup = mappingsForMindIndex(targetsRef.current, activeIndex);
            const activePhotoId = activeGroup[0]?.photoMediaId;
            // Same print false-matched to another mind slot — keep current clip.
            if (activePhotoId && activePhotoId === nextTarget.photoMediaId) {
              viewerLog('info', 'targetFound keep — same photo via other mind index', {
                mindIndex,
                active: activeIndex,
              });
              setTrackedEntity(targetEntities[mindIndex] ?? targetEntities[activeIndex] ?? null);
              return;
            }

            const now = Date.now();
            if (now - lastTargetSwitchAtRef.current < TARGET_SWITCH_COOLDOWN_MS) {
              viewerLog('info', 'target switch deferred — cooldown', {
                mindIndex,
                active: activeIndex,
              });
              return;
            }

            if (!nextTarget.videoAvailable) {
              viewerLog('warn', 'target switch skipped — no playable video', {
                mindIndex,
                target: nextTarget.targetName,
              });
              return;
            }

            lastTargetSwitchAtRef.current = now;
            viewerLog('info', 'switching playback to newly found photo', {
              from: activeIndex,
              to: mindIndex,
              target: nextTarget.targetName,
            });
            clearScanTimers();
            setProgress(1);
            setStatusDetail(null);
            beginPlayback(mindIndex, nextTarget, true);
            return;
          }

          if (current !== 'scanning' && current !== 'move_closer') {
            return;
          }

          viewerLog('info', 'target match confirmed — starting video', {
            target: nextTarget.targetName,
            mindIndex,
            videoCount: group.length,
          });

          clearScanTimers();
          setProgress(1);
          setStatusDetail(null);

          if (!nextTarget.videoAvailable) {
            setStatus('video_unavailable');
            setStatusDetail('This mapping has no playable video file.');
            void recordEventRef.current(ScanEventType.SCAN_FAILED, nextTarget);
            return;
          }

          beginPlayback(mindIndex, nextTarget, false);
        };

        const attachTargetListeners = () => {
          if (listenersAttachedRef.current) return;
          listenersAttachedRef.current = true;

          uniquePhotos.forEach((photoTarget) => {
            const mindIndex = photoTarget.targetIndex;
            const entity = targetEntities[mindIndex];
            if (!entity) return;

            entity.addEventListener('targetFound', () => {
              installPoseCapture(entity);
              const grace = targetLostGraceRef.current.get(mindIndex);
              if (grace) {
                window.clearTimeout(grace);
                targetLostGraceRef.current.delete(mindIndex);
              }

              const playing =
                statusRef.current === 'match_found' || statusRef.current === 'recognized';

              // Any detection while playing cancels leave-timers (MindAR index hopping).
              if (playing) {
                targetLostGraceRef.current.forEach((timer, index) => {
                  window.clearTimeout(timer);
                  targetLostGraceRef.current.delete(index);
                });
                targetTrackedRef.current = true;
              }

              viewerLog('info', 'targetFound event', {
                target: photoTarget.targetName,
                mindIndex,
                scanningEnabled: scanningEnabledRef.current,
                status: statusRef.current,
              });
              if (!mounted || !scanningEnabledRef.current) return;
              if (!isCameraPreviewLive(host)) {
                viewerLog('warn', 'targetFound ignored — camera not live');
                return;
              }
              targetTrackedRef.current = true;

              const pending = targetFoundTimersRef.current.get(mindIndex);
              if (pending) window.clearTimeout(pending);

              // Instant detection: start on the same event — no delayed confirm.
              if (TARGET_FOUND_CONFIRM_MS <= 0 && TARGET_SWITCH_CONFIRM_MS <= 0) {
                confirmTargetMatch(mindIndex);
                return;
              }

              const switching =
                playing &&
                activeMindIndexRef.current !== null &&
                activeMindIndexRef.current !== mindIndex;
              const confirmMs = switching ? TARGET_SWITCH_CONFIRM_MS : TARGET_FOUND_CONFIRM_MS;

              const timer = window.setTimeout(() => {
                targetFoundTimersRef.current.delete(mindIndex);
                confirmTargetMatch(mindIndex);
              }, confirmMs);

              targetFoundTimersRef.current.set(mindIndex, timer);
            });

            entity.addEventListener('targetLost', () => {
              viewerLog('debug', 'targetLost event', {
                target: photoTarget.targetName,
                mindIndex,
                status: statusRef.current,
                videoMode: videoModeRef.current,
              });
              const pending = targetFoundTimersRef.current.get(mindIndex);
              if (pending) {
                window.clearTimeout(pending);
                targetFoundTimersRef.current.delete(mindIndex);
                if (statusRef.current === 'scanning' || statusRef.current === 'move_closer') {
                  targetTrackedRef.current = false;
                }
                return;
              }

              if (!mounted) return;

              // Fullscreen is user-controlled — don't tear down from tracking blips.
              if (videoModeRef.current === 'fullscreen') {
                viewerLog('info', 'targetLost ignored — fullscreen latched', { mindIndex });
                return;
              }

              const existingGrace = targetLostGraceRef.current.get(mindIndex);
              if (existingGrace) return;

              const graceMs =
                activeMindIndexRef.current === mindIndex ||
                statusRef.current === 'match_found' ||
                statusRef.current === 'recognized'
                  ? TARGET_LOST_PLAYING_GRACE_MS
                  : TARGET_LOST_GRACE_MS;

              const grace = window.setTimeout(() => {
                targetLostGraceRef.current.delete(mindIndex);
                if (!mounted) return;

                if (videoModeRef.current === 'fullscreen') {
                  return;
                }

                if (activeMindIndexRef.current !== mindIndex) {
                  viewerLog('info', 'targetLost ignored — not the active index', {
                    mindIndex,
                    active: activeMindIndexRef.current,
                  });
                  return;
                }

                targetTrackedRef.current = false;
                viewerLog('info', 'targetLost — stopping video and resuming scan', {
                  mindIndex,
                  status: statusRef.current,
                });
                detachOverlayVideoPlane(targetEntitiesRef.current[mindIndex] ?? null);
                setActiveTarget(null);
                activeMindIndexRef.current = null;
                setActiveMindIndex(null);
                setTrackedEntity(null);
                setVideoMode('frame');
                setVideoReveal(false);
                statusRef.current = 'scanning';
                setStatus('scanning');
                setStatusDetail(null);
                setProgress(0.92);
                matchPercentRef.current = 0;
                setMatchPercent(0);
                prefetchedOnWarmRef.current = false;
                startScanTimers();
                window.setTimeout(() => {
                  if (!mounted) return;
                  releaseMappedVideoDecoder(host);
                  keepMindArCameraPlaying(host);
                  restartMindArTracking(host);
                }, 80);
              }, graceMs);

              targetLostGraceRef.current.set(mindIndex, grace);
            });
          });
        };

        attachTargetListeners();
        scene.addEventListener('loaded', attachTargetListeners, { once: true });

        let scanningBootstrapped = false;

        cameraObserver = new MutationObserver(() => {
          ensureCameraPreviewVisible(host);
        });
        cameraObserver.observe(host, { childList: true, subtree: true });

        scene.addEventListener('arReady', () => {
          if (!mounted || scanningBootstrapped) {
            viewerLog('debug', 'arReady ignored (already bootstrapped)');
            return;
          }
          scanningBootstrapped = true;
          viewerLog('info', 'arReady fired — enabling scan');
          ensureCameraPreviewVisible(host);

          void (async () => {
            if (!mounted || !containerRef.current) return;

            const heldStream = takeHeldCameraStream();
            const mindArAlreadyLive = isCameraPreviewLive(containerRef.current);

            viewerLog('info', 'camera bootstrap', {
              heldStream: Boolean(heldStream),
              mindArAlreadyLive,
              tracks: heldStream?.getVideoTracks().map((t) => t.label) ?? [],
            });

            // Prefer MindAR's own camera when it already started — swapping streams
            // on iPhone often keeps the preview but kills image tracking.
            if (heldStream && mindArAlreadyLive) {
              viewerLog('info', 'keeping MindAR camera; releasing primed stream');
              heldStream.getTracks().forEach((track) => track.stop());
            } else if (heldStream) {
              const attached = await attachCameraStream(
                containerRef.current,
                heldStream,
                facingMode,
              );
              viewerLog(attached ? 'info' : 'warn', 'attachCameraStream result', { attached });
              if (!mounted) return;
              if (!attached) {
                heldStream.getTracks().forEach((track) => track.stop());
              }
            } else if (facingMode === 'user' && !mindArAlreadyLive) {
              try {
                await flipMindArCamera(containerRef.current, 'user');
              } catch (error) {
                viewerLog(
                  'warn',
                  `flipMindArCamera failed: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }

            if (!mounted || !containerRef.current) return;

            const cameraLive = await waitForCameraPreview(containerRef.current);
            viewerLog(cameraLive ? 'info' : 'error', 'camera preview live check', {
              cameraLive,
              videoCount: containerRef.current.querySelectorAll('video').length,
            });
            if (!mounted) return;

            if (!cameraLive) {
              setStatusDetail('Allow camera access, then tap Try again or reload.');
              setStatus('camera_required');
              setProgress(0);
              scanningEnabledRef.current = false;
              return;
            }

            scanningEnabledRef.current = true;
            setProgress(0.92);
            setStatus('scanning');
            setStatusDetail('Point at the printed photo — fill the frame.');
            viewerLog('info', 'scanning enabled — waiting for targetFound');
            startScanTimers();
          })();
        });

        scene.addEventListener('arError', (event) => {
          if (!mounted) return;
          viewerLog('error', 'arError event');
          console.error('[Story-pix AR] arError:', event);
          scanningEnabledRef.current = false;
          clearMindCacheForAlbum(albumSlug, mindCacheTargets);
          setStatusDetail('AR failed to load targets. Tap Try again to rebuild.');
          setStatus('camera_required');
          setProgress(0);
          void recordEventRef.current(ScanEventType.SCAN_FAILED, null);
        });

        window.setTimeout(() => {
          if (!mounted) return;
          const current = statusRef.current;
          if (
            current === 'scanning' ||
            current === 'recognized' ||
            current === 'match_found' ||
            current === 'move_closer'
          )
            return;
          if (!isCameraPreviewLive(host)) {
            viewerLog('error', 'AR init timeout — camera not live', { status: current });
            setStatusDetail('Camera preview did not start. Tap flip camera or reload the page.');
            setStatus('camera_required');
            setProgress(0);
          }
        }, AR_INIT_TIMEOUT_MS);
      } catch (error) {
        viewerLog(
          'error',
          `scene init failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        console.error('[Story-pix AR] scene init failed:', error);
        if (mounted) {
          setStatusDetail(error instanceof Error ? error.message : 'Scene failed to load');
          setStatus('camera_required');
          setProgress(0);
        }
      }
    };

    void initScene();

    return () => {
      mounted = false;
      scanningEnabledRef.current = false;
      listenersAttachedRef.current = false;
      foundTimers.forEach((timer) => window.clearTimeout(timer));
      foundTimers.clear();
      lostGraceTimers.forEach((timer) => window.clearTimeout(timer));
      lostGraceTimers.clear();
      clearScanTimers();
      cameraObserver?.disconnect();
      destroyMindArScene(host);
      releaseHeldCameraStream();
      if (mindBlobUrlToRevoke) {
        URL.revokeObjectURL(mindBlobUrlToRevoke);
      }
    };
  }, [
    albumSlug,
    mindBundle,
    mindCacheKey,
    mindCacheTargets,
    targets,
    uniquePhotos,
    sceneGeneration,
    facingMode,
    clearScanTimers,
    startScanTimers,
    manifest.mindFile?.targetDimensions,
  ]);

  useEffect(() => {
    if (status !== 'scanning' && status !== 'move_closer') return undefined;
    prefetchManifestVideos(albumSlug, targets);
    setProgress((value) => Math.min(0.99, Math.max(value, 0.92 + scanSeconds * 0.002)));
    return undefined;
  }, [scanSeconds, status, targets, albumSlug]);

  useEffect(() => {
    if (status === 'match_found' || status === 'recognized') {
      matchPercentRef.current = 100;
      setMatchPercent(100);
      return undefined;
    }

    if (status !== 'scanning' && status !== 'move_closer' && status !== 'loading') {
      matchPercentRef.current = 0;
      setMatchPercent(0);
      return undefined;
    }

    let frameId = 0;
    let lastTs = 0;

    const tick = (ts: number) => {
      if (ts - lastTs >= 80) {
        lastTs = ts;
        const host = containerRef.current;
        const raw = readMatchPercent(host);
        // While confirming a targetFound, nudge toward a locked read.
        const boosted =
          targetTrackedRef.current && (status === 'scanning' || status === 'move_closer')
            ? Math.max(raw, 86)
            : raw;
        const next = Math.round(smoothMatchPercent(matchPercentRef.current, boosted));
        if (next !== matchPercentRef.current) {
          matchPercentRef.current = next;
          setMatchPercent(next);
        }
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [status]);

  // Prefetch every mapped clip as soon as scanning starts — instant play on detect.
  useEffect(() => {
    if (status !== 'scanning' && status !== 'move_closer' && status !== 'loading') {
      return;
    }
    prefetchManifestVideos(albumSlug, targets);
  }, [status, albumSlug, targets]);

  useEffect(() => {
    if (status !== 'scanning' && status !== 'move_closer' && status !== 'loading') {
      return undefined;
    }

    const tick = () => {
      const host = containerRef.current;
      const system = host ? getMindArSystem(host) : null;
      const states = system?.controller?.trackingStates ?? [];
      viewerLog('debug', 'scan heartbeat', {
        status,
        matchPercent: matchPercentRef.current,
        cameraLive: host ? isCameraPreviewLive(host) : false,
        videoCount: host?.querySelectorAll('video').length ?? 0,
        scanningEnabled: scanningEnabledRef.current,
        targetTracked: targetTrackedRef.current,
        tracking: states.map((state, index) => ({
          i: index,
          showing: Boolean(state.showing),
          isTracking: Boolean(state.isTracking),
          trackCount: state.trackCount ?? 0,
          trackMiss: state.trackMiss ?? 0,
        })),
      });
    };

    tick();
    const timer = window.setInterval(tick, 2500);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!mindBundle || status !== 'loading') return undefined;

    const timer = window.setTimeout(() => {
      setStatusDetail('Camera or AR scene did not start in time.');
      setStatus('camera_required');
      setProgress(0);
    }, AR_INIT_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [mindBundle, status]);

  const handleFlipCamera = async () => {
    const host = containerRef.current;
    if (!host || flipping) return;

    const nextFacing: CameraFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFlipping(true);
    setStatusDetail(null);

    try {
      if (isCameraPreviewLive(host)) {
        await flipMindArCamera(host, nextFacing);
        setFacingMode(nextFacing);
      } else {
        setFacingMode(nextFacing);
        setSceneGeneration((value) => value + 1);
      }
    } catch (error) {
      console.error('[Story-pix AR] flip failed:', error);
      setFacingMode(nextFacing);
      setSceneGeneration((value) => value + 1);
    } finally {
      setFlipping(false);
    }
  };

  const stopVideoPlayback = useCallback(() => {
    setActiveTarget(null);
    setActiveMindIndex(null);
    setTrackedEntity(null);
    activeMindIndexRef.current = null;
    setVideoMode('frame');
    setVideoReveal(false);
    targetTrackedRef.current = false;
    prefetchedOnWarmRef.current = false;
  }, []);

  const cycleSiblingVideo = useCallback(
    (direction: 1 | -1) => {
      if (siblingVideos.length < 2 || siblingIndex < 0) return;
      const next =
        siblingVideos[(siblingIndex + direction + siblingVideos.length) % siblingVideos.length];
      if (next) setActiveTarget(next);
    },
    [siblingIndex, siblingVideos],
  );

  const resumeScanningAfterVideo = useCallback(() => {
    stopVideoPlayback();
    scanningEnabledRef.current = true;
    setStatus('scanning');
    setStatusDetail(null);
    setProgress(0.92);
    startScanTimers();
  }, [startScanTimers, stopVideoPlayback]);

  const handleExitFullscreen = useCallback(() => {
    setVideoMode('frame');
  }, []);

  const handleFullscreenEnded = useCallback(() => {
    setVideoMode('frame');
  }, []);

  const handleRetryScan = () => {
    clearScanTimers();
    setStatusDetail(null);
    setPrepareError(null);
    setScanSeconds(0);
    setProgress(0.92);
    stopVideoPlayback();
    scanningEnabledRef.current = false;

    if (
      status === 'no_match' ||
      status === 'match_found' ||
      status === 'camera_required' ||
      status === 'compile_failed' ||
      status === 'video_unavailable'
    ) {
      clearMindCacheForAlbum(albumSlug, mindCacheTargets);
      setMindBundle(null);
      setStatus('preparing');
      setPrepareGeneration((value) => value + 1);
      return;
    }

    if (containerRef.current && isCameraPreviewLive(containerRef.current)) {
      setStatus('scanning');
      startScanTimers();
      return;
    }

    clearMindCacheForAlbum(albumSlug, mindCacheTargets);
    setMindBundle(null);
    setStatus('preparing');
    setPrepareGeneration((value) => value + 1);
  };

  const showControls =
    videoMode !== 'fullscreen' &&
    !activeTarget &&
    status !== 'recognized' &&
    (status === 'scanning' ||
      status === 'move_closer' ||
      status === 'loading' ||
      status === 'no_match' ||
      status === 'camera_required');

  return (
    <div className="ar-viewer-root bg-black">
      <div
        ref={(node) => {
          containerRef.current = node;
          setSceneHost(node);
        }}
        className="ar-scene-host"
      />
      {videoMode !== 'fullscreen' ? (
        <ViewerTopChrome
          soundOn={soundOn}
          onToggleMute={() => setSoundOn((value) => !value)}
          onDownload={() => downloadActionRef.current?.()}
          canDownload={Boolean(
            activeTarget?.videoAvailable && (activeVideoUrl || activeVideoFallbackUrl),
          )}
        />
      ) : null}
      <ScanFocusFrame
        visible={
          videoMode !== 'fullscreen' &&
          !activeTarget &&
          (status === 'scanning' || status === 'move_closer')
        }
        phase={scanFocusPhase}
      />
      <TargetFrameVideo
        host={sceneHost}
        targetEntity={trackedEntity}
        aspectRatio={targetAspectRatio}
        overlayFrame={activeTarget?.overlayFrame}
        primaryUrl={activeVideoUrl}
        fallbackUrl={activeVideoFallbackUrl}
        preferDirectUrl={false}
        title={activeTarget?.targetName}
        active={Boolean(activeTarget?.videoAvailable && (activeVideoUrl || activeVideoFallbackUrl))}
        mode={videoMode}
        videoCount={siblingVideos.length}
        videoIndex={Math.max(0, siblingIndex)}
        onCycleVideo={cycleSiblingVideo}
        onModeChange={setVideoMode}
        showInlineControls={false}
        soundOn={soundOn}
        onSoundOnChange={setSoundOn}
        onDownloadReady={(download) => {
          downloadActionRef.current = download;
        }}
        onPlay={() => {
          viewerLog('info', 'video playing', {
            target: activeTarget?.targetName,
            mode: videoModeRef.current,
          });
          setVideoReveal(true);
          setStatus('recognized');
          setStatusDetail(null);
          if (activeTarget) void recordEvent(ScanEventType.VIDEO_PLAY, activeTarget);
          for (const sibling of siblingVideos) {
            if (!sibling.videoAvailable) continue;
            prefetchVideo(
              viewerService.getMappingVideoUrl(albumSlug, sibling.id, sibling.videoMediaId),
            );
          }
        }}
        onError={(message) => {
          viewerLog('error', 'video playback failed — aborting late play', {
            message,
            url: activeVideoUrl,
          });
          // Instant-or-nothing: do not keep a half-started clip that only plays audio later.
          resumeScanningAfterVideo();
          setStatusDetail(message);
        }}
        onEnded={handleFullscreenEnded}
        onExitFullscreen={handleExitFullscreen}
        onClose={resumeScanningAfterVideo}
        reveal={videoReveal}
      />
      <ScanStatusOverlay
        status={status}
        detail={prepareError ?? statusDetail}
        progress={progress}
        phase={viewerPhase}
      />
      <ViewerControlBar
        showFlip={showControls}
        showRetry={
          status === 'no_match' ||
          status === 'move_closer' ||
          status === 'camera_required' ||
          status === 'video_unavailable'
        }
        flipping={flipping}
        facingMode={facingMode}
        onFlip={() => void handleFlipCamera()}
        onRetry={handleRetryScan}
      />
    </div>
  );
};
