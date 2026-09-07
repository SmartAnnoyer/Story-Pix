/** Keep albums lean so MindAR detection stays fast and reliable. */
export const MAX_AR_ITEMS_PER_ALBUM = 25;

/** Client mirrors of backend defaults (after photo compression). */
export const MAX_PHOTO_UPLOAD_MB = 8;
export const MAX_VIDEO_UPLOAD_MB = 80;
export const MAX_VIDEO_DURATION_SEC = 90;

/** Photo prep for tracking + storage. */
export const PHOTO_COMPRESS_MAX_EDGE = 1920;
export const PHOTO_COMPRESS_QUALITY = 0.82;
