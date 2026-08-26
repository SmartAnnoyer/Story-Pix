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
    phase === 'locking'
      ? 'Hold steady'
      : phase === 'warming'
        ? 'Almost there'
        : 'Point camera at your photo';

  const sub =
    phase === 'locking'
      ? 'Keep the print inside the frame'
      : phase === 'warming'
        ? 'Fill the frame with your photo'
        : 'Align the printed photo in the frame';

  return createPortal(
    <div className={`scan-focus-frame scan-focus-frame--${phase}`} aria-hidden>
      <div className="scan-focus-frame__hint">
        <div className="scan-focus-frame__hint-card">
          <span className="scan-focus-frame__hint-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M4.5 8.5h2.1l1.2-2h8.4l1.2 2H19.5A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-8a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <span className="scan-focus-frame__hint-copy">
            <span className="scan-focus-frame__hint-title">{hint}</span>
            <span className="scan-focus-frame__hint-sub">{sub}</span>
          </span>
          <span className="scan-focus-frame__hint-live" aria-hidden>
            <i />
            Live
          </span>
        </div>
      </div>

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
        <div className="scan-focus-frame__scanline" />
      </div>
    </div>,
    document.body,
  );
};
