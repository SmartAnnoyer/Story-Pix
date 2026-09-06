import './ViewerProgressBar.css';

export type ViewerPhase = 'preparing' | 'loading' | 'scanning' | 'done' | 'error';

const PHASE_STEPS: { key: ViewerPhase; label: string }[] = [
  { key: 'preparing', label: 'Album' },
  { key: 'loading', label: 'Camera' },
  { key: 'scanning', label: 'Scan' },
];

interface ViewerProgressBarProps {
  phase: ViewerPhase;
  progress: number;
  scanSeconds?: number;
  statusLabel?: string;
}

const RING_R = 18;
const RING_C = 2 * Math.PI * RING_R;

export const ViewerProgressBar = ({
  phase,
  progress,
  scanSeconds: _scanSeconds = 0,
  statusLabel,
}: ViewerProgressBarProps) => {
  const activeIndex =
    phase === 'done' ? 3 : phase === 'error' ? -1 : PHASE_STEPS.findIndex((s) => s.key === phase);
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const dashOffset = RING_C * (1 - percent / 100);

  const label =
    phase === 'preparing'
      ? `Preparing… ${percent}%`
      : phase === 'loading'
        ? `Opening camera… ${percent}%`
        : phase === 'done'
          ? (statusLabel ?? 'Ready')
          : phase === 'error'
            ? 'Needs your attention'
            : `${percent}%`;

  return (
    <div className="viewer-progress">
      <div className="viewer-progress__row">
        <div className="viewer-progress__ring-wrap" aria-hidden>
          <svg className="viewer-progress__ring" viewBox="0 0 44 44">
            <defs>
              <linearGradient id="sp-overlay-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5B4CF0" />
                <stop offset="100%" stopColor="#FF4FA3" />
              </linearGradient>
            </defs>
            <circle className="viewer-progress__track" cx="22" cy="22" r={RING_R} />
            <circle
              className="viewer-progress__value"
              cx="22"
              cy="22"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="viewer-progress__pct">{percent}</span>
        </div>

        <div className="viewer-progress__copy">
          <p className="viewer-progress__label">{label}</p>
          <ol className="viewer-progress__steps">
            {PHASE_STEPS.map((step, index) => (
              <li
                key={step.key}
                className={
                  index < activeIndex
                    ? 'viewer-progress__step viewer-progress__step--done'
                    : index === activeIndex
                      ? 'viewer-progress__step viewer-progress__step--active'
                      : 'viewer-progress__step'
                }
              >
                {step.label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};
