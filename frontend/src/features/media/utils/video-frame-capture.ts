export type VideoMetadata = {
  width: number;
  height: number;
  duration: number;
};

const THUMB_MAX_EDGE = 480;
const THUMB_JPEG_QUALITY = 0.82;

export const scaleToMaxEdge = (
  width: number,
  height: number,
  maxEdge = THUMB_MAX_EDGE,
): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read photo dimensions'));
    };
    img.src = url;
  });

export const readVideoMetadata = (file: File): Promise<VideoMetadata> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      if (width > 0 && height > 0) {
        resolve({ width, height, duration });
      } else {
        reject(new Error('Could not read video metadata'));
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load video'));
    };
    video.src = url;
  });

export const waitForVideoSeek = (video: HTMLVideoElement): Promise<void> =>
  new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Could not seek video'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', onReady);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('seeked', onReady);
    video.addEventListener('error', onError);
  });

export const captureVideoFrameToBlob = async (
  video: HTMLVideoElement,
  timeSeconds: number,
): Promise<Blob> => {
  video.currentTime = Math.max(0, Math.min(timeSeconds, Math.max(0, video.duration - 0.05)));
  await waitForVideoSeek(video);

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width <= 0 || height <= 0) {
    throw new Error('Video frame is not ready');
  }

  const scaled = scaleToMaxEdge(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(video, 0, 0, scaled.width, scaled.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not capture frame'));
      },
      'image/jpeg',
      THUMB_JPEG_QUALITY,
    );
  });
};

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read thumbnail'));
    reader.readAsDataURL(blob);
  });

export const pickDefaultVideoPosterTime = (duration: number): number => {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(Math.max(duration * 0.1, 0.25), Math.max(duration - 0.1, 0.25));
};
