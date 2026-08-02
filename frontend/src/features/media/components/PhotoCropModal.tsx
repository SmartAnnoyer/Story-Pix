import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button, Modal, Slider } from 'antd';
import { AR_PHOTO_ASPECT, getCroppedImageFile } from '../utils/crop-image';

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export const PhotoCropModal = ({
  open,
  imageSrc,
  fileName,
  onCancel,
  onConfirm,
}: PhotoCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const handleOk = async () => {
    if (!imageSrc || !croppedArea) return;
    setSaving(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedArea, fileName);
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Crop photo for AR"
      onCancel={onCancel}
      destroyOnHidden
      width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth - 32 : 560)}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="ok" type="primary" loading={saving} onClick={() => void handleOk()}>
          Use cropped photo
        </Button>,
      ]}
    >
      <p className="mb-3 text-sm text-neutral-500">
        Fit the photo inside the frame — this crop is what guests will scan later.
      </p>
      <div className="relative h-[min(55vh,420px)] overflow-hidden rounded-lg bg-black">
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={AR_PHOTO_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        ) : null}
      </div>
      <div className="mt-4 px-1">
        <p className="mb-1 text-xs text-neutral-500">Zoom</p>
        <Slider min={1} max={3} step={0.05} value={zoom} onChange={setZoom} />
      </div>
    </Modal>
  );
};
