import { useEffect, useMemo, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import type { ViewerManifest } from '@/types/ar-target.types';
import type { WarmupProgress } from '../utils/viewer-warmup';
import { MappingPreviewImage } from './MappingPreviewImage';
import './ViewerIntro.css';

interface ViewerWelcomeScreenProps {
  albumSlug: string;
  manifest: ViewerManifest | null;
  warmup: WarmupProgress;
  onStart: () => void;
}

const TIPS = [
  'Find the printed photo in your album — that is what you will scan.',
  'Good lighting helps. Avoid glare on glossy prints.',
  'When matched, video plays on the photo. Double-tap for full screen.',
  'Tap the speaker icon if you want sound.',
];

const INTRO_STEPS = ['Your album', 'AR magic', 'Ready to scan'] as const;

const clampPercent = (progress: number) =>
  Math.min(100, Math.max(0, Math.round(progress > 1 ? progress : progress * 100)));

export const ViewerWelcomeScreen = ({
  albumSlug,
  manifest,
  warmup,
  onStart,
}: ViewerWelcomeScreenProps) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  const albumName = manifest?.album.albumName ?? 'Your Story-pix Album';
  const studioName = manifest?.branding.studioName;
  const studioLogo = manifest?.branding.logoUrl;
  const cover = manifest?.album.coverImage;
  const description = manifest?.album.description;
  const targets = useMemo(
    () => [...(manifest?.targets ?? [])].sort((a, b) => a.targetIndex - b.targetIndex),
    [manifest?.targets],
  );
  const canStart = warmup.ready && Boolean(targets.length);
  const primaryTarget = targets[0] ?? null;

  const introStep = warmup.ready ? 2 : warmup.stage === 'targets' || warmup.stage === 'scripts' ? 1 : 0;
  const showProgress = !warmup.ready && warmup.stage !== 'error';
  const percent = clampPercent(warmup.progress);

  useEffect(() => {
    if (manifest) {
      const timer = window.setTimeout(() => setHeroVisible(true), 80);
      return () => window.clearTimeout(timer);
    }
    setHeroVisible(false);
    return undefined;
  }, [manifest?.album.id]);

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
            <span className="max-w-[45%] truncate text-right text-xs text-white/60">{studioName}</span>
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
              <div className="aspect-[4/3] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="mx-auto mt-4 h-6 w-3/4 animate-pulse rounded-lg bg-white/10" />
              <div className="mx-auto mt-2 h-4 w-1/2 animate-pulse rounded-lg bg-white/5" />
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

              {primaryTarget ? (
                <div className="mx-auto mb-5 flex flex-col items-center">
                  <div className="viewer-intro-frame relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-3 shadow-2xl">
                    <MappingPreviewImage
                      albumSlug={albumSlug}
                      target={primaryTarget}
                      size="lg"
                      className="!h-auto !w-full max-h-52 max-w-[260px] sm:max-w-[300px]"
                    />
                  </div>
                  <p className="mt-3 text-center text-sm font-medium text-[#FF4FA3]">
                    Scan this photo in your album
                  </p>
                  <p className="text-center text-xs text-white/60">{primaryTarget.targetName}</p>
                </div>
              ) : cover ? (
                <div className="viewer-intro-frame mx-auto mb-5 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                  <img src={cover} alt={albumName} className="h-full w-full object-cover" />
                </div>
              ) : null}

              <h1 className="mb-2 text-center text-2xl font-bold leading-tight sm:text-3xl">{albumName}</h1>

              {description ? (
                <p className="mx-auto mb-4 max-w-sm text-center text-sm leading-relaxed text-white/65">
                  {description}
                </p>
              ) : null}
            </>
          )}

          <div className="mb-5 text-center">
            <p className="text-base font-medium text-white/90">{warmup.message}</p>
            {warmup.detail ? (
              <p className="mt-1 text-sm text-white/55">{warmup.detail}</p>
            ) : null}
          </div>

          {targets.length > 1 ? (
            <div className="mb-5">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-white/45">
                {targets.length} interactive photos in this album
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {targets.slice(0, 6).map((target) => (
                  <div key={target.id} className="flex flex-col items-center gap-1">
                    <MappingPreviewImage albumSlug={albumSlug} target={target} size="sm" />
                    <span className="max-w-[72px] truncate text-center text-[10px] text-white/70">
                      {target.targetName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
            disabled={!canStart}
            onClick={onStart}
            className={`w-full rounded-2xl px-6 py-4 text-base font-semibold transition-all ${
              canStart
                ? 'viewer-intro-cta bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] text-white shadow-lg shadow-purple-900/40 active:scale-[0.98]'
                : 'cursor-wait bg-white/10 text-white/50'
            }`}
          >
            {canStart ? 'Start scanning' : 'Preparing your album…'}
          </button>

          <p className="mt-3 text-center text-[11px] text-white/45">
            {canStart
              ? 'Camera opens when you tap Start — have your printed photo ready.'
              : 'Setting things up in the background. This screen is your album preview.'}
          </p>
        </div>
      </div>
    </div>
  );
};
