/** Keep albums lean so MindAR detection stays fast and reliable. */
export const MAX_AR_ITEMS_PER_ALBUM = 25;

/** Client mirrors of backend defaults (after photo compression). */
export const MAX_PHOTO_UPLOAD_MB = 8;
export const MAX_VIDEO_UPLOAD_MB = 80;
/** Recommend studio compress under this for snappy guest AR (soft guidance). */
export const RECOMMENDED_VIDEO_PLAYBACK_MB = 25;

/** Photo prep for tracking + storage. */
export const PHOTO_COMPRESS_MAX_EDGE = 1920;
export const PHOTO_COMPRESS_QUALITY = 0.82;
