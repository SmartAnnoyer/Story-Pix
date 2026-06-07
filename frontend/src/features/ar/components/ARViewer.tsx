import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScanOverlayMessage, ViewerManifest, ViewerManifestTarget } from '@/types/ar-target.types';
import { ScanEventType } from '@/types/ar-target.types';
import { detectDeviceInfo, getViewerSessionId, viewerService } from '@/services/viewer.service';
import { BrandLogo } from '@/components/BrandLogo';
import { ScanStatusOverlay } from './ScanStatusOverlay';
import { VideoOverlay } from './VideoOverlay';
import { ViewerControlBar } from './ViewerControlBar';
import type { ViewerPhase } from './ViewerProgressBar';
import {
  clearMindCacheForAlbum,
  compileMindFile,
  getMindCacheKey,
  loadArScripts,
  readMindCache,
} from '../utils/mindar-loader';
import {
  buildMindArScene,
  destroyMindArScene,
  ensureCameraPreviewVisible,
  flipMindArCamera,
  isCameraPreviewLive,
  type CameraFacing,
} from '../utils/mindar-scene';
import './ARViewer.css';

interface ARViewerProps {
  albumSlug: string;
  manifest: ViewerManifest;
}

type MindBundle = {
  url: string;
  cacheKey: string;
};

const AR_INIT_TIMEOUT_MS = 25_000;
const SCAN_HINT_DELAY_MS = 8_000;
const SCAN_NO_MATCH_DELAY_MS = 25_000;

const TARGET_FOUND_CONFIRM_MS = 800;

const waitForCameraPreview = async (
  host: HTMLElement,
  attempts = 15,
  delayMs = 300,
): Promise<boolean> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    ensureCameraPreviewVisible(host);
    if (isCameraPreviewLive(host)) return true;
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }
  return isCameraPreviewLive(host);
};

export const ARViewer = ({ albumSlug, manifest }: ARViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listenersAttachedRef = useRef(false);
  const targetFoundTimersRef = useRef<Map<number, number>>(new Map());
  const [status, setStatus] = useState<ScanOverlayMessage>('preparing');
  const [activeTarget, setActiveTarget] = useState<ViewerManifestTarget | null>(null);
  const [mindBundle, setMindBundle] = useState<MindBundle | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [progress, setProgress] = useState(0.05);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<CameraFacing>('environment');
  const [flipping, setFlipping] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const [prepareGeneration, setPrepareGeneration] = useState(0);
  const scanHintTimeoutRef = useRef<number | null>(null);
  const scanNoMatchTimeoutRef = useRef<number | null>(null);
  const scanTickRef = useRef<number | null>(null);
  const statusRef = useRef<ScanOverlayMessage>(status);
  const scanningEnabledRef = useRef(false);
  const deviceInfo = useMemo(() => detectDeviceInfo(), []);
  const sessionId = useMemo(() => getViewerSessionId(), []);

  const targets = useMemo(
    () => [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex),
    [manifest.targets],
  );

  const mindCacheTargets = useMemo(
    () => targets.map((target) => ({ id: target.id, photoMediaId: target.photoMediaId })),
    [targets],
  );

  const mindCacheKey = useMemo(
    () => getMindCacheKey(albumSlug, mindCacheTargets),
    [albumSlug, mindCacheTargets],
  );

  const trackingImageUrls = useMemo(
    () =>
      targets.map((target) =>
        viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId),
      ),
    [albumSlug, targets],
  );

  const activeVideoUrl = useMemo(() => {
    if (!activeTarget?.videoAvailable) return null;
    return viewerService.getMappingVideoUrl(
      albumSlug,
      activeTarget.id,
      activeTarget.videoMediaId,
    );
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
    void recordEvent(ScanEventType.VIEWER_OPEN);
  }, [recordEvent]);

  useEffect(() => {
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
  }, [albumSlug, mindCacheKey, mindCacheTargets, prepareGeneration, targets.length, trackingImageUrls]);

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
    listenersAttachedRef.current = false;
    scanningEnabledRef.current = false;

    const initScene = async () => {
      try {
        await loadArScripts();
        if (!mounted || !containerRef.current) return;

        const { scene, targetEntities } = buildMindArScene(host, {
          mindUrl: mindBundle.url,
          targetCount: targets.length,
          facingMode,
        });

        const confirmTargetMatch = (target: ViewerManifestTarget) => {
          if (!mounted) return;

          if (!scanningEnabledRef.current || !isCameraPreviewLive(host)) {
            return;
          }

          const current = statusRef.current;
          if (current !== 'scanning' && current !== 'move_closer') {
            return;
          }

          clearScanTimers();
          setProgress(1);
          setStatusDetail(null);

          if (!target.videoAvailable) {
            setStatus('video_unavailable');
            setStatusDetail('This mapping has no playable video file.');
            void recordEventRef.current(ScanEventType.SCAN_FAILED, target);
            return;
          }

          setActiveTarget(target);
          setStatus('match_found');
          void recordEventRef.current(ScanEventType.SCAN_SUCCESS, target);
        };

        const attachTargetListeners = () => {
          if (listenersAttachedRef.current) return;
          listenersAttachedRef.current = true;

          targets.forEach((target, mindIndex) => {
            const entity = targetEntities[mindIndex];
            if (!entity) return;

            entity.addEventListener('targetFound', () => {
              if (!mounted || !scanningEnabledRef.current) return;
              if (!isCameraPreviewLive(host)) return;

              const pending = targetFoundTimersRef.current.get(mindIndex);
              if (pending) window.clearTimeout(pending);

              const timer = window.setTimeout(() => {
                targetFoundTimersRef.current.delete(mindIndex);
                confirmTargetMatch(target);
              }, TARGET_FOUND_CONFIRM_MS);

              targetFoundTimersRef.current.set(mindIndex, timer);
            });

            entity.addEventListener('targetLost', () => {
              const pending = targetFoundTimersRef.current.get(mindIndex);
              if (pending) {
                window.clearTimeout(pending);
                targetFoundTimersRef.current.delete(mindIndex);
                return;
              }

              if (!mounted) return;
              setActiveTarget((current) => (current?.id === target.id ? null : current));
              setStatus('scanning');
              setStatusDetail(null);
              setProgress(0.92);
              startScanTimers();
            });
          });
        };

        attachTargetListeners();
        scene.addEventListener('loaded', attachTargetListeners, { once: true });

        cameraObserver = new MutationObserver(() => {
          ensureCameraPreviewVisible(host);
        });
        cameraObserver.observe(host, { childList: true, subtree: true });

        scene.addEventListener('arReady', () => {
          if (!mounted) return;
          ensureCameraPreviewVisible(host);

          const beginScanning = async () => {
            if (!mounted || !containerRef.current) return;

            const cameraLive = await waitForCameraPreview(containerRef.current);
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
            setStatusDetail(null);
            startScanTimers();
          };

          if (facingMode === 'user' && containerRef.current) {
            void flipMindArCamera(containerRef.current, 'user')
              .then(() => void beginScanning())
              .catch(() => void beginScanning());
            return;
          }

          void beginScanning();
        });

        scene.addEventListener('arError', (event) => {
          if (!mounted) return;
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
          ) return;
          if (!isCameraPreviewLive(host)) {
            setStatusDetail('Camera preview did not start. Tap flip camera or reload the page.');
            setStatus('camera_required');
            setProgress(0);
          }
        }, AR_INIT_TIMEOUT_MS);
      } catch (error) {
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
      targetFoundTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      targetFoundTimersRef.current.clear();
      clearScanTimers();
      cameraObserver?.disconnect();
      destroyMindArScene(host);
    };
  }, [
    albumSlug,
    mindBundle,
    mindCacheKey,
    mindCacheTargets,
    targets,
    sceneGeneration,
    facingMode,
    clearScanTimers,
    startScanTimers,
  ]);

  useEffect(() => {
    if (status !== 'scanning' && status !== 'move_closer') return undefined;
    setProgress((value) => Math.min(0.99, Math.max(value, 0.92 + scanSeconds * 0.002)));
    return undefined;
  }, [scanSeconds, status]);

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

  const handleRetryScan = () => {
    clearScanTimers();
    setStatusDetail(null);
    setPrepareError(null);
    setScanSeconds(0);
    setProgress(0.92);
    setActiveTarget(null);
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
    status === 'scanning' ||
    status === 'move_closer' ||
    status === 'loading' ||
    status === 'match_found' ||
    status === 'no_match' ||
    status === 'camera_required';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div ref={containerRef} className="ar-scene-host" />
      <VideoOverlay
        videoUrl={activeVideoUrl}
        fallbackUrl={activeVideoFallbackUrl}
        active={Boolean(
          activeTarget && activeVideoUrl && (status === 'match_found' || status === 'recognized'),
        )}
        showFrame={status === 'recognized'}
        onPlay={() => {
          setStatus('recognized');
          setStatusDetail(null);
          if (activeTarget) void recordEvent(ScanEventType.VIDEO_PLAY, activeTarget);
        }}
        onError={(message) => {
          setActiveTarget(null);
          setStatusDetail(message);
          const host = containerRef.current;
          if (host && isCameraPreviewLive(host)) {
            scanningEnabledRef.current = true;
            setStatus('scanning');
            setProgress(0.92);
            startScanTimers();
            return;
          }
          scanningEnabledRef.current = false;
          setStatus('video_unavailable');
        }}
      />
      <ScanStatusOverlay
        status={status}
        detail={prepareError ?? statusDetail}
        targets={targets}
        progress={progress}
        phase={viewerPhase}
        scanSeconds={scanSeconds}
      />
      <ViewerControlBar
        showFlip={showControls}
        showRetry={
          status === 'no_match' ||
          status === 'match_found' ||
          status === 'move_closer' ||
          status === 'camera_required' ||
          status === 'video_unavailable'
        }
        flipping={flipping}
        facingMode={facingMode}
        onFlip={() => void handleFlipCamera()}
        onRetry={handleRetryScan}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white transition-opacity ${
          activeTarget ? 'opacity-40' : 'opacity-100'
        }`}
      >
        <p className="text-lg font-semibold">{manifest.album.albumName}</p>
        {manifest.branding.studioName ? (
          <p className="text-sm text-white/80">{manifest.branding.studioName}</p>
        ) : null}
        <div className="mt-2 opacity-60">
          <BrandLogo variant="full" height={18} />
        </div>
      </div>
    </div>
  );
};
