import './ScanFocusFrame.css';

export type ScanFocusPhase = 'scanning' | 'warming' | 'locking' | 'found';

interface ScanFocusFrameProps {
  visible: boolean;
  phase?: ScanFocusPhase;
}

export const ScanFocusFrame = ({ visible, phase = 'scanning' }: ScanFocusFrameProps) => {
  if (!visible) return null;

  const badge =
    phase === 'locking'
      ? 'Hold steady'
      : phase === 'warming'
        ? 'Almost there'
        : 'Point camera at your photo';

  return (
    <div className={`scan-focus-frame scan-focus-frame--${phase}`} aria-hidden>
      <div className="scan-focus-frame__badge">{badge}</div>

      <div className={`scan-focus-frame__box scan-focus-frame__box--${phase}`}>
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
        <div className="scan-focus-frame__scanline" />
      </div>
    </div>
  );
};
