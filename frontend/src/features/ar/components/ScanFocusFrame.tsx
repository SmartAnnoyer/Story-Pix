import { createPortal } from 'react-dom';
import './ScanFocusFrame.css';

interface ScanFocusFrameProps {
  visible: boolean;
  label?: string;
  matchPercent?: number;
}

export const ScanFocusFrame = ({
  visible,
  label = 'Fill the frame with the photo',
  matchPercent = 0,
}: ScanFocusFrameProps) => {
  if (!visible || typeof document === 'undefined') return null;

  const percent = Math.min(100, Math.max(0, Math.round(matchPercent)));
  const locked = percent >= 90;
  const warming = percent >= 45 && percent < 90;

  return createPortal(
    <div
      className="scan-focus-frame"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10030,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <div
        className="scan-focus-frame__dim"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 34%, rgba(0,0,0,0.42) 75%)',
        }}
      />
      <div
        className={`scan-focus-frame__box${locked ? ' scan-focus-frame__box--locked' : ''}${
          warming ? ' scan-focus-frame__box--warming' : ''
        }`}
        style={{
          position: 'relative',
          width: 'min(78vw, 340px)',
          aspectRatio: '3 / 4',
          maxHeight: 'min(58vh, 460px)',
          border: locked
            ? '3px solid #FFC233'
            : warming
              ? '3px solid #FF4FA3'
              : '3px solid rgba(255,255,255,0.92)',
          borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.28)',
          background: 'transparent',
        }}
      >
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />

        <div className="scan-focus-frame__match">
          <span className="scan-focus-frame__match-value">{percent}%</span>
          <span className="scan-focus-frame__match-label">
            {locked ? 'Match locked' : warming ? 'Almost there' : 'Matching'}
          </span>
          <div className="scan-focus-frame__match-bar">
            <div className="scan-focus-frame__match-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <p className="scan-focus-frame__label">{label}</p>
      </div>
    </div>,
    document.body,
  );
};
