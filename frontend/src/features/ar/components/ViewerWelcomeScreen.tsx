import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import type { ViewerManifest } from '@/types/ar-target.types';
import { uniqueTrackingPhotos } from '../utils/manifest-photos';
import type { WarmupProgress } from '../utils/viewer-warmup';
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

  const statusLine = warmup.error
    ? null
    : starting
      ? 'Allow camera access…'
      : needsTap && canStart
        ? 'Tap anywhere to start scanning'
        : showProgress
          ? warmup.message
          : canStart
            ? 'Opening camera…'
            : 'Getting your album ready…';

  return (
    <button
      type="button"
      className="viewer-intro viewer-intro--boot"
      disabled={Boolean(warmup.error) || starting || !canStart}
      onClick={() => {
        if (!canStart || starting || warmup.error) return;
        void onStart();
      }}
    >
      <div className="viewer-intro-glow pointer-events-none absolute inset-0" />

      <div className="viewer-intro__body">
        <div className="viewer-intro__brand viewer-intro__brand--large">
          <BrandLogo variant="full" height={48} />
        </div>

        <div
          className={`viewer-intro__main transition-all duration-700 ease-out ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <p className="viewer-intro__eyebrow">Guest scan</p>
          <h1 className="viewer-intro__title">{albumName}</h1>

          <div className="viewer-intro__scan-preview" aria-hidden>
            <span className="viewer-intro__corner viewer-intro__corner--tl" />
            <span className="viewer-intro__corner viewer-intro__corner--tr" />
            <span className="viewer-intro__corner viewer-intro__corner--bl" />
            <span className="viewer-intro__corner viewer-intro__corner--br" />
            <span className="viewer-intro__scanline" />
          </div>

          <p className="viewer-intro__badge">Point camera at your photo</p>

          {showProgress || starting || (canStart && !needsTap) ? (
            <div className="viewer-intro__progress">
              <p className="mb-2 text-center text-xs text-white/70">{statusLine}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] transition-all duration-700 ease-out"
                  style={{
                    width: `${starting || (canStart && !needsTap) ? Math.max(percent, 92) : percent}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {needsTap && canStart && !starting ? (
            <p className="viewer-intro__tap-hint">{statusLine}</p>
          ) : null}
        </div>

        <div className="viewer-intro__footer">
          {warmup.error ? (
            <p className="mb-3 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-100">
              {warmup.detail ?? warmup.error}
            </p>
          ) : (
            <p className="text-center text-[11px] text-white/45">
              {showProgress
                ? 'Preparing your stories — camera opens next.'
                : needsTap
                  ? 'Your browser needs one tap to open the camera.'
                  : 'Have the printed photo ready.'}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};
