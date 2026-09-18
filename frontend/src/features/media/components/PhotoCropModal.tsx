import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import { Button, Modal, Slider } from 'antd';
import { RotateLeftOutlined, RotateRightOutlined } from '@ant-design/icons';
import {
  getFreeCroppedImageFile,
  rotateImageToFile,
  rotateImageToObjectUrl,
} from '../utils/crop-image';
import 'react-image-crop/dist/ReactCrop.css';
import './PhotoCropModal.css';

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  /** Original gallery file — used when the user keeps the full photo (no edits). */
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
  const baseUrlRef = useRef<string | null>(null);
  const displayUrlRef = useRef<string | null>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [saving, setSaving] = useState(false);
  /** 90° turns baked into baseSrc. */
  const [baseSrc, setBaseSrc] = useState<string | null>(imageSrc);
  /** Fine straighten angle applied on top of base (−45…45). */
  const [tilt, setTilt] = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(imageSrc);
  const [busy, setBusy] = useState(false);
  const edited = Boolean(baseUrlRef.current) || tilt !== 0;

  useEffect(() => {
    if (!open) return;
    setCrop(undefined);
    setCompletedCrop(null);
    setSaving(false);
    setTilt(0);
    setBusy(false);
    setBaseSrc(imageSrc);
    setDisplaySrc(imageSrc);
    if (baseUrlRef.current) {
      URL.revokeObjectURL(baseUrlRef.current);
      baseUrlRef.current = null;
    }
    if (displayUrlRef.current) {
      URL.revokeObjectURL(displayUrlRef.current);
      displayUrlRef.current = null;
    }
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open || !baseSrc) return;

    let cancelled = false;

    if (tilt === 0) {
      if (displayUrlRef.current) {
        URL.revokeObjectURL(displayUrlRef.current);
        displayUrlRef.current = null;
      }
      setDisplaySrc(baseSrc);
      setBusy(false);
      return;
    }

    setBusy(true);
    const timer = window.setTimeout(() => {
      void rotateImageToObjectUrl(baseSrc, tilt)
        .then((url) => {
          if (cancelled) {
            if (url !== baseSrc) URL.revokeObjectURL(url);
            return;
          }
          if (displayUrlRef.current) URL.revokeObjectURL(displayUrlRef.current);
          displayUrlRef.current = url !== baseSrc ? url : null;
          setDisplaySrc(url);
          setCrop(undefined);
          setCompletedCrop(null);
        })
        .catch(() => {
          if (!cancelled) setDisplaySrc(baseSrc);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, baseSrc, tilt]);

  useEffect(() => {
    return () => {
      if (baseUrlRef.current) URL.revokeObjectURL(baseUrlRef.current);
      if (displayUrlRef.current) URL.revokeObjectURL(displayUrlRef.current);
    };
  }, []);

  const turn90 = async (direction: -1 | 1) => {
    if (!baseSrc || busy || saving) return;
    setBusy(true);
    try {
      const url = await rotateImageToObjectUrl(baseSrc, direction * 90);
      if (baseUrlRef.current) URL.revokeObjectURL(baseUrlRef.current);
      baseUrlRef.current = url !== imageSrc ? url : null;
      setBaseSrc(url);
      setTilt(0);
      setCrop(undefined);
      setCompletedCrop(null);
    } finally {
      setBusy(false);
    }
  };

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
      if (!edited && originalFile) {
        onConfirm(originalFile);
        return;
      }
      if (!baseSrc) return;
      if (tilt !== 0) {
        onConfirm(await rotateImageToFile(baseSrc, tilt, fileName));
        return;
      }
      if (baseSrc !== imageSrc) {
        onConfirm(await rotateImageToFile(baseSrc, 0, fileName));
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
      className="photo-crop-modal"
      footer={
        <div className="photo-crop-modal__footer">
          <Button className="photo-crop-modal__btn" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="photo-crop-modal__btn"
            loading={saving}
            disabled={busy}
            onClick={() => void handleUseFull()}
          >
            Use full photo
          </Button>
          <Button
            className="photo-crop-modal__btn photo-crop-modal__btn--primary"
            type="primary"
            loading={saving}
            disabled={busy || !completedCrop?.width || !completedCrop?.height}
            onClick={() => void handleUseCrop()}
          >
            Use selection
          </Button>
        </div>
      }
    >
      <p className="photo-crop-modal__hint">
        Straighten a tilted print, then drag the corners to crop the frame.
      </p>

      <div className="photo-crop-modal__rotate">
        <div className="photo-crop-modal__rotate-head">
          <span>Straighten</span>
          <strong>{tilt > 0 ? `+${tilt}°` : `${tilt}°`}</strong>
        </div>
        <div className="photo-crop-modal__rotate-row">
          <button
            type="button"
            className="photo-crop-modal__rotate-nudge"
            aria-label="Rotate left 90 degrees"
            disabled={saving || busy}
            onClick={() => void turn90(-1)}
          >
            <RotateLeftOutlined />
          </button>
          <Slider
            className="photo-crop-modal__slider"
            min={-45}
            max={45}
            step={1}
            value={tilt}
            disabled={saving || busy}
            tooltip={{ formatter: (value) => `${value ?? 0}°` }}
            onChange={(value) => setTilt(typeof value === 'number' ? value : 0)}
          />
          <button
            type="button"
            className="photo-crop-modal__rotate-nudge"
            aria-label="Rotate right 90 degrees"
            disabled={saving || busy}
            onClick={() => void turn90(1)}
          >
            <RotateRightOutlined />
          </button>
        </div>
        <p className="photo-crop-modal__rotate-note">
          Use the dial for small tilts (−45° to +45°). Side buttons turn 90°.
        </p>
      </div>

      <div className={`photo-crop-modal__stage${busy ? ' photo-crop-modal__stage--busy' : ''}`}>
        {displaySrc ? (
          <ReactCrop
            crop={crop}
            onChange={(next) => setCrop(next)}
            onComplete={(next) => setCompletedCrop(next)}
            keepSelection
            ruleOfThirds
          >
            <img
              ref={imgRef}
              key={displaySrc}
              src={displaySrc}
              alt="Crop preview"
              className="photo-crop-modal__image"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                setCrop(initialFreeCrop(naturalWidth, naturalHeight));
              }}
            />
          </ReactCrop>
        ) : null}
      </div>
    </Modal>
  );
};
