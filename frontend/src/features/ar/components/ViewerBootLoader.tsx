import type { WarmupStage } from '../utils/viewer-warmup';
import './ViewerBootLoader.css';

export type BootLoaderMode = 'loading' | 'starting' | 'ready' | 'tap';

interface ViewerBootLoaderProps {
  percent: number;
  message: string | null;
  stage?: WarmupStage | 'camera';
  mode: BootLoaderMode;
}

/** Radius math for SVG ring — viewBox 120, stroke centered on r=52. */
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export const ViewerBootLoader = ({ percent, message, mode }: ViewerBootLoaderProps) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const dashOffset = RING_C * (1 - clamped / 100);
  const showRingPulse = mode === 'starting' || mode === 'tap' || mode === 'ready';

  return (
    <div className={`viewer-boot-loader viewer-boot-loader--${mode}`} aria-live="polite">
      <div className="viewer-boot-loader__orb">
        <svg className="viewer-boot-loader__ring" viewBox="0 0 120 120" aria-hidden>
          <defs>
            <linearGradient id="sp-boot-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5B4CF0" />
              <stop offset="45%" stopColor="#6B2CDB" />
              <stop offset="100%" stopColor="#FF4FA3" />
            </linearGradient>
          </defs>
          <circle className="viewer-boot-loader__ring-track" cx="60" cy="60" r={RING_R} />
          <circle
            className={`viewer-boot-loader__ring-value${showRingPulse ? ' viewer-boot-loader__ring-value--pulse' : ''}`}
            cx="60"
            cy="60"
            r={RING_R}
            strokeDasharray={RING_C}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div className="viewer-boot-loader__core" aria-hidden>
          <span className="viewer-boot-loader__corner viewer-boot-loader__corner--tl" />
          <span className="viewer-boot-loader__corner viewer-boot-loader__corner--tr" />
          <span className="viewer-boot-loader__corner viewer-boot-loader__corner--bl" />
          <span className="viewer-boot-loader__corner viewer-boot-loader__corner--br" />
          <span className="viewer-boot-loader__photo" />
          <span className="viewer-boot-loader__play" />
          <span className="viewer-boot-loader__beam" />
        </div>
      </div>

      {message ? <p className="viewer-boot-loader__message">{message}</p> : null}
    </div>
  );
};
