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

    if (!visible) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }

    video.src = videoUrl;
    video.load();

    const tryPlay = async () => {
      try {
        video.muted = false;
        await video.play();
        onPlay?.();
      } catch {
        try {
          video.muted = true;
          await video.play();
          onPlay?.();
        } catch {
          // Browser blocked autoplay — user may need to tap screen
        }
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void tryPlay();
      return;
    }

    const onReady = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
      void tryPlay();
    };
    const onError = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };
  }, [videoUrl, visible, onPlay]);

  if (!visible || !videoUrl) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      className="ar-video-overlay pointer-events-none absolute inset-0 z-10 h-full w-full object-contain bg-black/20"
      playsInline
      autoPlay
      loop
      onEnded={onEnded}
    />
  );
};
