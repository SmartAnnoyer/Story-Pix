import { canCompressVideo } from './compress-video';
import { MAX_VIDEO_DURATION_SEC, MAX_VIDEO_SOURCE_MB, MAX_VIDEO_UPLOAD_MB } from './media-limits';

export const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Size + duration check on the original pick (before 720p compression). */
export const assertVideoWithinLimits = async (file: File): Promise<void> => {
  const maxMb = canCompressVideo() ? MAX_VIDEO_SOURCE_MB : MAX_VIDEO_UPLOAD_MB;
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(
      `Video is too large (${formatMb(file.size)}). Max ${maxMb} MB — trim the clip (under ~90s) and try again.`,
    );
  }

  const duration = await readVideoDuration(file);
  if (duration > MAX_VIDEO_DURATION_SEC) {
    throw new Error(
      `Video is too long (${Math.round(duration)}s). Keep clips under ${MAX_VIDEO_DURATION_SEC}s for reliable guest playback.`,
    );
  }
};

/** Final size check on the file that will actually be uploaded. */
export const assertVideoUploadSize = (file: File, original?: File): void => {
  if (file.size <= MAX_VIDEO_UPLOAD_MB * 1024 * 1024) return;
  if (original && file === original) {
    throw new Error(
      `This browser could not shrink the video (${formatMb(file.size)}). Use desktop Chrome or Edge, or export it at 720p/1080p under ${MAX_VIDEO_UPLOAD_MB} MB and try again.`,
    );
  }
  throw new Error(
    `Video is still ${formatMb(file.size)} after compression. Max ${MAX_VIDEO_UPLOAD_MB} MB — trim the clip and try again.`,
  );
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
