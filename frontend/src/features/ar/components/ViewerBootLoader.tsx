import { useId } from 'react';
import './ViewerBootLoader.css';

export type BootLoaderMode = 'loading' | 'starting' | 'ready' | 'tap';

interface ViewerBootLoaderProps {
  percent: number;
  message: string | null;
  stage?: string;
  mode: BootLoaderMode;
}

export const ViewerBootLoader = ({ percent, message, mode }: ViewerBootLoaderProps) => {
  const reactId = useId().replace(/:/g, '');
  const gradId = `sp-boot-grad-${reactId}`;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const spinning = mode === 'loading' || mode === 'starting';

  return (
    <div className={`viewer-boot-loader viewer-boot-loader--${mode}`} aria-live="polite">
      <div
        className={`viewer-boot-loader__orb${spinning ? ' viewer-boot-loader__orb--spinning' : ''}`}
      >
        {/* CSS lightning halo — reliable on mobile Safari */}
        <span className="viewer-boot-loader__halo" aria-hidden />
        <span className="viewer-boot-loader__halo-glow" aria-hidden />

        <svg className="viewer-boot-loader__ring" viewBox="0 0 120 120" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5B4CF0" />
              <stop offset="40%" stopColor="#6B2CDB" />
              <stop offset="72%" stopColor="#E93A8A" />
              <stop offset="100%" stopColor="#FFC233" />
            </linearGradient>
          </defs>
          <circle className="viewer-boot-loader__ring-track" cx="60" cy="60" r="52" />
          {!spinning ? (
            <circle
              className="viewer-boot-loader__ring-value"
              cx="60"
              cy="60"
              r="52"
              stroke={`url(#${gradId})`}
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - clamped / 100)}
            />
          ) : null}
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

        {spinning || clamped > 0 ? (
          <div className="viewer-boot-loader__percent">
            <span className="viewer-boot-loader__percent-num">{clamped}</span>
            <span className="viewer-boot-loader__percent-unit">%</span>
          </div>
        ) : null}
      </div>

      {message ? <p className="viewer-boot-loader__message">{message}</p> : null}
      {spinning ? <p className="viewer-boot-loader__sub">Preparing your scan…</p> : null}
    </div>
  );
};
