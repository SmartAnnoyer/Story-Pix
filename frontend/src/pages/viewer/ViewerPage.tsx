import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Result, Spin } from 'antd';
import { ARViewer } from '@/features/ar/components/ARViewer';
import { ScanStatusOverlay } from '@/features/ar/components/ScanStatusOverlay';
import { viewerService } from '@/services/viewer.service';
import type { ViewerManifest } from '@/types/ar-target.types';
import { getErrorMessage } from '@/api/client';

export const ViewerPage = () => {
  const { albumSlug = '' } = useParams();
  const [manifest, setManifest] = useState<ViewerManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await viewerService.getManifest(albumSlug);
        if (!cancelled) setManifest(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load album viewer'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, [albumSlug]);

  if (loading) {
    return (
      <div className="relative flex h-[100dvh] items-center justify-center bg-black">
        <Spin size="large" />
        <ScanStatusOverlay status="loading" />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black p-6">
        <Result status="404" title="Album unavailable" subTitle={error ?? 'This album is not published.'} />
      </div>
    );
  }

  if (!manifest.targets.length) {
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

  return <ARViewer albumSlug={albumSlug} manifest={manifest} />;
};
