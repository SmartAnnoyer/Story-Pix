import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ARViewer } from '@/features/ar/components/ARViewer';
import { ViewerWelcomeScreen } from '@/features/ar/components/ViewerWelcomeScreen';
import {
  bootstrapViewerRoute,
  preloadViewerScripts,
  startViewerWarmup,
  type WarmupProgress,
} from '@/features/ar/utils/viewer-warmup';
import { readCachedManifest } from '@/features/ar/utils/viewer-manifest-cache';
import { withViewerMediaProxies } from '@/features/ar/utils/viewer-media-proxy';
import {
  primeCameraPermission,
  releaseHeldCameraStream,
  unlockPlaybackAudio,
} from '@/features/ar/utils/camera-permission';
import type { CameraFacing } from '@/features/ar/utils/mindar-scene';
import { getErrorMessage } from '@/api/client';
import { ViewerErrorState } from './ViewerErrorState';
import { viewerLog } from '@/features/ar/utils/viewer-debug-log';

const buildInitialWarmup = (albumSlug: string): WarmupProgress => {
  const cachedRaw = readCachedManifest(albumSlug);
  const cached = cachedRaw ? withViewerMediaProxies(albumSlug, cachedRaw) : null;

  return {
    progress: cached ? 0.18 : 0.08,
    stage: 'manifest',
    message: cached ? `Welcome to ${cached.album.albumName}` : 'Opening your album…',
    detail: cached?.branding.studioName
      ? `A special experience from ${cached.branding.studioName}`
      : null,
    ready: false,
    error: null,
    manifest: cached,
    mindBundle: null,
  };
};

const dismissViewerBootSplash = () => {
  document.getElementById('viewer-boot')?.remove();
};

export const ViewerPage = () => {
  const { albumSlug = '' } = useParams();
  const initialWarmup = useMemo(() => buildInitialWarmup(albumSlug), [albumSlug]);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacing>('environment');
  const [warmup, setWarmup] = useState<WarmupProgress>(initialWarmup);
  const startLockRef = useRef(false);

  useEffect(() => {
    preloadViewerScripts();
    dismissViewerBootSplash();
    return undefined;
  }, []);

  useEffect(() => {
    if (!albumSlug) return undefined;

    viewerLog('info', `Viewer route boot: ${albumSlug}`);
    bootstrapViewerRoute(albumSlug);
    setStarted(false);
    setStarting(false);
    setNeedsTap(false);
    startLockRef.current = false;
    setWarmup(buildInitialWarmup(albumSlug));

    void startViewerWarmup(albumSlug, setWarmup).catch((error) => {
      viewerLog('error', 'warmup failed', getErrorMessage(error));
      setWarmup((current) => ({
        ...current,
        stage: 'error',
        error: getErrorMessage(error, 'Unable to prepare viewer'),
        message: 'Something went wrong',
        detail: getErrorMessage(error, 'Unable to prepare viewer'),
        ready: false,
      }));
    });

    return undefined;
  }, [albumSlug]);

  const handleStart = useCallback(
    async (fromUserGesture = false) => {
      if (startLockRef.current || started) return;
      startLockRef.current = true;
      setStarting(true);
      setNeedsTap(false);
      setWarmup((current) =>
        current.error && /camera|permission|denied/i.test(current.error)
          ? { ...current, error: null, detail: null }
          : current,
      );
      viewerLog('info', 'Starting camera — priming permission', { fromUserGesture });
      unlockPlaybackAudio();

      const permission = await primeCameraPermission('environment');
      if (!permission.ok) {
        releaseHeldCameraStream();
        startLockRef.current = false;
        setStarting(false);
        viewerLog('error', 'camera permission failed', permission.error);
        // Auto-start often fails without a tap (iOS). Keep loading UI + ask for a tap.
        setNeedsTap(true);
        if (fromUserGesture) {
          setWarmup((current) => ({
            ...current,
            error: permission.error,
            detail: permission.error,
          }));
        }
        return;
      }

      viewerLog('info', 'camera permission ok', { facingMode: permission.facingMode });
      setFacingMode(permission.facingMode);
      setStarted(true);
      setStarting(false);
      setNeedsTap(false);
    },
    [started],
  );

  // After warmup finishes, open camera automatically (loading UI stays until then).
  useEffect(() => {
    if (started || starting || startLockRef.current) return;
    if (!warmup.ready || warmup.error) return;
    if (!warmup.manifest?.targets.length) return;
    if (needsTap) return;

    viewerLog('info', 'Warmup ready — auto-opening camera', {
      targets: warmup.manifest?.targets.length ?? 0,
      uniquePhotos: new Set(warmup.manifest?.targets.map((t) => t.photoMediaId) ?? []).size,
      mindReady: Boolean(warmup.mindBundle),
    });
    void handleStart(false);
  }, [
    warmup.ready,
    warmup.error,
    warmup.manifest?.targets.length,
    warmup.mindBundle,
    started,
    starting,
    needsTap,
    handleStart,
  ]);

  if (warmup.stage === 'error' && !warmup.manifest) {
    return (
      <ViewerErrorState
        title="Album unavailable"
        message={warmup.error ?? 'This album is not published.'}
      />
    );
  }

  const manifest = warmup.manifest;
  const hasTargets = Boolean(manifest?.targets.length);

  if (!started) {
    return (
      <ViewerWelcomeScreen
        albumSlug={albumSlug}
        manifest={manifest}
        warmup={warmup}
        starting={starting}
        needsTap={needsTap}
        onStart={() => void handleStart(true)}
      />
    );
  }

  if (!hasTargets) {
    return (
      <ViewerErrorState
        variant="warning"
        title="No AR mappings yet"
        message="Publish at least one photo–video mapping for this album, then reopen this link."
      />
    );
  }

  return (
    <ARViewer
      albumSlug={albumSlug}
      manifest={manifest!}
      prefetchedMindBundle={warmup.mindBundle}
      initialFacingMode={facingMode}
    />
  );
};
