import type { ScanOverlayMessage } from '@/types/ar-target.types';
import { ViewerProgressBar, type ViewerPhase } from './ViewerProgressBar';
import './ScanStatusOverlay.css';

interface ScanStatusOverlayProps {
  status: ScanOverlayMessage;
  detail?: string | null;
  progress?: number;
  phase?: ViewerPhase;
}

const statusToPhase = (status: ScanOverlayMessage): ViewerPhase => {
  if (status === 'preparing') return 'preparing';
  if (status === 'loading') return 'loading';
  if (status === 'scanning' || status === 'move_closer') return 'scanning';
  if (status === 'match_found' || status === 'recognized') return 'done';
  if (status === 'compile_failed' || status === 'camera_required' || status === 'no_match') {
    return 'error';
  }
  return 'scanning';
};

export const ScanStatusOverlay = ({
  status,
  detail,
  progress = 0,
  phase,
}: ScanStatusOverlayProps) => {
  if (status === 'idle' || status === 'recognized') {
    return null;
  }

  const viewerPhase = phase ?? statusToPhase(status);

  if (status === 'scanning' || status === 'move_closer' || status === 'match_found') {
    return null;
  }

  const message =
    status === 'preparing'
      ? 'Getting ready…'
      : status === 'loading'
        ? 'Starting camera…'
        : status === 'compile_failed'
          ? 'Could not start'
          : status === 'no_targets'
            ? 'This album is not ready yet'
            : status === 'no_match'
              ? 'Point at the printed photo'
              : status === 'video_unavailable'
                ? 'Video unavailable'
                : status === 'camera_required'
                  ? 'Camera access needed'
                  : 'Working…';

  const showSetupProgress = status === 'preparing' || status === 'loading';

  return (
    <div className="scan-status-overlay">
      <div className="scan-status-card">
        <p className="scan-status-card__title">{message}</p>
        {detail && (status === 'compile_failed' || status === 'camera_required') ? (
          <p className="scan-status-card__sub">{detail}</p>
        ) : null}

        {showSetupProgress ? (
          <div className="mt-4">
            <ViewerProgressBar phase={viewerPhase} progress={progress} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
