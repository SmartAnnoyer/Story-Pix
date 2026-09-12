import { useId } from 'react';
import { createPortal } from 'react-dom';
import './ScanFocusFrame.css';

export type ScanFocusPhase = 'scanning' | 'warming' | 'locking' | 'found' | 'nomatch';

interface ScanFocusFrameProps {
  visible: boolean;
  phase?: ScanFocusPhase;
}

export const ScanFocusFrame = ({ visible, phase = 'scanning' }: ScanFocusFrameProps) => {
  const reactId = useId().replace(/:/g, '');
  const gradId = `sp-frame-bolt-${reactId}`;
  const glowId = `sp-frame-bolt-glow-${reactId}`;

  if (!visible || typeof document === 'undefined') return null;

  const isBusy = phase === 'scanning' || phase === 'warming' || phase === 'locking';

  const badge =
    phase === 'locking'
      ? 'Loading video'
      : phase === 'warming'
        ? 'Photo detected — hold steady'
        : phase === 'nomatch'
          ? 'No match found'
          : 'Scanning';

  const footer =
    phase === 'locking'
      ? 'Fetching your story… keep the photo in frame'
      : phase === 'warming'
        ? 'Almost locked — hold still'
        : phase === 'nomatch'
          ? 'Try brighter light and fill the frame, then tap Try again'
          : 'Point at the printed photo and hold steady';

  return createPortal(
    <div
      className={`scan-focus-frame scan-focus-frame--portal scan-focus-frame--${phase}`}
      role="status"
      aria-live="polite"
      aria-label={badge}
    >
      <div className="scan-focus-frame__status">
        {isBusy ? <span className="scan-focus-frame__pulse" aria-hidden /> : null}
        <div className="scan-focus-frame__badge">
          <span className="scan-focus-frame__badge-label">{badge}</span>
          {isBusy ? (
            <span className="scan-focus-frame__dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          ) : null}
        </div>
      </div>

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
        <div className="scan-focus-frame__border" aria-hidden />

        {phase === 'locking' ? (
          <>
            <svg
              className="scan-focus-frame__bolt-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5b4cf0" stopOpacity="0" />
                  <stop offset="35%" stopColor="#6b2cdb" />
                  <stop offset="62%" stopColor="#e93a8a" />
                  <stop offset="82%" stopColor="#ff4fa3" />
                  <stop offset="100%" stopColor="#ffc233" />
                </linearGradient>
                <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="1.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect
                className="scan-focus-frame__bolt-track"
                x="2.5"
                y="2.5"
                width="95"
                height="95"
                rx="5"
                ry="5"
                pathLength="100"
              />
              <rect
                className="scan-focus-frame__bolt-stroke"
                x="2.5"
                y="2.5"
                width="95"
                height="95"
                rx="5"
                ry="5"
                pathLength="100"
                stroke={`url(#${gradId})`}
                filter={`url(#${glowId})`}
              />
            </svg>
            <div className="scan-focus-frame__orbit-ring" aria-hidden />
          </>
        ) : (
          <>
            <div className="scan-focus-frame__laser" aria-hidden>
              <i />
            </div>
            <div className="scan-focus-frame__grid" aria-hidden />
          </>
        )}
      </div>

      <p className="scan-focus-frame__footer">{footer}</p>
    </div>,
    document.body,
  );
};
