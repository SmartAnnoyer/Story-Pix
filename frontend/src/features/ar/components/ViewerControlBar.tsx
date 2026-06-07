import { Button } from 'antd';
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import type { CameraFacing } from '../utils/mindar-scene';

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
        <Button
          type="default"
          shape="round"
          icon={<SyncOutlined spin={flipping} />}
          onClick={onFlip}
          disabled={flipping}
          className="border-white/20 bg-black/60 text-white backdrop-blur hover:!border-white/40 hover:!bg-black/80 hover:!text-white"
        >
          {facingMode === 'environment' ? 'Front camera' : 'Back camera'}
        </Button>
      ) : null}
      {showRetry ? (
        <Button
          type="primary"
          shape="round"
          icon={<ReloadOutlined />}
          onClick={onRetry}
          className="border-none bg-[#8A2BE2] shadow-lg hover:!bg-[#7a24cc]"
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
};
