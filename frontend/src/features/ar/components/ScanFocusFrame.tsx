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

const VIEW = 100;
const CORNER = 18;
const STROKE = 3.2;

/** L-brackets drawn in SVG so corners always paint even if CSS fails. */
function CornerBrackets({ detecting }: { detecting: boolean }) {
  const c = detecting ? '#a78bfa' : '#ff4fa3';
  const c2 = detecting ? '#6b2cdb' : '#5b4cf0';
  const common = {
    fill: 'none' as const,
    strokeWidth: STROKE,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  };

  return (
    <g aria-hidden>
      {/* TL */}
      <path d={`M ${STROKE} ${CORNER} V ${STROKE} H ${CORNER}`} stroke={c2} {...common} />
      {/* TR */}
      <path
        d={`M ${VIEW - CORNER} ${STROKE} H ${VIEW - STROKE} V ${CORNER}`}
        stroke={c}
        {...common}
      />
      {/* BL */}
      <path
        d={`M ${STROKE} ${VIEW - CORNER} V ${VIEW - STROKE} H ${CORNER}`}
        stroke={c}
        {...common}
      />
      {/* BR */}
      <path
        d={`M ${VIEW - CORNER} ${VIEW - STROKE} H ${VIEW - STROKE} V ${VIEW - CORNER}`}
        stroke={c2}
        {...common}
      />
    </g>
  );
}

export const ScanFocusFrame = ({
  visible,
  phase = 'scanning',
  progress = 0,
}: ScanFocusFrameProps) => {
  const reactId = useId().replace(/:/g, '');
  const gradId = `sp-scan-line-${reactId}`;
  const boltGradId = `sp-bolt-${reactId}`;
  const holdSeconds = useHoldSeconds(visible && phase === 'locking');

  if (!visible) return null;

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const isDetecting = phase === 'warming' || (phase === 'scanning' && clamped >= 28);
  const locking = phase === 'locking';

  const title = locking
    ? holdSeconds >= 3
      ? 'Still loading'
      : 'Photo found'
    : phase === 'nomatch'
      ? 'No match found'
      : isDetecting
        ? 'Detecting'
        : 'Scanning';

  const subtitle = locking
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
    >
      <div className="scan-focus-frame__title">
        <span className="scan-focus-frame__live-dot" aria-hidden />
        <span className="scan-focus-frame__title-label">{title}</span>
        {!locking && phase !== 'nomatch' ? (
          <span className="scan-focus-frame__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : null}
      </div>

      <div className="scan-focus-frame__viewfinder">
        <svg
          className="scan-focus-frame__svg"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5b4cf0" stopOpacity="0" />
              <stop offset="20%" stopColor="#6b2cdb" />
              <stop offset="50%" stopColor="#e93a8a" />
              <stop offset="80%" stopColor="#ffc233" />
              <stop offset="100%" stopColor="#ffc233" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={boltGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5b4cf0" stopOpacity="0" />
              <stop offset="40%" stopColor="#6b2cdb" />
              <stop offset="70%" stopColor="#e93a8a" />
              <stop offset="100%" stopColor="#ffc233" />
            </linearGradient>
            <filter id={`${reactId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Transparent center — no fill rect */}
          <CornerBrackets detecting={isDetecting || locking} />

          {locking ? (
            <rect
              className="scan-focus-frame__bolt"
              x="4"
              y="4"
              width="92"
              height="92"
              rx="3"
              ry="3"
              fill="none"
              stroke={`url(#${boltGradId})`}
              strokeWidth="2.6"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray="16 84"
              filter={`url(#${reactId}-glow)`}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-100"
                dur="1.15s"
                repeatCount="indefinite"
              />
            </rect>
          ) : (
            <g filter={`url(#${reactId}-glow)`}>
              {/* Soft trail */}
              <rect x="14" width="72" height="14" rx="2" fill="#e93a8a" opacity="0.18">
                <animate
                  attributeName="y"
                  values="8;78;8"
                  dur="2.05s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                  keyTimes="0;0.5;1"
                />
              </rect>
              {/* Bright laser line */}
              <rect x="12" width="76" height="2.4" rx="1.2" fill={`url(#${gradId})`}>
                <animate
                  attributeName="y"
                  values="12;88;12"
                  dur="2.05s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                  keyTimes="0;0.5;1"
                />
              </rect>
            </g>
          )}
        </svg>
      </div>

      <p className="scan-focus-frame__subtitle">{subtitle}</p>
      {locking ? <p className="scan-focus-frame__hold">Hold 2–5 seconds</p> : null}
    </div>
  );
};
