/** Keep albums lean so MindAR detection stays fast and reliable. */
export const MAX_AR_ITEMS_PER_ALBUM = 25;

/** Client mirrors of backend defaults (after photo compression). */
export const MAX_PHOTO_UPLOAD_MB = 8;
export const MAX_VIDEO_UPLOAD_MB = 80;
export const MAX_VIDEO_DURATION_SEC = 90;
/**
 * Largest original clip accepted when the browser can shrink it to 720p before upload.
 * The source is read from disk in chunks; only the ~720p output is held in memory.
 */
export const MAX_VIDEO_SOURCE_MB = 2048;
/** Recommend studio compress under this for snappy guest AR (soft guidance). */
export const RECOMMENDED_VIDEO_PLAYBACK_MB = 25;

/** Photo prep for tracking + storage. */
export const PHOTO_COMPRESS_MAX_EDGE = 1920;
export const PHOTO_COMPRESS_QUALITY = 0.82;

/**
 * Huge originals are shrunk before the crop step so the crop modal and canvases stay
 * within mobile browser limits (iOS caps canvases at ~16.7 MP).
 */
export const PHOTO_PREP_MAX_EDGE = 4096;
export const PHOTO_PREP_TRIGGER_MB = 15;
export const PHOTO_PREP_QUALITY = 0.92;

/** Video prep for fast guest playback. */
export const VIDEO_COMPRESS_SHORT_EDGE = 720;
export const VIDEO_COMPRESS_BITRATE = 2_000_000;
export const VIDEO_COMPRESS_AUDIO_BITRATE = 128_000;
