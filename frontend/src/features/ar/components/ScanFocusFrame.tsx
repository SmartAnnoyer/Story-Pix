import { createPortal } from 'react-dom';
import './ScanFocusFrame.css';

export type ScanFocusPhase = 'scanning' | 'warming' | 'locking' | 'found';

interface ScanFocusFrameProps {
  visible: boolean;
  phase?: ScanFocusPhase;
}

export const ScanFocusFrame = ({ visible, phase = 'scanning' }: ScanFocusFrameProps) => {
  if (!visible || typeof document === 'undefined') return null;

  const hint =
    phase === 'found'
      ? 'Memory unlocked'
      : phase === 'locking'
        ? 'Hold steady…'
        : phase === 'warming'
          ? 'Almost there — keep the photo in the frame'
          : 'Point camera at your photo';

  return createPortal(
    <div className={`scan-focus-frame scan-focus-frame--${phase}`} aria-hidden>
      <div className="scan-focus-frame__mask">
        <div className={`scan-focus-frame__window scan-focus-frame__window--${phase}`}>
          <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
          <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
          <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
          <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
          {phase !== 'found' ? (
            <div className="scan-focus-frame__scanline" />
          ) : (
            <div className="scan-focus-frame__success">
              <span className="scan-focus-frame__check">✓</span>
            </div>
          )}
        </div>
      </div>

      <div className="scan-focus-frame__hint-pill">
        <span className="scan-focus-frame__hint-dot" />
        <span>{hint}</span>
      </div>
    </div>,
    document.body,
  );
};
