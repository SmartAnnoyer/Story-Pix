import {
  VIDEO_COMPRESS_AUDIO_BITRATE,
  VIDEO_COMPRESS_BITRATE,
  VIDEO_COMPRESS_SHORT_EDGE,
} from './media-limits';

/** Clips already at ≤720p and near the target bitrate are uploaded untouched. */
const SKIP_BITRATE_HEADROOM = 1.25;

const toEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);

const toMp4Name = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'video'}.mp4`;

/** WebCodecs is required; older browsers upload the original file. */
export const canCompressVideo = (): boolean =>
  typeof window !== 'undefined' && typeof window.VideoEncoder === 'function';

/**
 * Re-encode to H.264/AAC MP4 with a 720p short edge so guest phones start playback fast.
 * Returns the original file whenever compression is unsupported, fails, would drop a
 * track, or does not make the file smaller.
 */
export const compressVideoFile = async (
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<File> => {
  if (!canCompressVideo()) return file;

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
  } = await import('mediabunny');

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return file;

    const [width, height, duration] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      input.computeDuration(),
    ]);
    const shortEdge = Math.min(width, height);
    if (!shortEdge) return file;

    const sourceBitrate = duration > 0 ? (file.size * 8) / duration : Infinity;
    if (
      shortEdge <= VIDEO_COMPRESS_SHORT_EDGE &&
      sourceBitrate <= VIDEO_COMPRESS_BITRATE * SKIP_BITRATE_HEADROOM
    ) {
      return file;
    }

    const scale = Math.min(1, VIDEO_COMPRESS_SHORT_EDGE / shortEdge);
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      showWarnings: false,
      video: {
        width: toEven(width * scale),
        height: toEven(height * scale),
        fit: 'fill',
        codec: 'avc',
        quality: new Quality({ bitrate: VIDEO_COMPRESS_BITRATE }),
        forceTranscode: true,
      },
      audio: {
        codec: 'aac',
        quality: new Quality({ bitrate: VIDEO_COMPRESS_AUDIO_BITRATE }),
      },
    });

    if (!conversion.isValid || conversion.discardedTracks.length > 0) return file;

    conversion.onProgress = (progress) => onProgress?.(progress);
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength >= file.size) return file;

    return new File([buffer], toMp4Name(file.name), {
      type: 'video/mp4',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Video compression failed — uploading original', error);
    return file;
  } finally {
    input.dispose();
  }
};
