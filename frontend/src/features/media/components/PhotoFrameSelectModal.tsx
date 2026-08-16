import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import {
  clampOverlayFrame,
  DEFAULT_OVERLAY_FRAME,
  type OverlayFrame,
} from '@/features/ar/utils/overlay-frame';
import { FrameSelector } from './FrameSelector';

interface PhotoFrameSelectModalProps {
  open: boolean;
  imageSrc: string | null;
  initialFrame?: OverlayFrame | null;
  onCancel: () => void;
  onConfirm: (frame: OverlayFrame) => void;
}

export const PhotoFrameSelectModal = ({
  open,
  imageSrc,
  initialFrame,
  onCancel,
  onConfirm,
}: PhotoFrameSelectModalProps) => {
  const [frame, setFrame] = useState<OverlayFrame>(clampOverlayFrame(initialFrame));

  useEffect(() => {
    if (open) {
      setFrame(clampOverlayFrame(initialFrame ?? DEFAULT_OVERLAY_FRAME));
    }
  }, [open, initialFrame]);

  return (
    <Modal
      open={open}
      title="Select the photo frame"
      onCancel={onCancel}
      destroyOnHidden
      width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth - 32 : 560)}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="ok" type="primary" onClick={() => onConfirm(frame)}>
          Use this frame
        </Button>,
      ]}
    >
      <p className="mb-3 text-sm text-neutral-500">
        Drag the rectangle onto the printed frame. The mapped video will play only inside this area
        while guests scan the photo.
      </p>
      {imageSrc ? <FrameSelector imageSrc={imageSrc} value={frame} onChange={setFrame} /> : null}
    </Modal>
  );
};
