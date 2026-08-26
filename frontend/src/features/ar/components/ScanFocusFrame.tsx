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

  const hint =
    phase === 'locking'
      ? 'Hold steady…'
      : phase === 'warming'
        ? 'Almost there — keep the photo in the frame'
        : 'Point camera at your photo';

  return createPortal(
    <div className={`scan-focus-frame scan-focus-frame--${phase}`} aria-hidden>
      <div className="scan-focus-frame__hint-pill">
        <span className="scan-focus-frame__hint-dot" />
        <span>{hint}</span>
      </div>

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
        <div className="scan-focus-frame__scanline" />
      </div>

      <div className="scan-focus-frame__coach">
        <ScanHowTo variant="mini" showLabel={false} photo={photo} />
      </div>
    </div>,
    document.body,
  );
};
