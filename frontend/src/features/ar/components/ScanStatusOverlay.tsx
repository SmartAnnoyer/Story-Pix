import type { ScanOverlayMessage, ViewerManifestTarget } from '@/types/ar-target.types';

interface ScanStatusOverlayProps {
  status: ScanOverlayMessage;
  detail?: string | null;
  targets?: ViewerManifestTarget[];
}

const SCAN_FAILURE_REASONS = [
  'Point at the same printed photo you used in the AR mapping (not the video).',
  'Hold steady — recognition usually takes 1–5 seconds when aligned.',
  'Move closer so the photo fills most of the screen.',
  'Use good lighting and avoid glare on glossy prints.',
];

export const ScanStatusOverlay = ({ status, detail, targets = [] }: ScanStatusOverlayProps) => {
  if (status === 'idle' || status === 'recognized') {
    return null;
  }

  const targetLabel =
    targets.length === 1
      ? targets[0].targetName
      : targets.length > 1
        ? `${targets.length} mapped photos`
        : null;

  const message =
    status === 'scanning'
      ? targetLabel
        ? `Point camera at: ${targetLabel}`
        : 'Point camera at your mapped photo'
      : status === 'preparing'
        ? 'Preparing AR (first visit may take up to a minute)...'
        : status === 'loading'
          ? 'Starting camera...'
          : status === 'compile_failed'
            ? 'Could not prepare AR — refresh and try again'
            : status === 'no_targets'
              ? 'No published photo mappings for this album'
              : status === 'move_closer'
                ? 'Still looking — try moving closer'
                : status === 'no_match'
                  ? 'Photo not recognized'
                  : status === 'video_unavailable'
                    ? 'Video unavailable for this mapping'
                    : status === 'camera_required'
                      ? 'Camera not available — allow access in browser settings'
                      : 'Scanning...';

  const showReasons = status === 'move_closer' || status === 'no_match';
  const showTargetHints = status === 'scanning' || status === 'move_closer' || status === 'no_match';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
      <div className="max-w-md rounded-2xl bg-black/75 px-4 py-3 text-center text-sm text-white backdrop-blur">
        <p className="mb-0 font-medium">{message}</p>

        {status === 'scanning' ? (
          <p className="mb-0 mt-1 text-xs text-white/70">
            When the photo matches, the video plays automatically (usually within a few seconds).
          </p>
        ) : null}

        {showTargetHints && targets.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {targets.slice(0, 4).map((target) => {
              const preview = target.photoThumbnailUrl ?? target.photoUrl;
              return (
                <div key={target.id} className="flex flex-col items-center gap-1">
                  {preview ? (
                    <img
                      src={preview}
                      alt={target.targetName}
                      className="h-14 w-14 rounded-lg border border-white/30 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-[10px]">
                      Photo
                    </div>
                  )}
                  <span className="max-w-[72px] truncate text-[10px] text-white/80">
                    {target.targetName}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {showReasons ? (
          <ul className="mb-0 mt-3 list-none space-y-1 text-left text-xs text-white/75">
            {SCAN_FAILURE_REASONS.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : null}

        {(status === 'compile_failed' || status === 'camera_required') && detail ? (
          <p className="mb-0 mt-2 text-xs text-white/70">{detail}</p>
        ) : null}

        {status === 'no_match' ? (
          <p className="mb-0 mt-2 text-xs text-amber-200/90">
            Tip: open the mapped photo on another phone or print it, then scan that screen/paper.
          </p>
        ) : null}
      </div>
    </div>
  );
};
