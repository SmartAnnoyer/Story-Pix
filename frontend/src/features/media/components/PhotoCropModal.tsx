import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { Button, Modal } from 'antd';
import { getFreeCroppedImageFile } from '../utils/crop-image';
import 'react-image-crop/dist/ReactCrop.css';
import './PhotoCropModal.css';

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  /** Original gallery file — used when the user keeps the full photo. */
  originalFile?: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

function initialFreeCrop(mediaWidth: number, mediaHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, mediaWidth / mediaHeight, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export const PhotoCropModal = ({
  open,
  imageSrc,
  fileName,
  originalFile,
  onCancel,
  onConfirm,
}: PhotoCropModalProps) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop(undefined);
    setCompletedCrop(null);
    setSaving(false);
  }, [open, imageSrc]);

  const handleUseCrop = async () => {
    const image = imgRef.current;
    if (!image || !completedCrop?.width || !completedCrop?.height) return;
    setSaving(true);
    try {
      const file = await getFreeCroppedImageFile(image, completedCrop, fileName);
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
          disabled={!completedCrop?.width || !completedCrop?.height}
          onClick={() => void handleUseCrop()}
        >
          Use selection
        </Button>,
      ]}
    >
      <p className="photo-crop-modal__hint">
        Drag the corners freely to crop — no fixed ratio. Or keep the full photo.
      </p>
      <div className="photo-crop-modal__stage">
        {imageSrc ? (
          <ReactCrop
            crop={crop}
            onChange={(next) => setCrop(next)}
            onComplete={(next) => setCompletedCrop(next)}
            keepSelection
            ruleOfThirds
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              className="photo-crop-modal__image"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                const next = initialFreeCrop(naturalWidth, naturalHeight);
                setCrop(next);
              }}
            />
          </ReactCrop>
        ) : null}
      </div>
    </Modal>
  );
};
