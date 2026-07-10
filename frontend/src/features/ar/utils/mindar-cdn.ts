/** CDN URLs for MindAR + A-Frame — keep in sync with index.html viewer preload. */
export const MINDAR_VERSION = '1.1.4';

export const MINDAR_IMAGE_SCRIPT = `https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@${MINDAR_VERSION}/dist/mindar-image.prod.js`;
export const AFRAME_SCRIPT = 'https://aframe.io/releases/1.2.0/aframe.min.js';
export const MINDAR_AFRAME_SCRIPT = `https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@${MINDAR_VERSION}/dist/mindar-image-aframe.prod.js`;

export const VIEWER_AR_SCRIPT_URLS = [
  MINDAR_IMAGE_SCRIPT,
  AFRAME_SCRIPT,
  MINDAR_AFRAME_SCRIPT,
] as const;
