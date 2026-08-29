import { viewerService } from '@/services/viewer.service';

/** Prefetch mapping videos so match → play is near-instant. */

const prefetchedUrls = new Set<string>();
const blobUrlBySource = new Map<string, string>();
const pendingBySource = new Map<string, Promise<string | null>>();
const MAX_BLOB_CACHE_BYTES = 20_000_000;

const guessVideoMime = (url: string, headerType: string | null): string => {
  if (headerType && headerType.startsWith('video/')) return headerType;
  const lower = url.toLowerCase();
  if (lower.includes('.mov') || lower.includes('quicktime')) return 'video/quicktime';
  if (lower.includes('.webm')) return 'video/webm';
  if (lower.includes('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
};

const createHiddenVideo = (url: string) => {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.style.display = 'none';
  video.src = url;
  document.body.appendChild(video);
  video.load();
  return video;
};

const fetchVideoBlob = (url: string): Promise<string | null> =>
  fetch(url, { mode: 'cors', credentials: 'omit' })
    .then(async (response) => {
      if (!response.ok) return null;
      const lengthHeader = response.headers.get('content-length');
      const length = lengthHeader ? Number(lengthHeader) : NaN;
      if (Number.isFinite(length) && length > MAX_BLOB_CACHE_BYTES) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      const blob = await response.blob();
      if (blob.size > MAX_BLOB_CACHE_BYTES) return null;
      const typed =
        !blob.type || blob.type === 'application/octet-stream'
          ? blob.slice(0, blob.size, guessVideoMime(url, response.headers.get('content-type')))
          : blob;
      const blobUrl = URL.createObjectURL(typed);
      blobUrlBySource.set(url, blobUrl);
      return blobUrl;
    })
    .catch(() => null);

/** Start buffering a video without blocking the UI. Safe to call many times. */
export const prefetchVideo = (url: string | null | undefined): void => {
  if (!url || prefetchedUrls.has(url)) return;
  prefetchedUrls.add(url);

  try {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {
    // ignore
  }

  try {
    createHiddenVideo(url);
  } catch {
    // ignore
  }

  if (!pendingBySource.has(url)) {
    pendingBySource.set(url, fetchVideoBlob(url));
  }
};

/** Wait briefly for an in-flight or new blob prefetch — instant play when ready. */
export const waitForVideoBlob = async (url: string, maxMs = 2_000): Promise<string | null> => {
  const cached = blobUrlBySource.get(url);
  if (cached) return cached;

  prefetchVideo(url);
  const pending = pendingBySource.get(url);
  if (!pending) return null;

  return Promise.race([
    pending,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), maxMs)),
  ]);
};

/** Fetch a same-origin blob URL so iOS can copy frames into WebGL. */
export const awaitSameOriginVideoUrl = async (
  url: string,
  timeoutMs = 20_000,
): Promise<string | null> => {
  const cached = blobUrlBySource.get(url);
  if (cached) return cached;

  const raced = await waitForVideoBlob(url, timeoutMs);
  if (raced) return raced;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size < 64 || blob.size > 40_000_000) return null;
    const typed =
      !blob.type || blob.type === 'application/octet-stream'
        ? blob.slice(0, blob.size, guessVideoMime(url, response.headers.get('content-type')))
        : blob;
    const blobUrl = URL.createObjectURL(typed);
    blobUrlBySource.set(url, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
};

/** Prefer a fully cached blob URL when available (instant start). */
export const getPrefetchedBlobUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return blobUrlBySource.get(url) ?? null;
};

export const isVideoBlobReady = (url: string | null | undefined): boolean =>
  Boolean(url && blobUrlBySource.has(url));

export const resolvePlayableVideoUrl = async (
  preferredUrl: string | null | undefined,
  options?: { allowBlob?: boolean; blobWaitMs?: number },
): Promise<string | null> => {
  if (!preferredUrl) return null;
  const allowBlob = options?.allowBlob !== false;
  const blobWaitMs = options?.blobWaitMs ?? 1_500;

  if (allowBlob) {
    const cached = blobUrlBySource.get(preferredUrl);
    if (cached) return cached;

    const blobUrl = await waitForVideoBlob(preferredUrl, blobWaitMs);
    if (blobUrl) return blobUrl;
  }

  return preferredUrl;
};

export const prefetchManifestVideos = (
  albumSlug: string,
  targets: Array<{
    id: string;
    videoMediaId: string;
    videoUrl?: string | null;
    videoAvailable?: boolean;
    photoMediaId?: string;
  }>,
): void => {
  const seenPhotos = new Set<string>();

  for (const target of targets) {
    if (target.videoAvailable === false) continue;
    const photoKey = target.photoMediaId ?? `mapping:${target.id}`;
    if (seenPhotos.has(photoKey)) continue;
    seenPhotos.add(photoKey);
    prefetchVideo(viewerService.getMappingVideoUrl(albumSlug, target.id, target.videoMediaId));
  }
};
