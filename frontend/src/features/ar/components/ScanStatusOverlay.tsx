import type { ScanOverlayMessage, ViewerManifestTarget } from '@/types/ar-target.types';
import { ViewerProgressBar, type ViewerPhase } from './ViewerProgressBar';
import './ScanStatusOverlay.css';

interface ScanStatusOverlayProps {
  albumSlug?: string;
  status: ScanOverlayMessage;
  detail?: string | null;
  targets?: ViewerManifestTarget[];
  progress?: number;
  phase?: ViewerPhase;
  scanSeconds?: number;
  matchPercent?: number;
  albumName?: string;
}

const SCAN_TIPS = [
  'Use the printed photo — not a video or screen glare.',
  'Move closer and hold the phone steady for a second.',
  'Bright, even light works best.',
];

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
  albumSlug = '',
  status,
  detail,
  targets = [],
  progress = 0,
  phase,
  scanSeconds: _scanSeconds = 0,
  matchPercent: _matchPercent = 0,
  albumName: _albumName,
}: ScanStatusOverlayProps) => {
  if (status === 'idle' || status === 'recognized') {
    return null;
  }

  const viewerPhase = phase ?? statusToPhase(status);

  // Active scan: focus frame shows the MemoriesX-style hint pill.
  if (status === 'scanning' || status === 'move_closer' || status === 'match_found') {
    return null;
  }

  const message =
    status === 'preparing'
      ? 'Setting up your experience'
      : status === 'loading'
        ? 'Starting camera…'
        : status === 'compile_failed'
          ? 'Could not prepare AR'
          : status === 'no_targets'
            ? 'No published mappings'
            : status === 'no_match'
              ? "We couldn't find your photo"
              : status === 'video_unavailable'
                ? 'Video unavailable'
                : status === 'camera_required'
                  ? 'Camera access needed'
                  : 'Working…';

  const showTips = status === 'no_match';
  const showSetupProgress = status === 'preparing' || status === 'loading';
  const showTargetHints = status === 'loading' && targets.length > 0 && albumSlug;

  return (
    <div className="scan-status-overlay">
      <div className="scan-status-card">
        <p className="scan-status-card__title">{message}</p>
        {detail &&
        (status === 'compile_failed' || status === 'camera_required' || status === 'no_match') ? (
          <p className="scan-status-card__sub">{detail}</p>
        ) : null}

        {showSetupProgress ? (
          <div className="mt-4">
            <ViewerProgressBar phase={viewerPhase} progress={progress} />
          </div>
        ) : null}

        {showTargetHints ? (
          <p className="scan-status-card__sub mt-3">
            {targets.length} printable photo{targets.length === 1 ? '' : 's'} ready to scan.
          </p>
        ) : null}

        {showTips ? (
          <ul className="scan-status-tips">
            {SCAN_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}

        {status === 'no_match' ? (
          <p className="scan-status-card__sub">Tap Try again below or flip the camera.</p>
        ) : null}
      </div>
    </div>
  );
};
