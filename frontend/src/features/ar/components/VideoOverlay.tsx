import { useEffect, useRef } from 'react';

interface VideoOverlayProps {
  videoUrl: string | null;
  fallbackUrl?: string | null;
  visible: boolean;
  onPlay?: () => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
}

export const VideoOverlay = ({
  videoUrl,
  fallbackUrl,
  visible,
  onPlay,
  onError,
  onEnded,
}: VideoOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const triedFallbackRef = useRef(false);

  useEffect(() => {
    triedFallbackRef.current = false;
  }, [videoUrl, visible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!visible || !videoUrl) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }

    const tryPlay = async (source: string) => {
      video.crossOrigin = 'anonymous';
      video.src = source;
      video.load();
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve();
          return;
        }
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onFail = () => {
          cleanup();
          reject(new Error('Video load failed'));
        };
        const cleanup = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('error', onFail);
        };
        video.addEventListener('loadeddata', onReady);
        video.addEventListener('error', onFail);
      });

      try {
        video.muted = false;
        await video.play();
        onPlay?.();
        return;
      } catch {
        video.muted = true;
        await video.play();
        onPlay?.();
      }
    };

    void tryPlay(videoUrl).catch(async () => {
      if (fallbackUrl && !triedFallbackRef.current) {
        triedFallbackRef.current = true;
        try {
          await tryPlay(fallbackUrl);
          return;
        } catch {
          // fall through to error
        }
      }
      onError?.('Could not load the mapped video. Check your connection and try again.');
    });
  }, [videoUrl, fallbackUrl, visible, onPlay, onError]);

  return (
    <video
      ref={videoRef}
      className={`ar-video-overlay pointer-events-none absolute inset-0 h-full w-full object-contain ${
        visible && videoUrl ? 'opacity-100' : 'opacity-0'
      }`}
      playsInline
      autoPlay
      loop
      onEnded={onEnded}
    />
  );
};
