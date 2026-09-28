import { viewerService } from '@/services/viewer.service';
import { getPlaybackVideoElement } from './camera-permission';
import { viewerLog } from './viewer-debug-log';

/** Prefetch mapping videos so match → play is near-instant. */

const prefetchedUrls = new Set<string>();
const blobUrlBySource = new Map<string, string>();
const pendingBySource = new Map<string, Promise<string | null>>();
const decoderPrimeBySource = new Map<string, Promise<boolean>>();
const playbackPrimeBySource = new Map<string, Promise<boolean>>();
const primedVideos = new Map<string, HTMLVideoElement>();
const blobCacheOrder: string[] = [];
/** Larger clips stream over HTTP range requests instead of waiting on a full download. */
const MAX_BLOB_CACHE_BYTES = 40 * 1024 * 1024;
const MAX_BLOB_CACHE_ENTRIES = 3;
const MAX_CONCURRENT_BLOB_FETCHES = 1;
/** Clips downloaded before any photo is detected (album order). */
const MAX_WARM_VIDEOS = 3;
/** URLs too large / unsuitable for full-blob cache — play via progressive HTTP instead. */
const progressiveOnlyBySource = new Set<string>();
/** In-flight background (warm) downloads — aborted when a detected clip needs the bandwidth. */
const backgroundFetchControllers = new Map<string, AbortController>();

let activeBlobFetches = 0;
const blobFetchQueue: Array<() => void> = [];

const guessVideoMime = (url: string, headerType: string | null): string => {
  if (headerType && headerType.startsWith('video/')) return headerType;
  const lower = url.toLowerCase();
  if (lower.includes('.mov') || lower.includes('quicktime')) return 'video/quicktime';
  if (lower.includes('.webm')) return 'video/webm';
  if (lower.includes('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
};

const waitVideoCanPlay = (video: HTMLVideoElement, timeoutMs: number): Promise<boolean> =>
  new Promise((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      resolve(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0);
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve(true);
    };
    const onFail = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onFail);
    };

    video.addEventListener('canplaythrough', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onFail);
  });

const createHiddenPrimedVideo = (): HTMLVideoElement => {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.style.cssText =
    'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
  document.body.appendChild(video);
  return video;
};

const touchBlobCache = (url: string) => {
  const index = blobCacheOrder.indexOf(url);
  if (index >= 0) blobCacheOrder.splice(index, 1);
  blobCacheOrder.push(url);
};

const evictBlobCacheIfNeeded = (keepUrl?: string) => {
  while (blobCacheOrder.length >= MAX_BLOB_CACHE_ENTRIES) {
    const oldest = blobCacheOrder.shift();
    if (!oldest || oldest === keepUrl) continue;
    const blobUrl = blobUrlBySource.get(oldest);
    blobUrlBySource.delete(oldest);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const hidden = primedVideos.get(oldest);
    if (hidden) {
      hidden.pause();
      hidden.removeAttribute('src');
      hidden.src = '';
      hidden.remove();
      primedVideos.delete(oldest);
    }
  }
};

const fetchVideoBlobOnce = async (url: string, signal?: AbortSignal): Promise<string | null> => {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
    if (!response.ok) {
      viewerLog('warn', 'video blob fetch failed', {
        status: response.status,
        url: url.slice(0, 96),
      });
      return null;
    }
    const lengthHeader = response.headers.get('content-length');
    const length = lengthHeader ? Number(lengthHeader) : NaN;
    if (Number.isFinite(length) && length > MAX_BLOB_CACHE_BYTES) {
      progressiveOnlyBySource.add(url);
      viewerLog('warn', 'video too large for blob cache — will stream progressively', {
        bytes: length,
        maxBytes: MAX_BLOB_CACHE_BYTES,
        url: url.slice(0, 96),
      });
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    const blob = await response.blob();
    if (blob.size > MAX_BLOB_CACHE_BYTES) {
      progressiveOnlyBySource.add(url);
      viewerLog('warn', 'video too large for blob cache — will stream progressively', {
        bytes: blob.size,
        maxBytes: MAX_BLOB_CACHE_BYTES,
        url: url.slice(0, 96),
      });
      return null;
    }
    const typed =
      !blob.type || blob.type === 'application/octet-stream'
        ? blob.slice(0, blob.size, guessVideoMime(url, response.headers.get('content-type')))
        : blob;
    evictBlobCacheIfNeeded(url);
    const blobUrl = URL.createObjectURL(typed);
    blobUrlBySource.set(url, blobUrl);
    touchBlobCache(url);
    viewerLog('info', 'video blob cached', {
      bytes: blob.size,
      url: url.slice(0, 96),
    });
    return blobUrl;
  } catch (error) {
    if (signal?.aborted) {
      viewerLog('debug', 'background video fetch paused for detected clip', {
        url: url.slice(0, 96),
      });
      return null;
    }
    viewerLog('warn', 'video blob fetch error', {
      message: error instanceof Error ? error.message : String(error),
      url: url.slice(0, 96),
    });
    return null;
  }
};

const pumpBlobFetchQueue = () => {
  while (activeBlobFetches < MAX_CONCURRENT_BLOB_FETCHES && blobFetchQueue.length > 0) {
    const next = blobFetchQueue.shift();
    next?.();
  }
};

const abortBackgroundFetches = (exceptUrl: string) => {
  for (const [url, controller] of backgroundFetchControllers) {
    if (url === exceptUrl) continue;
    controller.abort();
    backgroundFetchControllers.delete(url);
  }
};

/** Queue network fetches so multi-target albums do not starve mobile bandwidth. */
const startBlobFetch = (url: string, priority = false): Promise<string | null> => {
  const cached = blobUrlBySource.get(url);
  if (cached) return Promise.resolve(cached);
  if (progressiveOnlyBySource.has(url)) return Promise.resolve(null);

  const pending = pendingBySource.get(url);
  if (pending) {
    if (priority) {
      backgroundFetchControllers.delete(url);
      abortBackgroundFetches(url);
    }
    return pending;
  }

  if (priority) abortBackgroundFetches(url);

  const promise = new Promise<string | null>((resolve) => {
    const run = () => {
      activeBlobFetches += 1;
      const controller = priority ? undefined : new AbortController();
      if (controller) backgroundFetchControllers.set(url, controller);
      void fetchVideoBlobOnce(url, controller?.signal)
        .then(resolve)
        .finally(() => {
          if (controller && backgroundFetchControllers.get(url) === controller) {
            backgroundFetchControllers.delete(url);
          }
          activeBlobFetches -= 1;
          pumpBlobFetchQueue();
        });
    };

    if (activeBlobFetches < MAX_CONCURRENT_BLOB_FETCHES) {
      run();
    } else if (priority) {
      blobFetchQueue.unshift(run);
    } else {
      blobFetchQueue.push(run);
    }
  }).finally(() => {
    if (pendingBySource.get(url) === promise) pendingBySource.delete(url);
  });

  pendingBySource.set(url, promise);
  return promise;
};

/**
 * Download the first few album clips while the guest is still aiming the camera,
 * so the first detection plays from memory instead of the network.
 */
export const warmAlbumVideos = (urls: Array<string | null | undefined>): void => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;

  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  for (const url of unique.slice(0, MAX_WARM_VIDEOS)) {
    void startBlobFetch(url);
  }
};

/** Start hinting the browser about a video URL — does not download the full blob. */
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
};

/** Bump a detected target to the front of the blob download queue. */
export const boostVideoBlobPriority = (url: string | null | undefined): void => {
  if (!url || blobUrlBySource.has(url)) return;
  prefetchVideo(url);
  void startBlobFetch(url, true);
};

/** Decode clip into a hidden element so match → play reuses warmed media. */
export const primeVideoDecoder = (url: string): Promise<boolean> => {
  const existing = decoderPrimeBySource.get(url);
  if (existing) return existing;

  const promise = (async () => {
    prefetchVideo(url);
    const blobUrl =
      getPrefetchedBlobUrl(url) ??
      (await startBlobFetch(url, true)) ??
      (await waitForVideoBlob(url, 45_000));
    if (!blobUrl) return false;

    let video = primedVideos.get(url);
    if (!video) {
      video = createHiddenPrimedVideo();
      primedVideos.set(url, video);
    }

    if (video.src !== blobUrl) {
      video.src = blobUrl;
      video.load();
    }

    const ready = await waitVideoCanPlay(video, 20_000);
    return ready && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  })();

  decoderPrimeBySource.set(url, promise);
  return promise;
};

/** Load a blob into the shared playback element (same one unlocked on camera tap). */
export const primePlaybackElement = (url: string): Promise<boolean> => {
  const existing = playbackPrimeBySource.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const blobUrl = await ensureVideoBlobForPlayback(url, 25_000);
    if (!blobUrl) return false;

    const video = getPlaybackVideoElement();
    if (
      video.src === blobUrl &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0
    ) {
      return true;
    }

    video.muted = true;
    video.src = blobUrl;
    video.load();
    const ready = await waitVideoCanPlay(video, 20_000);
    return ready && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  })();

  playbackPrimeBySource.set(url, promise);
  return promise;
};

export const isPlaybackElementPrimed = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const blobUrl = blobUrlBySource.get(url);
  if (!blobUrl) return false;
  const video = getPlaybackVideoElement();
  return (
    video.src === blobUrl &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0
  );
};

/** Wait briefly for an in-flight or new blob prefetch — instant play when ready. */
export const waitForVideoBlob = async (url: string, maxMs = 2_000): Promise<string | null> => {
  const cached = blobUrlBySource.get(url);
  if (cached) return cached;

  prefetchVideo(url);
  const pending = pendingBySource.get(url) ?? startBlobFetch(url);

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

  return ensureVideoBlobForPlayback(url, timeoutMs);
};

/** True when this clip should stream over HTTP instead of waiting on a full blob. */
export const shouldStreamVideoProgressively = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return progressiveOnlyBySource.has(url);
};

/** Prefer a fully cached blob URL when available (instant start). */
export const getPrefetchedBlobUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return blobUrlBySource.get(url) ?? null;
};

export const isVideoBlobReady = (url: string | null | undefined): boolean =>
  Boolean(url && blobUrlBySource.has(url));

export const isVideoDecoderPrimed = (url: string | null | undefined): boolean => {
  if (!url) return false;
  if (isVideoBlobReady(url)) return true;
  const video = primedVideos.get(url);
  return Boolean(
    video &&
    video.src.startsWith('blob:') &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0,
  );
};

/** Blob URL from cache or a fully decoded hidden primed element. */
export const getPrimedVideoBlobUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const cached = blobUrlBySource.get(url);
  if (cached) return cached;
  const video = primedVideos.get(url);
  if (
    video?.src.startsWith('blob:') &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0
  ) {
    blobUrlBySource.set(url, video.src);
    return video.src;
  }
  return null;
};

/** Wait up to `timeoutMs` for a same-origin blob; each caller gets its own deadline. */
export const ensureVideoBlobForPlayback = async (
  url: string,
  timeoutMs = 20_000,
): Promise<string | null> => {
  const immediate = getPrimedVideoBlobUrl(url);
  if (immediate) return immediate;

  const pending = startBlobFetch(url, true);
  const raced = await Promise.race([
    pending,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
  ]);
  const blob = getPrimedVideoBlobUrl(url) ?? raced;
  if (!blob && !progressiveOnlyBySource.has(url)) {
    viewerLog('debug', 'video blob not ready — streaming instead', {
      timeoutMs,
      url: url.slice(0, 96),
    });
  }
  return blob;
};

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

    const primedBlob = getPrimedVideoBlobUrl(preferredUrl);
    if (primedBlob) return primedBlob;

    const blobUrl = await waitForVideoBlob(preferredUrl, blobWaitMs);
    if (blobUrl) return blobUrl;

    const ensured = await ensureVideoBlobForPlayback(preferredUrl, blobWaitMs);
    if (ensured) return ensured;
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
    const url = viewerService.getMappingVideoUrl(albumSlug, target.id, target.videoMediaId);
    prefetchVideo(url);
  }
};
