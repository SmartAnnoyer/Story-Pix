import { BrandLogo } from '@/components/BrandLogo';
import type { ViewerManifest } from '@/types/ar-target.types';
import type { WarmupProgress } from '../utils/viewer-warmup';

interface ViewerWelcomeScreenProps {
  manifest: ViewerManifest | null;
  warmup: WarmupProgress;
  onStart: () => void;
}

const TIPS = [
  'Use the printed photo from your album — not a screen photo.',
  'Hold steady in good light for a few seconds.',
  'Video plays on the photo; double-tap for full screen.',
];

export const ViewerWelcomeScreen = ({ manifest, warmup, onStart }: ViewerWelcomeScreenProps) => {
  const albumName = manifest?.album.albumName ?? 'Your Story-pix Album';
  const studioName = manifest?.branding.studioName;
  const cover = manifest?.album.coverImage;
  const targets = manifest?.targets ?? [];
  const percent = Math.round(warmup.progress * 100);
  const canStart = warmup.ready && Boolean(manifest?.targets.length);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-[#1a0a2e] via-[#120818] to-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(138,43,226,0.25),_transparent_55%)]" />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-10">
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo variant="full" height={28} />
          {studioName ? (
            <span className="max-w-[45%] truncate text-right text-xs text-white/60">{studioName}</span>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-md flex-1">
          {cover ? (
            <div className="mx-auto mb-5 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <img src={cover} alt={albumName} className="h-full w-full object-cover" />
            </div>
          ) : null}

          <h1 className="mb-2 text-center text-2xl font-bold leading-tight sm:text-3xl">{albumName}</h1>
          <p className="mb-6 text-center text-sm text-white/70">
            {warmup.ready
              ? manifest?.mindFile?.url
                ? 'Your scan file is ready. Tap below and point your camera at your photo.'
                : 'Everything is ready. Tap below and point your camera at your photo.'
              : manifest?.mindFile?.url
                ? 'Loading your AR scanner…'
                : 'We are preparing your AR experience while you wait — no typing needed.'}
          </p>

          {targets.length > 0 ? (
            <div className="mb-6 flex flex-wrap justify-center gap-3">
              {targets.slice(0, 4).map((target) => {
                const preview = target.photoThumbnailUrl ?? target.photoUrl;
                return (
                  <div key={target.id} className="flex flex-col items-center gap-1">
                    {preview ? (
                      <img
                        src={preview}
                        alt={target.targetName}
                        className="h-14 w-14 rounded-xl border border-[#8A2BE2]/40 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-[10px]">
                        Photo
                      </div>
                    )}
                    <span className="max-w-[72px] truncate text-[10px] text-white/70">
                      {target.targetName}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-white/70">
              <span>{warmup.message}</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <ul className="mb-8 space-y-2 text-xs leading-relaxed text-white/65">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="text-[#FF4FA3]">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md">
          {warmup.error ? (
            <p className="mb-3 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-100">
              {warmup.error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            className={`w-full rounded-2xl px-6 py-4 text-base font-semibold transition-all ${
              canStart
                ? 'bg-gradient-to-r from-[#8A2BE2] to-[#FF4FA3] text-white shadow-lg shadow-purple-900/40 active:scale-[0.98]'
                : 'cursor-wait bg-white/10 text-white/50'
            }`}
          >
            {canStart ? 'Start scanning' : 'Getting ready…'}
          </button>

          <p className="mt-3 text-center text-[11px] text-white/45">
            Camera access is requested when you tap Start.
          </p>
        </div>
      </div>
    </div>
  );
};
