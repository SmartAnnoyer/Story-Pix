import type { CameraFacing } from '../utils/mindar-scene';
import './ViewerControlBar.css';

interface ViewerControlBarProps {
  showFlip: boolean;
  showRetry: boolean;
  flipping?: boolean;
  facingMode: CameraFacing;
  onFlip: () => void;
  onRetry: () => void;
}

export const ViewerControlBar = ({
  showFlip,
  showRetry,
  flipping = false,
  facingMode,
  onFlip,
  onRetry,
}: ViewerControlBarProps) => {
  if (!showFlip && !showRetry) return null;

  return (
    <div className="pointer-events-auto absolute bottom-28 right-4 z-30 flex flex-col gap-2 sm:bottom-32">
      {showFlip ? (
        <button
          type="button"
          onClick={onFlip}
          disabled={flipping}
          className="viewer-control-btn"
        >
          <span className={`viewer-control-icon ${flipping ? 'is-spinning' : ''}`} aria-hidden>
            ↻
          </span>
          {facingMode === 'environment' ? 'Front camera' : 'Back camera'}
        </button>
      ) : null}
      {showRetry ? (
        <button type="button" onClick={onRetry} className="viewer-control-btn viewer-control-btn-primary">
          <span className="viewer-control-icon" aria-hidden>
            ⟳
          </span>
          Try again
        </button>
      ) : null}
    </div>
  );
};
