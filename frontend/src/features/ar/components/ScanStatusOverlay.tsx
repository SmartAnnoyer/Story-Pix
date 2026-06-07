import type { ScanOverlayMessage, ViewerManifestTarget } from '@/types/ar-target.types';
import { ViewerProgressBar, type ViewerPhase } from './ViewerProgressBar';

interface ScanStatusOverlayProps {
  status: ScanOverlayMessage;
  detail?: string | null;
  targets?: ViewerManifestTarget[];
  progress?: number;
  phase?: ViewerPhase;
  scanSeconds?: number;
}

const SCAN_FAILURE_REASONS = [
  'Use the exact mapped photo (printed or on another screen) — not the video.',
  'Fill the frame with the photo and hold steady for a few seconds.',
  'Improve lighting; avoid glare on glossy passport/laminated prints.',
  'Tap “Try again” or flip camera if the preview looks wrong.',
];

const statusToPhase = (status: ScanOverlayMessage): ViewerPhase => {
  if (status === 'preparing') return 'preparing';
  if (status === 'loading') return 'loading';
  if (status === 'scanning' || status === 'move_closer') return 'scanning';
  if (status === 'recognized') return 'done';
  if (status === 'compile_failed' || status === 'camera_required' || status === 'no_match') {
    return 'error';
  }
  return 'scanning';
};

export const ScanStatusOverlay = ({
  status,
  detail,
  targets = [],
  progress = 0,
  phase,
  scanSeconds = 0,
}: ScanStatusOverlayProps) => {
  if (status === 'idle' || status === 'recognized') {
    return null;
  }

  const viewerPhase = phase ?? statusToPhase(status);

  const targetLabel =
    targets.length === 1
      ? targets[0].targetName
      : targets.length > 1
        ? `${targets.length} mapped photos`
        : null;

  const message =
    status === 'scanning'
      ? targetLabel
        ? `Aim at: ${targetLabel}`
        : 'Aim at your mapped photo'
      : status === 'preparing'
        ? 'Setting up your AR experience'
        : status === 'loading'
          ? 'Activating camera…'
          : status === 'compile_failed'
            ? 'Could not prepare AR'
            : status === 'no_targets'
              ? 'No published mappings'
              : status === 'move_closer'
                ? 'Almost there — move a little closer'
                : status === 'no_match'
                  ? "We couldn't recognize the photo"
                  : status === 'video_unavailable'
                    ? 'Video unavailable for this mapping'
                    : status === 'camera_required'
                      ? 'Camera access needed'
                      : 'Working…';

  const showReasons = status === 'move_closer' || status === 'no_match';
  const showTargetHints =
    status === 'scanning' || status === 'move_closer' || status === 'loading' || status === 'no_match';
  const showProgress =
    status === 'preparing' || status === 'loading' || status === 'scanning' || status === 'move_closer';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 px-4 py-4 text-white shadow-2xl backdrop-blur-md">
        <p className="mb-0 text-center text-base font-semibold">{message}</p>

        {status === 'scanning' || status === 'move_closer' ? (
          <p className="mb-0 mt-1 text-center text-xs text-white/65">
            Hold the printed photo flat, fill most of the screen, and avoid glare. Video plays on the photo when matched.
          </p>
        ) : null}

        {showProgress ? (
          <div className="mt-4">
            <ViewerProgressBar phase={viewerPhase} progress={progress} scanSeconds={scanSeconds} />
          </div>
        ) : null}

        {showTargetHints && targets.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {targets.slice(0, 4).map((target) => {
              const preview = target.photoThumbnailUrl ?? target.photoUrl;
              return (
                <div key={target.id} className="flex flex-col items-center gap-1">
                  {preview ? (
                    <img
                      src={preview}
                      alt={target.targetName}
                      className="h-16 w-16 rounded-xl border-2 border-[#8A2BE2]/50 object-cover shadow-md"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-[10px]">
                      Photo
                    </div>
                  )}
                  <span className="max-w-[80px] truncate text-[10px] font-medium text-white/85">
                    {target.targetName}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {showReasons ? (
          <ul className="mb-0 mt-4 space-y-1.5 text-left text-xs leading-relaxed text-white/75">
            {SCAN_FAILURE_REASONS.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-[#FF4FA3]">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {(status === 'compile_failed' || status === 'camera_required' || status === 'no_match') && detail ? (
          <p className="mb-0 mt-3 rounded-lg bg-white/5 px-3 py-2 text-center text-xs text-amber-100/90">
            {detail}
          </p>
        ) : null}

        {status === 'no_match' ? (
          <p className="mb-0 mt-3 text-center text-xs text-white/60">
            Tap <strong className="text-white/90">Try again</strong> below or flip the camera.
          </p>
        ) : null}
      </div>
    </div>
  );
};
