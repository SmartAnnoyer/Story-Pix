import { useEffect, useRef, useState } from 'react';
import { Button, Modal, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import './PhotoCaptureModal.css';

interface PhotoCaptureModalProps {
  open: boolean;
  onCancel: () => void;
  onCapture: (file: File) => void;
}

/** Matches CSS `.photo-capture-frame { inset: 8% }` */
const FRAME_INSET = 0.08;

const captureFramedPhoto = (video: HTMLVideoElement, shell: HTMLElement): Promise<File> => {
  const cw = shell.clientWidth;
  const ch = shell.clientHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!cw || !ch || !vw || !vh) {
    return Promise.reject(new Error('Camera preview not ready'));
  }

  const scale = Math.max(cw / vw, ch / vh);
  const displayedW = vw * scale;
  const displayedH = vh * scale;
  const offsetX = (cw - displayedW) / 2;
  const offsetY = (ch - displayedH) / 2;

  const frameLeft = cw * FRAME_INSET;
  const frameTop = ch * FRAME_INSET;
  const frameW = cw * (1 - FRAME_INSET * 2);
  const frameH = ch * (1 - FRAME_INSET * 2);

  const srcX = Math.max(0, (frameLeft - offsetX) / scale);
  const srcY = Math.max(0, (frameTop - offsetY) / scale);
  const srcW = Math.min(vw - srcX, frameW / scale);
  const srcH = Math.min(vh - srcY, frameH / scale);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcW));
  canvas.height = Math.max(1, Math.round(srcH));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Could not capture photo'));

  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode photo'));
          return;
        }
        resolve(
          new File([blob], `camera-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          }),
        );
      },
      'image/jpeg',
      0.92,
    );
  });
};

export const PhotoCaptureModal = ({ open, onCancel, onCapture }: PhotoCaptureModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setReady(false);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not available in this browser');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Could not open camera');
        onCancel();
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // Only (re)start camera when the modal opens — not when parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCancel is for error close only
  }, [open]);

  const handleCapture = async () => {
    const video = videoRef.current;
    const shell = shellRef.current;
    if (!video || !shell || !ready) return;

    setCapturing(true);
    try {
      const file = await captureFramedPhoto(video, shell);
      onCapture(file);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Capture failed');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Take photo for AR"
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      centered
      width={Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 24 : 480)}
      className="photo-capture-modal"
    >
      <div ref={shellRef} className="photo-capture-shell">
        <video ref={videoRef} playsInline muted autoPlay />
        <div className="photo-capture-frame" />
        <p className="photo-capture-hint">Fill the frame with the photo</p>
      </div>
      <div className="photo-capture-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="primary"
          icon={<CameraOutlined />}
          loading={capturing}
          disabled={!ready}
          onClick={() => void handleCapture()}
        >
          Capture
        </Button>
      </div>
    </Modal>
  );
};
