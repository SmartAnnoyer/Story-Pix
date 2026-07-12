import { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { AlbumStatus } from '@/types/album.types';
import './ArScanFileStatus.css';

interface ArScanFileStatusProps {
  status: AlbumStatus;
  ready: boolean;
  buildStatus?: string | null;
  progress?: number;
  message?: string | null;
  error?: string | null;
  compiledAt: string | null;
  buildStartedAt?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}

const STORY_BEATS = [
  {
    title: 'Teaching the camera your photos',
    detail: 'We map unique landmarks so guests can scan the printed page.',
  },
  {
    title: 'Building the magic layer',
    detail: 'This runs once on our servers — customers never wait for this step.',
  },
  {
    title: 'Almost print-ready',
    detail: 'When this finishes, your QR unlocks for printing and sharing.',
  },
];

const formatElapsed = (startedAt: string | null | undefined) => {
  if (!startedAt) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}m ${rem.toString().padStart(2, '0')}s`;
};

export const ArScanFileStatus = ({
  status,
  ready,
  buildStatus,
  progress = 0,
  message,
  error,
  compiledAt,
  buildStartedAt,
  onRetry,
  retrying = false,
}: ArScanFileStatusProps) => {
  const [beatIndex, setBeatIndex] = useState(0);
  const [elapsed, setElapsed] = useState(() => formatElapsed(buildStartedAt));

  const isBuilding = status === AlbumStatus.PUBLISHED && !ready && buildStatus !== 'failed';
  const isFailed = status === AlbumStatus.PUBLISHED && !ready && buildStatus === 'failed';

  useEffect(() => {
    if (!isBuilding) return undefined;
    const timer = window.setInterval(() => {
      setBeatIndex((current) => (current + 1) % STORY_BEATS.length);
      setElapsed(formatElapsed(buildStartedAt));
    }, 3500);
    return () => window.clearInterval(timer);
  }, [isBuilding, buildStartedAt]);

  const clampedProgress = useMemo(() => {
    if (ready) return 100;
    return Math.max(4, Math.min(99, Math.round(progress || 0)));
  }, [ready, progress]);

  const beat = STORY_BEATS[beatIndex];

  if (status !== AlbumStatus.PUBLISHED) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        Publish the album to build the customer scan file.
      </div>
    );
  }

  if (ready) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
        <p className="text-sm font-medium text-green-800">AR scan file ready</p>
        {compiledAt ? (
          <p className="mt-0.5 text-xs text-green-700">
            Built {new Date(compiledAt).toLocaleString()} — safe to print QR and share the link.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-green-700">Safe to print QR and share the link.</p>
        )}
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
        <p className="text-sm font-medium text-red-800">AR scan file failed</p>
        <p className="mt-1 text-xs text-red-700">
          {error ?? 'Something went wrong while building the scan file.'}
        </p>
        {onRetry ? (
          <Button
            size="small"
            type="primary"
            danger
            className="mt-3"
            loading={retrying}
            onClick={onRetry}
          >
            Retry build
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ar-scan-build">
      <div className="ar-scan-build-head">
        <div>
          <p className="ar-scan-build-title">{beat.title}</p>
          <p className="ar-scan-build-detail">{beat.detail}</p>
        </div>
        <div className="ar-scan-orb" aria-hidden="true" />
      </div>

      <div className="ar-scan-track">
        <div className="ar-scan-bar" style={{ width: `${clampedProgress}%` }} />
      </div>

      <div className="ar-scan-meta">
        <span>{message ?? 'Building AR scan file…'}</span>
        <span className="ar-scan-elapsed">
          {clampedProgress}%{elapsed ? ` · ${elapsed}` : ''}
        </span>
      </div>

      <p className="ar-scan-footnote">
        This usually takes 30–90 seconds depending on photo count. We do it once so wedding guests
        get an instant scan — not a long phone wait.
      </p>
    </div>
  );
};
