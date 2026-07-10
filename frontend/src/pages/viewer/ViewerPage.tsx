import { useEffect, useMemo, useState } from 'react';
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
import { getErrorMessage } from '@/api/client';
import { ViewerErrorState } from './ViewerErrorState';

const buildInitialWarmup = (albumSlug: string): WarmupProgress => {
  const cached = readCachedManifest(albumSlug);

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
  document.documentElement.classList.remove('viewer-route');
  document.getElementById('viewer-boot')?.remove();
};

export const ViewerPage = () => {
  const { albumSlug = '' } = useParams();
  const initialWarmup = useMemo(() => buildInitialWarmup(albumSlug), [albumSlug]);
  const [started, setStarted] = useState(false);
  const [warmup, setWarmup] = useState<WarmupProgress>(initialWarmup);

  useEffect(() => {
    preloadViewerScripts();
    dismissViewerBootSplash();
  }, []);

  useEffect(() => {
    if (!albumSlug) return undefined;

    bootstrapViewerRoute(albumSlug);
    setStarted(false);
    setWarmup(buildInitialWarmup(albumSlug));

    void startViewerWarmup(albumSlug, setWarmup).catch((error) => {
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
        onStart={() => setStarted(true)}
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
    />
  );
};
