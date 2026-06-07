import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScanOverlayMessage, ViewerManifest, ViewerManifestTarget } from '@/types/ar-target.types';
import { ScanEventType } from '@/types/ar-target.types';
import { detectDeviceInfo, getViewerSessionId, viewerService } from '@/services/viewer.service';
import { BrandLogo } from '@/components/BrandLogo';
import { ScanStatusOverlay } from './ScanStatusOverlay';
import { VideoOverlay } from './VideoOverlay';
import { compileMindFile, getMindCacheKey, loadArScripts } from '../utils/mindar-loader';
import './ARViewer.css';

interface ARViewerProps {
  albumSlug: string;
  manifest: ViewerManifest;
}

const AR_INIT_TIMEOUT_MS = 25_000;
const SCAN_HINT_DELAY_MS = 12_000;
const SCAN_NO_MATCH_DELAY_MS = 30_000;

export const ARViewer = ({ albumSlug, manifest }: ARViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Element | null>(null);
  const [status, setStatus] = useState<ScanOverlayMessage>('preparing');
  const [activeTarget, setActiveTarget] = useState<ViewerManifestTarget | null>(null);
  const [mindUrl, setMindUrl] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const scanHintTimeoutRef = useRef<number | null>(null);
  const scanNoMatchTimeoutRef = useRef<number | null>(null);
  const deviceInfo = useMemo(() => detectDeviceInfo(), []);
  const sessionId = useMemo(() => getViewerSessionId(), []);

  const targets = useMemo(
    () => [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex),
    [manifest.targets],
  );

  const trackingImageUrls = useMemo(
    () =>
      targets.map((target) => viewerService.getTrackingImageUrl(albumSlug, target.id)),
    [albumSlug, targets],
  );

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

      try {
        const cacheKey = getMindCacheKey(
          albumSlug,
          targets.map((target) => target.id),
        );
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) {
            setMindUrl(cached);
            setStatus('loading');
          }
          return;
        }

        objectUrl = await compileMindFile(trackingImageUrls);
        sessionStorage.setItem(cacheKey, objectUrl);
        if (!cancelled) {
          setMindUrl(objectUrl);
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
          setStatus('compile_failed');
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
    if (!mindUrl || !containerRef.current) return;

    let mounted = true;
    const host = containerRef.current;

    const initScene = async () => {
      try {
        await loadArScripts();
        if (!mounted || !containerRef.current) return;

        host.replaceChildren();

        const scene = document.createElement('a-scene');
        scene.setAttribute(
          'mindar-image',
          `imageTargetSrc: ${mindUrl}; autoStart: true; maxTrack: ${Math.max(targets.length, 1)}; uiLoading: no; uiScanning: no; uiError: no;`,
        );
        scene.setAttribute('color-space', 'sRGB');
        scene.setAttribute('embedded', '');
        scene.setAttribute('renderer', 'alpha: true; colorManagement: true, physicallyCorrectLights');
        scene.setAttribute('vr-mode-ui', 'enabled: false');
        scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
        scene.style.position = 'absolute';
        scene.style.inset = '0';

        const camera = document.createElement('a-camera');
        camera.setAttribute('position', '0 0 0');
        camera.setAttribute('look-controls', 'enabled: false');
        scene.appendChild(camera);

        targets.forEach((_target, mindIndex) => {
          const entity = document.createElement('a-entity');
          entity.setAttribute('mindar-image-target', `targetIndex: ${mindIndex}`);
          scene.appendChild(entity);
        });

        host.appendChild(scene);
        sceneRef.current = scene;

        const isCameraLive = () => {
          const video = host.querySelector('video');
          return Boolean(video && video.videoWidth > 0 && !video.paused);
        };

        scene.addEventListener('arReady', () => {
          if (mounted) setStatus('scanning');
        });

        scene.addEventListener('arError', () => {
          if (!mounted) return;
          setStatusDetail('MindAR could not access the camera stream.');
          setStatus('camera_required');
          void recordEvent(ScanEventType.SCAN_FAILED, null);
        });

        targets.forEach((target, mindIndex) => {
          const entity = host.querySelector(`[mindar-image-target="targetIndex: ${mindIndex}"]`);
          entity?.addEventListener('targetFound', () => {
            if (!mounted) return;
            if (scanHintTimeoutRef.current) window.clearTimeout(scanHintTimeoutRef.current);
            if (scanNoMatchTimeoutRef.current) window.clearTimeout(scanNoMatchTimeoutRef.current);
            setStatusDetail(null);
            if (!target.videoAvailable || !target.videoUrl) {
              setStatus('video_unavailable');
              void recordEvent(ScanEventType.SCAN_FAILED, target);
              return;
            }
            setActiveTarget(target);
            setStatus('recognized');
            void recordEvent(ScanEventType.SCAN_SUCCESS, target);
          });
          entity?.addEventListener('targetLost', () => {
            if (!mounted) return;
            setActiveTarget((current) => (current?.id === target.id ? null : current));
            setStatus('scanning');
          });
        });

        window.setTimeout(() => {
          if (!mounted) return;
          if (!isCameraLive()) {
            setStatusDetail('Camera preview did not start. Check browser permissions and reload.');
            setStatus('camera_required');
          }
        }, AR_INIT_TIMEOUT_MS);
      } catch (error) {
        console.error('[Story-pix AR] scene init failed:', error);
        if (mounted) {
          setStatusDetail(error instanceof Error ? error.message : 'Scene failed to load');
          setStatus('camera_required');
        }
      }
    };

    void initScene();

    return () => {
      mounted = false;
      host.replaceChildren();
      sceneRef.current = null;
    };
  }, [mindUrl, targets, recordEvent]);

  useEffect(() => {
    if (!mindUrl || status !== 'loading') return;

    const timer = window.setTimeout(() => {
      setStatusDetail('Camera or AR scene did not start in time.');
      setStatus('camera_required');
    }, AR_INIT_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [mindUrl, status]);

  useEffect(() => {
    if (status !== 'scanning' && status !== 'move_closer') {
      if (scanHintTimeoutRef.current) window.clearTimeout(scanHintTimeoutRef.current);
      if (scanNoMatchTimeoutRef.current) window.clearTimeout(scanNoMatchTimeoutRef.current);
      return;
    }

    if (status === 'scanning') {
      scanHintTimeoutRef.current = window.setTimeout(() => {
        const video = containerRef.current?.querySelector('video');
        if (video && video.videoWidth > 0) {
          setStatus('move_closer');
        }
      }, SCAN_HINT_DELAY_MS);

      scanNoMatchTimeoutRef.current = window.setTimeout(() => {
        setStatus('no_match');
        void recordEvent(ScanEventType.SCAN_FAILED);
      }, SCAN_NO_MATCH_DELAY_MS);
    }

    return () => {
      if (scanHintTimeoutRef.current) window.clearTimeout(scanHintTimeoutRef.current);
      if (scanNoMatchTimeoutRef.current) window.clearTimeout(scanNoMatchTimeoutRef.current);
    };
  }, [status, recordEvent]);

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
      <ScanStatusOverlay status={status} detail={prepareError ?? statusDetail} targets={targets} />

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
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
