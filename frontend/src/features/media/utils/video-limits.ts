import { MAX_VIDEO_DURATION_SEC, MAX_VIDEO_UPLOAD_MB } from './media-limits';

export const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const assertVideoWithinLimits = async (file: File): Promise<void> => {
  const maxBytes = MAX_VIDEO_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `Video is too large (${formatMb(file.size)}). Max ${MAX_VIDEO_UPLOAD_MB} MB — compress the clip (e.g. 720p, under ~90s) and try again.`,
    );
  }

  const duration = await readVideoDuration(file);
  if (duration > MAX_VIDEO_DURATION_SEC) {
    throw new Error(
      `Video is too long (${Math.round(duration)}s). Keep clips under ${MAX_VIDEO_DURATION_SEC}s for reliable guest playback.`,
    );
  }
};

const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video metadata'));
    };
    video.src = url;
  });
