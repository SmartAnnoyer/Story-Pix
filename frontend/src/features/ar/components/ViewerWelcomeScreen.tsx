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
}

const TIPS = [
  'Point your camera at the printed photo in your album.',
  'Good lighting helps. Avoid glare on glossy prints.',
  'Tap the speaker icon if you want sound.',
];

const INTRO_STEPS = ['Your album', 'AR magic', 'Ready to scan'] as const;

const clampPercent = (progress: number) =>
  Math.min(100, Math.max(0, Math.round(progress > 1 ? progress : progress * 100)));

export const ViewerWelcomeScreen = ({
  manifest,
  warmup,
  onStart,
  starting = false,
}: ViewerWelcomeScreenProps) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  const albumName = manifest?.album.albumName ?? 'Your Story-pix Album';
  const studioName = manifest?.branding.studioName;
  const studioLogo = manifest?.branding.logoUrl;
  const description = manifest?.album.description;
  const targets = useMemo(() => uniqueTrackingPhotos(manifest?.targets ?? []), [manifest?.targets]);
  const canOpenCamera = Boolean(targets.length) && !warmup.error;
  const scanFileReady = warmup.ready && Boolean(warmup.mindBundle);

  const introStep = warmup.ready
    ? 2
    : warmup.stage === 'targets' || warmup.stage === 'scripts'
      ? 1
      : 0;
  const showProgress = !warmup.ready && warmup.stage !== 'error';
  const percent = clampPercent(warmup.progress);

  useEffect(() => {
    if (manifest) {
      const timer = window.setTimeout(() => setHeroVisible(true), 80);
      return () => window.clearTimeout(timer);
    }
    setHeroVisible(false);
    return undefined;
  }, [manifest?.album.id, manifest]);

  useEffect(() => {
    if (warmup.ready) return undefined;
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % TIPS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [warmup.ready]);

  return (
    <div className="viewer-intro relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-[#1a0a2e] via-[#120818] to-black text-white">
      <div className="viewer-intro-glow pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-10">
        <div className="mb-5 flex items-center justify-between">
          <BrandLogo variant="full" height={28} />
          {studioName ? (
            <span className="max-w-[45%] truncate text-right text-xs text-white/60">
              {studioName}
            </span>
          ) : null}
        </div>

        <div className="mx-auto mb-6 flex w-full max-w-md justify-center gap-2">
          {INTRO_STEPS.map((label, index) => (
            <div
              key={label}
              className={`flex flex-1 flex-col items-center gap-1 transition-opacity duration-500 ${
                index <= introStep ? 'opacity-100' : 'opacity-35'
              }`}
            >
              <div
                className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
                  index <= introStep
                    ? 'bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3]'
                    : 'bg-white/15'
                }`}
              />
              <span className="text-[10px] font-medium text-white/70">{label}</span>
            </div>
          ))}
        </div>

        <div
          className={`mx-auto w-full max-w-md flex-1 transition-all duration-700 ease-out ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {!manifest ? (
            <div className="mx-auto mb-6 max-w-xs">
              <div className="aspect-square animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="mx-auto mt-4 h-6 w-3/4 animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : (
            <>
              {studioLogo ? (
                <div className="mb-4 flex justify-center">
                  <img
                    src={studioLogo}
                    alt={studioName ?? 'Studio'}
                    className="h-10 max-w-[140px] object-contain opacity-90"
                  />
                </div>
              ) : null}

              <div className="mx-auto mb-5 flex flex-col items-center">
                <span className="viewer-intro__badge mb-4">Point camera at your photo</span>
                <div className="viewer-intro__scan-preview" aria-hidden>
                  <span className="viewer-intro__corner viewer-intro__corner--tl" />
                  <span className="viewer-intro__corner viewer-intro__corner--tr" />
                  <span className="viewer-intro__corner viewer-intro__corner--bl" />
                  <span className="viewer-intro__corner viewer-intro__corner--br" />
                  <span className="viewer-intro__scanline" />
                </div>
              </div>

              <h1 className="mb-2 text-center text-2xl font-bold leading-tight sm:text-3xl">
                {albumName}
              </h1>

              {description ? (
                <p className="mx-auto mb-4 max-w-sm text-center text-sm leading-relaxed text-white/65">
                  {description}
                </p>
              ) : null}
            </>
          )}

          <div className="mb-5 text-center">
            <p className="text-base font-medium text-white/90">{warmup.message}</p>
            {warmup.detail ? <p className="mt-1 text-sm text-white/55">{warmup.detail}</p> : null}
          </div>

          {targets.length > 0 ? (
            <p className="mb-5 text-center text-xs font-medium uppercase tracking-wide text-white/45">
              {targets.length} printable photo{targets.length === 1 ? '' : 's'} in this album
            </p>
          ) : null}

          {showProgress ? (
            <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
            <p className="mb-0 text-xs leading-relaxed text-white/70 transition-opacity duration-500">
              {TIPS[tipIndex]}
            </p>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md">
          {warmup.error ? (
            <p className="mb-3 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-100">
              {warmup.detail ?? warmup.error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canOpenCamera || starting}
            onClick={() => void onStart()}
            className={`w-full rounded-2xl px-6 py-4 text-base font-semibold transition-all ${
              canOpenCamera && !starting
                ? 'viewer-intro-cta bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] text-white shadow-lg shadow-purple-900/40 active:scale-[0.98]'
                : 'cursor-wait bg-white/10 text-white/50'
            }`}
          >
            {starting
              ? 'Allow camera…'
              : canOpenCamera
                ? scanFileReady
                  ? 'Open camera'
                  : 'Open camera (still preparing…)'
                : 'Loading album…'}
          </button>

          <p className="mt-3 text-center text-[11px] text-white/45">
            {starting
              ? 'Your browser will ask for camera permission — choose Allow.'
              : canOpenCamera
                ? scanFileReady
                  ? 'Camera opens on this tap — have your printed photo ready.'
                  : 'Camera opens now. Scan data may finish loading in the background.'
                : 'Getting your album ready…'}
          </p>
        </div>
      </div>
    </div>
  );
};
