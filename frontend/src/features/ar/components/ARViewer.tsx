import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScanOverlayMessage, ViewerManifest, ViewerManifestTarget } from '@/types/ar-target.types';
import { ScanEventType } from '@/types/ar-target.types';
import { detectDeviceInfo, getViewerSessionId, viewerService } from '@/services/viewer.service';
import { BrandLogo } from '@/components/BrandLogo';
import { ScanStatusOverlay } from './ScanStatusOverlay';
import { VideoOverlay } from './VideoOverlay';
import { ViewerControlBar } from './ViewerControlBar';
import type { ViewerPhase } from './ViewerProgressBar';
import { compileMindFile, getMindCacheKey, loadArScripts } from '../utils/mindar-loader';
import {
  buildMindArScene,
  destroyMindArScene,
  flipMindArCamera,
  isCameraPreviewLive,
  type CameraFacing,
} from '../utils/mindar-scene';
import './ARViewer.css';

interface ARViewerProps {
  albumSlug: string;
  manifest: ViewerManifest;
}

const AR_INIT_TIMEOUT_MS = 25_000;
const SCAN_HINT_DELAY_MS = 8_000;
const SCAN_NO_MATCH_DELAY_MS = 25_000;

export const ARViewer = ({ albumSlug, manifest }: ARViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ScanOverlayMessage>('preparing');
  const [activeTarget, setActiveTarget] = useState<ViewerManifestTarget | null>(null);
  const [mindUrl, setMindUrl] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [progress, setProgress] = useState(0.05);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<CameraFacing>('environment');
  const [flipping, setFlipping] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const scanHintTimeoutRef = useRef<number | null>(null);
  const scanNoMatchTimeoutRef = useRef<number | null>(null);
  const scanTickRef = useRef<number | null>(null);
  const statusRef = useRef<ScanOverlayMessage>(status);
  const deviceInfo = useMemo(() => detectDeviceInfo(), []);
  const sessionId = useMemo(() => getViewerSessionId(), []);

  const targets = useMemo(
    () => [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex),
    [manifest.targets],
  );

  const trackingImageUrls = useMemo(
    () => targets.map((target) => viewerService.getTrackingImageUrl(albumSlug, target.id)),
    [albumSlug, targets],
  );

  const viewerPhase: ViewerPhase = useMemo(() => {
    if (status === 'preparing') return 'preparing';
    if (status === 'loading') return 'loading';
    if (status === 'scanning' || status === 'move_closer') return 'scanning';
    if (status === 'recognized') return 'done';
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
        setStatusDetail('Photo not detected yet — move closer and keep the print steady.');
      }
    }, SCAN_HINT_DELAY_MS);

    scanNoMatchTimeoutRef.current = window.setTimeout(() => {
      setStatus('no_match');
      setStatusDetail(
        'No match after 25 seconds. Confirm you are scanning the mapped photo shown above.',
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
    let objectUrl: string | null = null;

    const prepareMindFile = async () => {
      if (!targets.length) {
        setStatus('no_targets');
        return;
      }

      setStatus('preparing');
      setPrepareError(null);
      setStatusDetail(null);
      setProgress(0.05);

      try {
        const cacheKey = getMindCacheKey(
          albumSlug,
          targets.map((target) => target.id),
        );
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) {
            setMindUrl(cached);
            setProgress(0.72);
            setStatus('loading');
          }
          return;
        }

        objectUrl = await compileMindFile(trackingImageUrls, (value) => {
          if (!cancelled) setProgress(value * 0.7);
        });
        sessionStorage.setItem(cacheKey, objectUrl);
        if (!cancelled) {
          setMindUrl(objectUrl);
          setProgress(0.72);
          setStatus('loading');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Story-pix AR] prepare failed:', error);
        sessionStorage.removeItem(
          getMindCacheKey(
            albumSlug,
            targets.map((target) => target.id),
          ),
        );
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
      if (objectUrl) {
        const cacheKey = getMindCacheKey(albumSlug, targets.map((t) => t.id));
        if (sessionStorage.getItem(cacheKey) !== objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    };
  }, [albumSlug, targets, trackingImageUrls]);

  useEffect(() => {
    if (status !== 'loading') return undefined;

    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(0.88, value + 0.02));
    }, 400);

    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!mindUrl || !containerRef.current) return undefined;

    let mounted = true;
    const host = containerRef.current;

    const initScene = async () => {
      try {
        await loadArScripts();
        if (!mounted || !containerRef.current) return;

        const scene = buildMindArScene(host, {
          mindUrl,
          targetCount: targets.length,
          facingMode,
        });

        scene.addEventListener('arReady', () => {
          if (!mounted) return;

          const beginScanning = () => {
            if (!mounted) return;
            setProgress(0.92);
            setStatus('scanning');
            setStatusDetail(null);
            startScanTimers();
          };

          if (facingMode === 'user' && containerRef.current) {
            void flipMindArCamera(containerRef.current, 'user')
              .then(beginScanning)
              .catch(() => beginScanning());
            return;
          }

          beginScanning();
        });

        scene.addEventListener('arError', () => {
          if (!mounted) return;
          setStatusDetail('MindAR could not access the camera. Allow camera permission and reload.');
          setStatus('camera_required');
          setProgress(0);
          void recordEventRef.current(ScanEventType.SCAN_FAILED, null);
        });

        targets.forEach((target, mindIndex) => {
          const entity = host.querySelector(`[mindar-image-target="targetIndex: ${mindIndex}"]`);
          entity?.addEventListener('targetFound', () => {
            if (!mounted) return;
            clearScanTimers();
            setStatusDetail(null);
            setProgress(1);
            if (!target.videoAvailable || !target.videoUrl) {
              setStatus('video_unavailable');
              setStatusDetail('This mapping has no playable video file.');
              void recordEventRef.current(ScanEventType.SCAN_FAILED, target);
              return;
            }
            setActiveTarget(target);
            setStatus('recognized');
            void recordEventRef.current(ScanEventType.SCAN_SUCCESS, target);
          });
          entity?.addEventListener('targetLost', () => {
            if (!mounted) return;
            setActiveTarget((current) => (current?.id === target.id ? null : current));
            setStatus('scanning');
            setProgress(0.92);
            startScanTimers();
          });
        });

        window.setTimeout(() => {
          if (!mounted) return;
          const current = statusRef.current;
          if (current === 'scanning' || current === 'recognized' || current === 'move_closer') return;
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
      clearScanTimers();
      destroyMindArScene(host);
    };
  }, [mindUrl, targets, sceneGeneration, facingMode, clearScanTimers, startScanTimers]);

  useEffect(() => {
    if (status !== 'scanning' && status !== 'move_closer') return undefined;
    setProgress((value) => Math.min(0.99, Math.max(value, 0.92 + scanSeconds * 0.002)));
    return undefined;
  }, [scanSeconds, status]);

  useEffect(() => {
    if (!mindUrl || status !== 'loading') return undefined;

    const timer = window.setTimeout(() => {
      setStatusDetail('Camera or AR scene did not start in time.');
      setStatus('camera_required');
      setProgress(0);
    }, AR_INIT_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [mindUrl, status]);

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

    if (containerRef.current && isCameraPreviewLive(containerRef.current)) {
      setStatus('scanning');
      startScanTimers();
      return;
    }

    setStatus('loading');
    setSceneGeneration((value) => value + 1);
  };

  const showControls =
    status === 'scanning' ||
    status === 'move_closer' ||
    status === 'loading' ||
    status === 'no_match' ||
    status === 'camera_required';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div ref={containerRef} className="ar-scene-host" />
      <VideoOverlay
        videoUrl={activeTarget?.videoUrl ?? null}
        visible={Boolean(activeTarget?.videoUrl)}
        onPlay={() => {
          if (activeTarget) void recordEvent(ScanEventType.VIDEO_PLAY, activeTarget);
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
        showRetry={status === 'no_match' || status === 'move_closer' || status === 'camera_required'}
        flipping={flipping}
        facingMode={facingMode}
        onFlip={() => void handleFlipCamera()}
        onRetry={handleRetryScan}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
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
