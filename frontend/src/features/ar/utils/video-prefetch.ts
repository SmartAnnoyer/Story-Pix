/** Prefetch mapping videos so match → play is near-instant. */

const prefetchedUrls = new Set<string>();
const blobUrlBySource = new Map<string, string>();
const pendingBySource = new Map<string, Promise<string | null>>();

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

  // Also warm HTTP cache / optional blob for small-enough responses later
  if (!pendingBySource.has(url)) {
    const pending = fetch(url, { mode: 'cors', credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) return null;
        // Only blob-cache smaller clips (< 12 MB) to avoid blowing mobile memory
        const lengthHeader = response.headers.get('content-length');
        const length = lengthHeader ? Number(lengthHeader) : NaN;
        if (Number.isFinite(length) && length > 12_000_000) {
          // Consume a bit of the stream so CDN/cache warms, then abort
          await response.body?.cancel().catch(() => undefined);
          return null;
        }
        const blob = await response.blob();
        if (blob.size > 12_000_000) return null;
        const blobUrl = URL.createObjectURL(blob);
        blobUrlBySource.set(url, blobUrl);
        return blobUrl;
      })
      .catch(() => null);

    pendingBySource.set(url, pending);
  }
};

/** Prefer a fully cached blob URL when available (instant start). */
export const getPrefetchedBlobUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return blobUrlBySource.get(url) ?? null;
};

export const resolvePlayableVideoUrl = async (
  preferredUrl: string | null | undefined,
): Promise<string | null> => {
  if (!preferredUrl) return null;
  const cached = blobUrlBySource.get(preferredUrl);
  if (cached) return cached;

  const pending = pendingBySource.get(preferredUrl);
  if (pending) {
    const blobUrl = await Promise.race([
      pending,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 80)),
    ]);
    if (blobUrl) return blobUrl;
  }

  return preferredUrl;
};

export const prefetchManifestVideos = (
  targets: Array<{ videoUrl?: string | null; videoAvailable?: boolean }>,
): void => {
  for (const target of targets) {
    if (target.videoAvailable === false) continue;
    if (target.videoUrl) prefetchVideo(target.videoUrl);
  }
};
