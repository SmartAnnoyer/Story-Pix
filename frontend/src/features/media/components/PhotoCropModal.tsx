import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button, Modal, Slider } from 'antd';
import { getCroppedImageFile } from '../utils/crop-image';

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  /** Original gallery file — used when the user keeps the full photo. */
  originalFile?: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export const PhotoCropModal = ({
  open,
  imageSrc,
  fileName,
  originalFile,
  onCancel,
  onConfirm,
}: PhotoCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setSaving(false);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const handleUseCrop = async () => {
    if (!imageSrc || !croppedArea) return;
    setSaving(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedArea, fileName);
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  const handleUseFull = async () => {
    setSaving(true);
    try {
      if (originalFile) {
        onConfirm(originalFile);
        return;
      }
      if (!imageSrc) return;
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const type = blob.type || 'image/jpeg';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const base = fileName.replace(/\.[^.]+$/, '') || 'photo';
      onConfirm(new File([blob], `${base}.${ext}`, { type }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Adjust photo"
      onCancel={onCancel}
      destroyOnHidden
      width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth - 32 : 560)}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="full" loading={saving} onClick={() => void handleUseFull()}>
          Use full photo
        </Button>,
        <Button
          key="crop"
          type="primary"
          loading={saving}
          disabled={!croppedArea}
          onClick={() => void handleUseCrop()}
        >
          Use selection
        </Button>,
      ]}
    >
      <p className="mb-3 text-sm text-neutral-500">
        Optional — keep the full photo, or drag and zoom to trim edges. No fixed frame size.
      </p>
      <div className="relative h-[min(55vh,420px)] overflow-hidden rounded-lg bg-black">
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
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
