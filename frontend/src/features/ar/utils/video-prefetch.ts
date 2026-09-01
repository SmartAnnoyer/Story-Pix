import { viewerService } from '@/services/viewer.service';
import { getPlaybackVideoElement } from './camera-permission';
import { viewerLog } from './viewer-debug-log';

/** Prefetch mapping videos so match → play is near-instant. */

const prefetchedUrls = new Set<string>();
const blobUrlBySource = new Map<string, string>();
const pendingBySource = new Map<string, Promise<string | null>>();
const decoderPrimeBySource = new Map<string, Promise<boolean>>();
const playbackPrimeBySource = new Map<string, Promise<boolean>>();
const ensureBlobBySource = new Map<string, Promise<string | null>>();
const primedVideos = new Map<string, HTMLVideoElement>();
const MAX_BLOB_CACHE_BYTES = 25_000_000;
const MAX_CONCURRENT_BLOB_FETCHES = 2;

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

const fetchVideoBlobOnce = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
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
    viewerLog('info', 'video blob cached', {
      bytes: blob.size,
      url: url.slice(0, 96),
    });
    return blobUrl;
  } catch (error) {
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

/** Queue network fetches so multi-target albums do not starve mobile bandwidth. */
const startBlobFetch = (url: string, priority = false): Promise<string | null> => {
  const cached = blobUrlBySource.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = pendingBySource.get(url);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    const run = () => {
      activeBlobFetches += 1;
      void fetchVideoBlobOnce(url)
        .then(resolve)
        .finally(() => {
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
  });

  pendingBySource.set(url, promise);
  return promise;
};

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

  let hidden: HTMLVideoElement | null = null;
  try {
    hidden = createHiddenPrimedVideo();
    primedVideos.set(url, hidden);
  } catch {
    // ignore
  }

  void startBlobFetch(url).then((blobUrl) => {
    if (blobUrl && hidden) {
      hidden.src = blobUrl;
      hidden.load();
    }
  });
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

export const warmManifestVideosForPlayback = (
  albumSlug: string,
  targets: Array<{
    id: string;
    videoMediaId: string;
    videoAvailable?: boolean;
    photoMediaId?: string;
  }>,
): Promise<number> => {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const target of targets) {
    if (target.videoAvailable === false) continue;
    const key = target.photoMediaId ?? `mapping:${target.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(viewerService.getMappingVideoUrl(albumSlug, target.id, target.videoMediaId));
  }

  return (async () => {
    let primed = 0;
    for (const url of urls) {
      const blob = await ensureVideoBlobForPlayback(url, 90_000);
      if (blob) {
        primed += 1;
        void primeVideoDecoder(url);
      }
    }
    viewerLog('info', 'manifest video warmup complete', { primed, total: urls.length });
    return primed;
  })();
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

  return ensureVideoBlobForPlayback(url, timeoutMs);
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

/** Block until a same-origin blob is ready for overlay playback (required on iOS). */
export const ensureVideoBlobForPlayback = (
  url: string,
  timeoutMs = 20_000,
): Promise<string | null> => {
  const immediate = getPrimedVideoBlobUrl(url);
  if (immediate) return Promise.resolve(immediate);

  const inflight = ensureBlobBySource.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    boostVideoBlobPriority(url);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const blob = getPrimedVideoBlobUrl(url);
      if (blob) return blob;

      await Promise.race([
        startBlobFetch(url, true),
        new Promise<void>((resolve) => window.setTimeout(resolve, 300)),
      ]);
    }

    const finalBlob = getPrimedVideoBlobUrl(url) ?? (await startBlobFetch(url, true));
    if (!finalBlob) {
      viewerLog('warn', 'video blob ensure timed out', { timeoutMs, url: url.slice(0, 96) });
    }
    return finalBlob;
  })().finally(() => {
    ensureBlobBySource.delete(url);
  });

  ensureBlobBySource.set(url, promise);
  return promise;
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
