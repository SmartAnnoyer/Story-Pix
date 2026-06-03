import { useEffect, useRef } from 'react';

interface VideoOverlayProps {
  videoUrl: string | null;
  visible: boolean;
  onPlay?: () => void;
  onEnded?: () => void;
}

export const VideoOverlay = ({ videoUrl, visible, onPlay, onEnded }: VideoOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (visible) {
      video.src = videoUrl;
      video.load();
      void video.play().then(() => onPlay?.()).catch(() => undefined);
      return;
    }

    video.pause();
    video.removeAttribute('src');
    video.load();
  }, [videoUrl, visible, onPlay]);

  if (!visible || !videoUrl) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      playsInline
      muted={false}
      onEnded={onEnded}
    />
  );
};
