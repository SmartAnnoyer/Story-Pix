import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScanOverlayMessage, ViewerManifest, ViewerManifestTarget } from '@/types/ar-target.types';
import { ScanEventType } from '@/types/ar-target.types';
import { detectDeviceInfo, getViewerSessionId, viewerService } from '@/services/viewer.service';
import { BrandLogo } from '@/components/BrandLogo';
import { ScanStatusOverlay } from './ScanStatusOverlay';
import { VideoOverlay } from './VideoOverlay';
import { compileMindFile, getMindCacheKey, loadArScripts } from '../utils/mindar-loader';

interface ARViewerProps {
  albumSlug: string;
  manifest: ViewerManifest;
}

const AR_INIT_TIMEOUT_MS = 20_000;

export const ARViewer = ({ albumSlug, manifest }: ARViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Element | null>(null);
  const [status, setStatus] = useState<ScanOverlayMessage>('preparing');
  const [activeTarget, setActiveTarget] = useState<ViewerManifestTarget | null>(null);
  const [mindUrl, setMindUrl] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
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

    const initScene = async () => {
      try {
        await loadArScripts();
        if (!mounted || !containerRef.current) return;

        containerRef.current.innerHTML = `
          <a-scene
            mindar-image="imageTargetSrc: ${mindUrl}; autoStart: true; uiLoading: no; uiScanning: no; uiError: no;"
            color-space="sRGB"
            embedded
            renderer="colorManagement: true, physicallyCorrectLights"
            vr-mode-ui="enabled: false"
            device-orientation-permission-ui="enabled: false"
            style="position:absolute; inset:0;"
          >
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
            ${targets
              .map(
                (target) =>
                  `<a-entity mindar-image-target="targetIndex: ${target.targetIndex}"></a-entity>`,
              )
              .join('')}
          </a-scene>
        `;

        const scene = containerRef.current.querySelector('a-scene');
        sceneRef.current = scene;

        scene?.addEventListener('arReady', () => {
          if (mounted) setStatus('scanning');
        });

        scene?.addEventListener('arError', () => {
          if (mounted) {
            setStatus('camera_required');
            void recordEvent(ScanEventType.SCAN_FAILED, null);
          }
        });

        targets.forEach((target) => {
          const entity = containerRef.current?.querySelector(
            `[mindar-image-target="targetIndex: ${target.targetIndex}"]`,
          );
          entity?.addEventListener('targetFound', () => {
            if (!mounted) return;
            if (scanTimeoutRef.current) window.clearTimeout(scanTimeoutRef.current);
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
      } catch {
        if (mounted) setStatus('camera_required');
      }
    };

    void initScene();

    return () => {
      mounted = false;
      if (containerRef.current) containerRef.current.innerHTML = '';
      sceneRef.current = null;
    };
  }, [mindUrl, targets, recordEvent]);

  useEffect(() => {
    if (!mindUrl || status !== 'loading') return;

    const timer = window.setTimeout(() => {
      setStatus('camera_required');
    }, AR_INIT_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [mindUrl, status]);

  useEffect(() => {
    if (status !== 'scanning') {
      if (scanTimeoutRef.current) window.clearTimeout(scanTimeoutRef.current);
      return;
    }

    scanTimeoutRef.current = window.setTimeout(() => {
      setStatus('move_closer');
      void recordEvent(ScanEventType.SCAN_FAILED);
    }, 12000);

    return () => {
      if (scanTimeoutRef.current) window.clearTimeout(scanTimeoutRef.current);
    };
  }, [status, recordEvent]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <VideoOverlay
        videoUrl={activeTarget?.videoUrl ?? null}
        visible={Boolean(activeTarget?.videoUrl)}
        onPlay={() => {
          if (activeTarget) void recordEvent(ScanEventType.VIDEO_PLAY, activeTarget);
        }}
      />
      <ScanStatusOverlay status={status} detail={prepareError} />

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
