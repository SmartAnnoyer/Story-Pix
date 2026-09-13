import { useEffect, useState } from 'react';
import { Button, Input, Modal } from 'antd';
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
  /** Suggested display name from the source file (without forcing rename). */
  initialDisplayName?: string;
  onCancel: () => void;
  onConfirm: (frame: OverlayFrame, displayName: string) => void;
}

export const PhotoFrameSelectModal = ({
  open,
  imageSrc,
  initialFrame,
  initialDisplayName = '',
  onCancel,
  onConfirm,
}: PhotoFrameSelectModalProps) => {
  const [frame, setFrame] = useState<OverlayFrame>(clampOverlayFrame(initialFrame));
  const [displayName, setDisplayName] = useState(initialDisplayName);

  useEffect(() => {
    if (open) {
      setFrame(clampOverlayFrame(initialFrame ?? DEFAULT_OVERLAY_FRAME));
      setDisplayName(initialDisplayName);
    }
  }, [open, initialFrame, initialDisplayName]);

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
        <Button
          key="ok"
          type="primary"
          onClick={() => onConfirm(frame, displayName.trim() || initialDisplayName)}
        >
          Use this frame
        </Button>,
      ]}
    >
      <p className="mb-3 text-sm text-neutral-500">
        Move the corners to mark where the video should play on the print.
      </p>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-neutral-500">Display name</label>
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={120}
          placeholder="Short name for this photo"
        />
      </div>
      {imageSrc ? <FrameSelector imageSrc={imageSrc} value={frame} onChange={setFrame} /> : null}
    </Modal>
  );
};
