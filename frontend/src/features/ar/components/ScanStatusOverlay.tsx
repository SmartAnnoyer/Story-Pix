import type { ScanOverlayMessage } from '@/types/ar-target.types';
import type { ViewerPhase } from './ViewerProgressBar';
import './ScanStatusOverlay.css';

interface ScanStatusOverlayProps {
  status: ScanOverlayMessage;
  detail?: string | null;
  progress?: number;
  phase?: ViewerPhase;
  showRetry?: boolean;
  onRetry?: () => void;
}

type StatusTone = 'warn' | 'error' | 'info';

type StatusCopy = {
  title: string;
  body: string;
  tone: StatusTone;
  tips?: string[];
  action?: string;
};

const STATUS_COPY: Partial<Record<ScanOverlayMessage, StatusCopy>> = {
  no_match: {
    title: 'Need a fresh scan',
    body: 'Detection paused so you are not left waiting. Tap Try again to refresh and start again.',
    tone: 'warn',
    tips: [
      'Good lighting helps',
      'Fill the frame with the whole photo',
      'Hold steady after refresh',
    ],
    action: 'Try again',
  },
  camera_required: {
    title: 'Camera access needed',
    body: 'Allow camera permission in your browser, then try again.',
    tone: 'error',
    tips: ['Check the lock icon in the address bar', 'Refresh if permission was blocked'],
    action: 'Try again',
  },
  video_unavailable: {
    title: 'Video unavailable',
    body: 'This memory could not be loaded right now.',
    tone: 'error',
    tips: ['Check your connection', 'Try scanning the photo again'],
    action: 'Try again',
  },
  compile_failed: {
    title: 'Could not start AR',
    body: 'Something went wrong while preparing this album.',
    tone: 'error',
    action: 'Reload',
  },
  no_targets: {
    title: 'Album not ready',
    body: 'This album does not have scannable photos yet.',
    tone: 'info',
  },
  scans_exhausted: {
    title: 'Plays finished for this album',
    body: 'Every photo in this album has used its guest plays. Please contact your photo studio to renew.',
    tone: 'error',
    tips: ['Ask the studio that made this album', 'They can top up plays and restore access'],
  },
};

const FALLBACK_COPY: StatusCopy = {
  title: 'Something went wrong',
  body: 'Please try again in a moment.',
  tone: 'error',
  action: 'Try again',
};

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'warn') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M12 3.5 2.8 19.2a1 1 0 0 0 .87 1.5h16.66a1 1 0 0 0 .87-1.5L12 3.5Zm0 4.7 5.8 10H6.2L12 8.2Zm-1 4.3h2v4h-2v-4Zm0 5.5h2v2h-2v-2Z"
        />
      </svg>
    );
  }
  if (tone === 'info') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm-1.6 4.3h3.2v8h-3.2v-8Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 .01 20.01A10 10 0 0 0 12 2Zm0 5.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm-1.5 4.3h3v7h-3v-7Z"
      />
    </svg>
  );
}

export const ScanStatusOverlay = ({
  status,
  detail,
  showRetry = false,
  onRetry,
}: ScanStatusOverlayProps) => {
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

  const copy = STATUS_COPY[status] ?? FALLBACK_COPY;
  const showDetail =
    Boolean(detail) &&
    (status === 'compile_failed' ||
      status === 'camera_required' ||
      status === 'no_match' ||
      status === 'video_unavailable' ||
      status === 'scans_exhausted');

  const canRetry = Boolean(showRetry && onRetry && copy.action);

  return (
    <div className={`scan-status-overlay scan-status-overlay--${copy.tone}`} role="status">
      <div className="scan-status-sheet">
        <div className="scan-status-sheet__accent" aria-hidden />
        <div className="scan-status-sheet__header">
          <span className={`scan-status-sheet__icon scan-status-sheet__icon--${copy.tone}`}>
            <StatusIcon tone={copy.tone} />
          </span>
          <div className="scan-status-sheet__copy">
            <p className="scan-status-sheet__title">{copy.title}</p>
            <p className="scan-status-sheet__body">{copy.body}</p>
            {showDetail ? <p className="scan-status-sheet__detail">{detail}</p> : null}
          </div>
        </div>

        {copy.tips?.length ? (
          <ul className="scan-status-sheet__tips">
            {copy.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}

        {canRetry ? (
          <button type="button" className="scan-status-sheet__cta" onClick={onRetry}>
            <span className="scan-status-sheet__cta-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 5V2.2L8.4 5.8 12 9.4V6.6A5.4 5.4 0 1 1 6.6 12H4.8A7.2 7.2 0 1 0 12 5Z"
                />
              </svg>
            </span>
            {copy.action}
          </button>
        ) : null}
      </div>
    </div>
  );
};
