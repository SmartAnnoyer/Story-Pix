import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import './ScanFocusFrame.css';

export type ScanFocusPhase = 'scanning' | 'warming' | 'locking' | 'found';

interface ScanFocusFrameProps {
  visible: boolean;
  phase?: ScanFocusPhase;
  /** 0–100, drives the ring progress (smoothed). */
  matchPercent?: number;
}

const phaseHint: Record<ScanFocusPhase, string> = {
  scanning: 'Align your photo inside the frame',
  warming: 'Hold steady — almost there',
  locking: 'Photo found',
  found: 'Memory unlocked',
};

export const ScanFocusFrame = ({
  visible,
  phase = 'scanning',
  matchPercent = 0,
}: ScanFocusFrameProps) => {
  if (!visible || typeof document === 'undefined') return null;

  const progress = Math.min(100, Math.max(0, Math.round(matchPercent)));

  return createPortal(
    <div className="scan-focus-frame" aria-hidden>
      <div className="scan-focus-frame__dim" />
      <div
        className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}
        style={{ '--scan-progress': `${progress}` } as CSSProperties}
      >
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />

        <div className="scan-focus-frame__ring" aria-hidden>
          <svg className="scan-focus-frame__ring-svg" viewBox="0 0 100 100">
            <circle className="scan-focus-frame__ring-track" cx="50" cy="50" r="46" />
            <circle
              className="scan-focus-frame__ring-fill"
              cx="50"
              cy="50"
              r="46"
              pathLength={100}
              strokeDasharray={`${progress} 100`}
            />
          </svg>
        </div>

        {phase === 'found' ? (
          <div className="scan-focus-frame__success" aria-hidden>
            <span className="scan-focus-frame__check">✓</span>
          </div>
        ) : (
          <div className="scan-focus-frame__pulse" aria-hidden />
        )}

        <p className="scan-focus-frame__hint">{phaseHint[phase]}</p>
      </div>
    </div>,
    document.body,
  );
};
