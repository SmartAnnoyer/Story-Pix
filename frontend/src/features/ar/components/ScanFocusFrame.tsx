import { useId } from 'react';
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

  if (!visible) return null;

  const badge =
    phase === 'locking'
      ? 'Hold steady — loading video'
      : phase === 'warming'
        ? 'Almost there'
        : phase === 'nomatch'
          ? 'No match found'
          : 'Point camera at your photo';

  return (
    <div className={`scan-focus-frame scan-focus-frame--${phase}`} aria-live="polite">
      <div className="scan-focus-frame__badge">{badge}</div>

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />

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
            <p className="scan-focus-frame__hint">Keep the photo filling the frame</p>
          </>
        ) : (
          <div className="scan-focus-frame__scanline" />
        )}
      </div>

      {phase === 'nomatch' ? (
        <p className="scan-focus-frame__nomatch">
          Try brighter light, fill the frame with the whole print, then hold steady.
        </p>
      ) : null}
    </div>
  );
};
