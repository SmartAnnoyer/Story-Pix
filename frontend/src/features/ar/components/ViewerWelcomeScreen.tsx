import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import type { ViewerManifest } from '@/types/ar-target.types';
import { uniqueTrackingPhotos } from '../utils/manifest-photos';
import type { WarmupProgress } from '../utils/viewer-warmup';
import { ScanHowTo } from './ScanHowTo';
import './ViewerIntro.css';

interface ViewerWelcomeScreenProps {
  albumSlug: string;
  manifest: ViewerManifest | null;
  warmup: WarmupProgress;
  onStart: () => void | Promise<void>;
  starting?: boolean;
}

const clampPercent = (progress: number) =>
  Math.min(100, Math.max(0, Math.round(progress > 1 ? progress : progress * 100)));

export const ViewerWelcomeScreen = ({
  manifest,
  warmup,
  onStart,
  starting = false,
}: ViewerWelcomeScreenProps) => {
  const [heroVisible, setHeroVisible] = useState(false);

  const albumName = manifest?.album.albumName ?? 'Your album';
  const albumId = manifest?.album.id;
  const targets = useMemo(() => uniqueTrackingPhotos(manifest?.targets ?? []), [manifest?.targets]);
  const canOpenCamera = Boolean(targets.length) && !warmup.error;
  const showProgress = !warmup.ready && warmup.stage !== 'error';
  const percent = clampPercent(warmup.progress);

  useEffect(() => {
    if (!albumId) {
      setHeroVisible(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setHeroVisible(true), 80);
    return () => window.clearTimeout(timer);
  }, [albumId]);

  return (
    <div className="viewer-intro">
      <div className="viewer-intro-glow pointer-events-none absolute inset-0" />

      <div className="viewer-intro__body">
        <div className="viewer-intro__brand">
          <BrandLogo variant="full" height={26} />
        </div>

        <div
          className={`viewer-intro__main transition-all duration-700 ease-out ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {!manifest ? (
            <div className="w-full max-w-xs">
              <div className="aspect-square animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            </div>
          ) : (
            <>
              <div className="viewer-intro__howto">
                <ScanHowTo />
              </div>

              <h1 className="viewer-intro__title">{albumName}</h1>
            </>
          )}

          {showProgress ? (
            <div className="viewer-intro__progress">
              <p className="mb-2 text-center text-xs text-white/70">{warmup.message}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="viewer-intro__footer">
          {warmup.error ? (
            <p className="mb-3 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-100">
              {warmup.detail ?? warmup.error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canOpenCamera || starting}
            onClick={() => void onStart()}
            className={`w-full rounded-2xl px-6 py-3.5 text-base font-semibold transition-all ${
              canOpenCamera && !starting
                ? 'viewer-intro-cta bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] text-white shadow-lg shadow-purple-900/40 active:scale-[0.98]'
                : 'cursor-wait bg-white/10 text-white/50'
            }`}
          >
            {starting ? 'Allow camera…' : canOpenCamera ? 'Open camera' : 'Loading…'}
          </button>

          <p className="mt-2 text-center text-[11px] text-white/45">
            {starting
              ? 'Choose Allow when your phone asks for the camera.'
              : canOpenCamera
                ? 'Have the printed photo ready.'
                : 'Getting the album ready…'}
          </p>
        </div>
      </div>
    </div>
  );
};
