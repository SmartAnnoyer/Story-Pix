import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import type { ViewerManifest } from '@/types/ar-target.types';
import { uniqueTrackingPhotos } from '../utils/manifest-photos';
import type { WarmupProgress } from '../utils/viewer-warmup';
import { ViewerBootLoader, type BootLoaderMode } from './ViewerBootLoader';
import './ViewerIntro.css';

interface ViewerWelcomeScreenProps {
  albumSlug: string;
  manifest: ViewerManifest | null;
  warmup: WarmupProgress;
  onStart: () => void | Promise<void>;
  starting?: boolean;
  /** Browser blocked auto camera — need a tap (common on iOS). */
  needsTap?: boolean;
}

const clampPercent = (progress: number) =>
  Math.min(100, Math.max(0, Math.round(progress > 1 ? progress : progress * 100)));

export const ViewerWelcomeScreen = ({
  manifest,
  warmup,
  onStart,
  starting = false,
  needsTap = false,
}: ViewerWelcomeScreenProps) => {
  const [heroVisible, setHeroVisible] = useState(false);

  const albumName = manifest?.album.albumName ?? 'Your album';
  const albumId = manifest?.album.id;
  const targets = useMemo(() => uniqueTrackingPhotos(manifest?.targets ?? []), [manifest?.targets]);
  const canStart = Boolean(targets.length) && warmup.ready && !warmup.error;
  const showProgress = !warmup.ready && warmup.stage !== 'error';
  const percent = clampPercent(warmup.progress);

  useEffect(() => {
    if (!albumId && !manifest) {
      setHeroVisible(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setHeroVisible(true), 60);
    return () => window.clearTimeout(timer);
  }, [albumId, manifest]);

  const bootMode: BootLoaderMode = starting
    ? 'starting'
    : needsTap && canStart
      ? 'tap'
      : canStart
        ? 'ready'
        : 'loading';

  const displayPercent =
    starting || bootMode === 'ready' || bootMode === 'tap' ? Math.max(percent, 92) : percent;

  const statusLine = warmup.error
    ? null
    : starting
      ? 'Opening camera…'
      : needsTap && canStart
        ? 'Tap anywhere to continue'
        : showProgress
          ? warmup.message || 'Loading your album…'
          : canStart
            ? 'Ready — tap to scan'
            : 'Getting your album ready…';

  const loaderStage = starting || canStart ? 'camera' : warmup.stage;

  return (
    <button
      type="button"
      className="viewer-intro viewer-intro--boot"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
      disabled={Boolean(warmup.error) || starting || !canStart}
      onClick={() => {
        if (!canStart || starting || warmup.error) return;
        void onStart();
      }}
    >
      <div className="viewer-intro-glow pointer-events-none absolute inset-0" />

      <div className="viewer-intro__body">
        <div className="viewer-intro__brand viewer-intro__brand--large">
          <BrandLogo variant="full" height={80} />
        </div>

        <div
          className={`viewer-intro__main transition-all duration-700 ease-out ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <p className="viewer-intro__eyebrow">Guest scan</p>
          <h1 className="viewer-intro__title">{albumName}</h1>

          {!warmup.error ? (
            <ViewerBootLoader
              percent={displayPercent}
              message={statusLine}
              stage={loaderStage === 'error' ? 'manifest' : loaderStage}
              mode={bootMode}
            />
          ) : null}

          {needsTap && canStart && !starting ? (
            <p className="viewer-intro__tap-hint">Tap to start scanning</p>
          ) : null}
        </div>

        <div className="viewer-intro__footer">
          {warmup.error ? (
            <p className="mb-3 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-100">
              {warmup.detail ?? warmup.error}
            </p>
          ) : (
            <p className="text-center text-[11px] leading-relaxed text-white/45">
              {showProgress
                ? 'Hold your printed photo ready.'
                : needsTap
                  ? 'Tap once to open the camera.'
                  : 'Point your phone at the printed photo.'}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};
