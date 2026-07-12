/**
 * AR library URLs — prefer same-origin copies under /public/ar (fastest on mobile).
 * Keep filenames in sync with files in frontend/public/ar/.
 */
export const MINDAR_VERSION = '1.1.4';

export const MINDAR_IMAGE_SCRIPT = '/ar/mindar-image.prod.js';
export const AFRAME_SCRIPT = '/ar/aframe.min.js';
export const MINDAR_AFRAME_SCRIPT = '/ar/mindar-image-aframe.prod.js';

export const VIEWER_AR_SCRIPT_URLS = [
  MINDAR_IMAGE_SCRIPT,
  AFRAME_SCRIPT,
  MINDAR_AFRAME_SCRIPT,
] as const;
