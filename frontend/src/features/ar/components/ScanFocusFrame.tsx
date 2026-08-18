import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { ScanHowTo } from './ScanHowTo';
import './ScanFocusFrame.css';

export type ScanFocusPhase = 'scanning' | 'warming' | 'locking' | 'found';

interface ScanFocusFrameProps {
  visible: boolean;
  phase?: ScanFocusPhase;
  photo?: ReactNode;
}

export const ScanFocusFrame = ({ visible, phase = 'scanning', photo }: ScanFocusFrameProps) => {
  if (!visible || typeof document === 'undefined') return null;

  const coaching = phase === 'scanning' || phase === 'warming';

  return createPortal(
    <div className="scan-focus-frame" aria-hidden>
      <div className="scan-focus-frame__hint-pill">
        <span className="scan-focus-frame__hint-dot" aria-hidden />
        <span>
          {phase === 'found'
            ? 'Memory unlocked'
            : phase === 'locking'
              ? 'Hold steady…'
              : 'Point camera at your photo'}
        </span>
      </div>

      {coaching ? (
        <div className="scan-focus-frame__coach">
          <ScanHowTo variant="mini" showLabel={false} photo={photo} />
        </div>
      ) : null}

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
        <div className="scan-focus-frame__scanline" aria-hidden />
        {phase === 'found' ? (
          <div className="scan-focus-frame__success" aria-hidden>
            <span className="scan-focus-frame__check">✓</span>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
