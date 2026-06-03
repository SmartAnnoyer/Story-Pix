import type { ScanOverlayMessage } from '@/types/ar-target.types';

interface ScanStatusOverlayProps {
  status: ScanOverlayMessage;
  detail?: string | null;
}

export const ScanStatusOverlay = ({ status, detail }: ScanStatusOverlayProps) => {
  if (status === 'idle' || status === 'recognized') {
    return null;
  }

  const message =
    status === 'scanning'
      ? 'Point camera at a printed photo'
      : status === 'preparing'
        ? 'Preparing AR targets...'
        : status === 'loading'
          ? 'Starting camera...'
          : status === 'compile_failed'
            ? 'Could not prepare AR — refresh and try again'
            : status === 'no_targets'
              ? 'No published photo mappings for this album'
              : status === 'move_closer'
                ? 'Move camera closer'
                : status === 'video_unavailable'
                  ? 'Video unavailable'
                  : status === 'camera_required'
                    ? 'Allow camera access (use Chrome/Safari on your phone)'
                    : 'Scanning...';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
      <div className="max-w-md rounded-2xl bg-black/70 px-4 py-2 text-center text-sm text-white backdrop-blur">
        <p className="mb-0">{message}</p>
        {status === 'compile_failed' && detail ? (
          <p className="mb-0 mt-1 text-xs text-white/70">{detail}</p>
        ) : null}
      </div>
    </div>
  );
};
