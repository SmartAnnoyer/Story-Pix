import { useEffect, useId, useState } from 'react';
import './ScanFocusFrame.css';

export type ScanFocusPhase = 'scanning' | 'warming' | 'locking' | 'found' | 'nomatch';

interface ScanFocusFrameProps {
  visible: boolean;
  phase?: ScanFocusPhase;
  /** 0–100 match confidence while scanning / detecting */
  progress?: number;
}

function useHoldSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return undefined;
    }
    setSeconds(0);
    const started = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  return seconds;
}

export const ScanFocusFrame = ({
  visible,
  phase = 'scanning',
  progress = 0,
}: ScanFocusFrameProps) => {
  const reactId = useId().replace(/:/g, '');
  const gradId = `sp-frame-bolt-${reactId}`;
  const glowId = `sp-frame-bolt-glow-${reactId}`;
  const holdSeconds = useHoldSeconds(visible && phase === 'locking');

  if (!visible) return null;

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const isDetecting = phase === 'warming' || (phase === 'scanning' && clamped >= 28);

  const title =
    phase === 'locking'
      ? holdSeconds >= 3
        ? 'Still loading'
        : 'Photo found'
      : phase === 'nomatch'
        ? 'No match found'
        : isDetecting
          ? 'Detecting'
          : 'Scanning';

  const subtitle =
    phase === 'locking'
      ? holdSeconds >= 2
        ? 'Keep holding — video is buffering'
        : 'Hold steady until the memory starts'
      : phase === 'nomatch'
        ? 'Brighter light · fill the frame · try again'
        : isDetecting
          ? 'Almost there — keep the photo in view'
          : 'Point your camera at the printed photo';

  return (
    <div
      className={`scan-focus-frame scan-focus-frame--${phase}${isDetecting ? ' scan-focus-frame--detecting' : ''}`}
      aria-live="polite"
      role="status"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 31,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        background: 'transparent',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <p className="scan-focus-frame__title">
        {phase === 'locking' ? (
          <span className="scan-focus-frame__spinner" aria-hidden />
        ) : (
          <span className="scan-focus-frame__pulse-dot" aria-hidden />
        )}
        <span className="scan-focus-frame__title-text">{title}</span>
        {phase === 'scanning' || phase === 'warming' || isDetecting ? (
          <span className="scan-focus-frame__ellipsis" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : null}
      </p>

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        {/* Corner brackets only — no full border, no fill */}
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
                className="scan-focus-frame__bolt-stroke"
                x="3"
                y="3"
                width="94"
                height="94"
                rx="4"
                ry="4"
                pathLength="100"
                fill="none"
                stroke={`url(#${gradId})`}
                filter={`url(#${glowId})`}
              />
            </svg>
          </>
        ) : (
          <div className="scan-focus-frame__scanline" aria-hidden />
        )}
      </div>

      <p className="scan-focus-frame__subtitle">{subtitle}</p>
      {phase === 'locking' ? <p className="scan-focus-frame__hold">Hold 2–5 seconds</p> : null}
    </div>
  );
};
