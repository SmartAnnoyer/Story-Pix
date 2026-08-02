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
  if (!visible) return null;

  const percent = Math.min(100, Math.max(0, Math.round(matchPercent)));
  const locked = percent >= 90;
  const warming = percent >= 45 && percent < 90;

  return (
    <div className="scan-focus-frame" aria-hidden>
      <div className="scan-focus-frame__dim" />
      <div
        className={`scan-focus-frame__box${locked ? ' scan-focus-frame__box--locked' : ''}${
          warming ? ' scan-focus-frame__box--warming' : ''
        }`}
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
    </div>
  );
};
