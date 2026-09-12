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
  const showMeter = phase === 'scanning' || phase === 'warming' || phase === 'locking';

  const badge =
    phase === 'locking'
      ? holdSeconds >= 3
        ? 'Still loading — keep holding'
        : 'Photo found — loading video'
      : phase === 'nomatch'
        ? 'No match found'
        : isDetecting
          ? 'Detecting photo…'
          : 'Scanning…';

  const tip =
    phase === 'locking'
      ? holdSeconds >= 2
        ? 'Don’t move — video is buffering'
        : 'Hold steady until the video starts'
      : phase === 'nomatch'
        ? 'Try brighter light, fill the frame, then hold steady'
        : isDetecting
          ? 'Almost locked — keep the photo in the square'
          : 'Point at the printed photo and fill the square';

  const meterValue =
    phase === 'locking'
      ? Math.min(96, 55 + holdSeconds * 12)
      : isDetecting
        ? Math.max(clamped, 42)
        : clamped;

  // Keep scan chrome in the viewer UI layer (above `.ar-camera-slot`).
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
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <div className="scan-focus-frame__content">
        <div className="scan-focus-frame__badge">
          {phase === 'locking' ? (
            <span className="scan-focus-frame__spinner" aria-hidden />
          ) : (
            <span className="scan-focus-frame__badge-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          )}
          <span>{badge}</span>
        </div>

        {showMeter ? (
          <div
            className="scan-focus-frame__meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={meterValue}
            aria-label={phase === 'locking' ? 'Loading video' : 'Scan progress'}
          >
            <div className="scan-focus-frame__meter-fill" style={{ width: `${meterValue}%` }} />
          </div>
        ) : null}

        <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
          <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
          <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
          <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
          <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />

          <span className="scan-focus-frame__tick scan-focus-frame__tick--t" aria-hidden />
          <span className="scan-focus-frame__tick scan-focus-frame__tick--r" aria-hidden />
          <span className="scan-focus-frame__tick scan-focus-frame__tick--b" aria-hidden />
          <span className="scan-focus-frame__tick scan-focus-frame__tick--l" aria-hidden />

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
              <div className="scan-focus-frame__lock-pulse" aria-hidden />
            </>
          ) : (
            <>
              <div className="scan-focus-frame__scanline" aria-hidden />
              <div className="scan-focus-frame__radar" aria-hidden />
            </>
          )}
        </div>

        <p className="scan-focus-frame__tip">{tip}</p>
        {phase === 'locking' ? (
          <p className="scan-focus-frame__hold">Hold 2–5 seconds until playback starts</p>
        ) : null}
      </div>
    </div>
  );
};
