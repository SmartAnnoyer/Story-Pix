import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Result } from 'antd';
import { ARViewer } from '@/features/ar/components/ARViewer';
import { ViewerWelcomeScreen } from '@/features/ar/components/ViewerWelcomeScreen';
import {
  preloadViewerScripts,
  startViewerWarmup,
  type WarmupProgress,
} from '@/features/ar/utils/viewer-warmup';
import { getErrorMessage } from '@/api/client';

const INITIAL_WARMUP: WarmupProgress = {
  progress: 0.05,
  stage: 'manifest',
  message: 'Opening your album…',
  ready: false,
  error: null,
  manifest: null,
  mindBundle: null,
};

export const ViewerPage = () => {
  const { albumSlug = '' } = useParams();
  const [started, setStarted] = useState(false);
  const [warmup, setWarmup] = useState<WarmupProgress>(INITIAL_WARMUP);

  useEffect(() => {
    preloadViewerScripts();
  }, []);

  useEffect(() => {
    if (!albumSlug) return undefined;

    setStarted(false);
    setWarmup(INITIAL_WARMUP);

    void startViewerWarmup(albumSlug, setWarmup).catch((error) => {
      setWarmup((current) => ({
        ...current,
        stage: 'error',
        error: getErrorMessage(error, 'Unable to prepare viewer'),
        ready: false,
      }));
    });

    return undefined;
  }, [albumSlug]);

  if (warmup.stage === 'error' && !warmup.manifest) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black p-6">
        <Result status="404" title="Album unavailable" subTitle={warmup.error ?? 'This album is not published.'} />
      </div>
    );
  }

  if (!started) {
    return (
      <ViewerWelcomeScreen
        albumSlug={albumSlug}
        manifest={warmup.manifest}
        warmup={warmup}
        onStart={() => setStarted(true)}
      />
    );
  }

  if (!warmup.manifest?.targets.length) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black p-6">
        <Result
          status="warning"
          title="No AR mappings yet"
          subTitle="Publish at least one photo–video mapping for this album, then reopen this link."
        />
      </div>
    );
  }

  return (
    <ARViewer
      albumSlug={albumSlug}
      manifest={warmup.manifest}
      prefetchedMindBundle={warmup.mindBundle}
    />
  );
};
