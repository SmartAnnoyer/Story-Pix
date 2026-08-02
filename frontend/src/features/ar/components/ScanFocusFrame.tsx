import './ScanFocusFrame.css';

interface ScanFocusFrameProps {
  visible: boolean;
  label?: string;
}

export const ScanFocusFrame = ({
  visible,
  label = 'Fill the frame with the photo',
}: ScanFocusFrameProps) => {
  if (!visible) return null;

  return (
    <div className="scan-focus-frame" aria-hidden>
      <div className="scan-focus-frame__dim" />
      <div className="scan-focus-frame__box">
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--tr" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--bl" />
        <span className="scan-focus-frame__corner scan-focus-frame__corner--br" />
        <p className="scan-focus-frame__label">{label}</p>
      </div>
    </div>
  );
};
