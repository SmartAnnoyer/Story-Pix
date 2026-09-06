import type { ScanOverlayMessage } from '@/types/ar-target.types';
import type { ViewerPhase } from './ViewerProgressBar';
import './ScanStatusOverlay.css';

interface ScanStatusOverlayProps {
  status: ScanOverlayMessage;
  detail?: string | null;
  progress?: number;
  phase?: ViewerPhase;
}

export const ScanStatusOverlay = ({ status, detail }: ScanStatusOverlayProps) => {
  // Hide routine setup/loading chrome — the welcome circle loader covers warmup.
  if (
    status === 'idle' ||
    status === 'recognized' ||
    status === 'scanning' ||
    status === 'move_closer' ||
    status === 'match_found' ||
    status === 'preparing' ||
    status === 'loading'
  ) {
    return null;
  }

  const message =
    status === 'compile_failed'
      ? 'Could not start'
      : status === 'no_targets'
        ? 'This album is not ready yet'
        : status === 'no_match'
          ? 'Having trouble finding the photo'
          : status === 'video_unavailable'
            ? 'Video unavailable'
            : status === 'camera_required'
              ? 'Camera access needed'
              : 'Something went wrong';

  const showDetail =
    Boolean(detail) &&
    (status === 'compile_failed' ||
      status === 'camera_required' ||
      status === 'no_match' ||
      status === 'video_unavailable');

  return (
    <div className="scan-status-overlay">
      <div className="scan-status-card">
        <p className="scan-status-card__title">{message}</p>
        {showDetail ? <p className="scan-status-card__sub">{detail}</p> : null}
      </div>
    </div>
  );
};
