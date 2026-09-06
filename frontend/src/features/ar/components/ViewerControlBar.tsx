import type { CameraFacing } from '../utils/mindar-scene';
import './ViewerControlBar.css';

interface ViewerControlBarProps {
  showRetry: boolean;
  /** @deprecated Front-camera flip removed from guest UX. */
  showFlip?: boolean;
  flipping?: boolean;
  facingMode?: CameraFacing;
  onFlip?: () => void;
  onRetry: () => void;
}

export const ViewerControlBar = ({ showRetry, onRetry }: ViewerControlBarProps) => {
  if (!showRetry) return null;

  return (
    <div className="viewer-control-bar pointer-events-auto">
      <button
        type="button"
        onClick={onRetry}
        className="viewer-control-btn viewer-control-btn-primary"
      >
        <span className="viewer-control-icon" aria-hidden>
          ⟳
        </span>
        Try again
      </button>
    </div>
  );
};
