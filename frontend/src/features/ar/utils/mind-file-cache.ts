import { viewerLog } from './viewer-debug-log';

const MIND_FETCH_TIMEOUT_MS = 30_000;
/** Give up on the direct CDN URL quickly when an API fallback exists. */
const MIND_PRIMARY_TIMEOUT_MS = 8_000;
const mindBlobByUrl = new Map<string, string>();
const mindFetchPending = new Map<string, Promise<{ url: string; revoke: boolean }>>();

/** Warm the .mind file without blocking the AR scene critical path. */
export const prefetchMindFileBlob = (
  url: string | null | undefined,
  fallbackUrl?: string | null,
): void => {
  if (!url || url.startsWith('blob:') || mindBlobByUrl.has(url) || mindFetchPending.has(url)) {
    return;
  }
  void resolveMindUrlForScene(url, fallbackUrl).catch(() => undefined);
};

const fetchMindBlobUrl = async (url: string, timeoutMs: number): Promise<string> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    viewerLog('info', 'mind file fetch start', { url: url.slice(0, 80) });
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Could not download AR scan file (${response.status})`);
    }
    const blob = await response.blob();
    viewerLog('info', 'mind file fetch ok', { bytes: blob.size, url: url.slice(0, 80) });
    return URL.createObjectURL(blob);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    viewerLog('error', 'mind file fetch failed', { message, url: url.slice(0, 80) });
    throw error instanceof Error ? error : new Error(message);
  } finally {
    window.clearTimeout(timer);
  }
};

/**
 * Download the scan file once per URL and hand MindAR a blob URL.
 * When `fallbackUrl` is given (API proxy), it is tried if the primary (CDN) fails.
 */
export const resolveMindUrlForScene = async (
  url: string,
  fallbackUrl?: string | null,
): Promise<{ url: string; revoke: boolean }> => {
  if (url.startsWith('blob:')) {
    return { url, revoke: false };
  }

  const cached = mindBlobByUrl.get(url) ?? (fallbackUrl ? mindBlobByUrl.get(fallbackUrl) : null);
  if (cached) {
    return { url: cached, revoke: false };
  }

  const inflight = mindFetchPending.get(url);
  if (inflight) return inflight;

  const promise = (async (): Promise<{ url: string; revoke: boolean }> => {
    try {
      let blobUrl: string;
      try {
        blobUrl = await fetchMindBlobUrl(
          url,
          fallbackUrl ? MIND_PRIMARY_TIMEOUT_MS : MIND_FETCH_TIMEOUT_MS,
        );
      } catch (error) {
        if (!fallbackUrl || fallbackUrl === url) throw error;
        viewerLog('warn', 'mind file direct URL failed — using API fallback');
        blobUrl = await fetchMindBlobUrl(fallbackUrl, MIND_FETCH_TIMEOUT_MS);
        mindBlobByUrl.set(fallbackUrl, blobUrl);
      }
      mindBlobByUrl.set(url, blobUrl);
      return { url: blobUrl, revoke: false };
    } finally {
      mindFetchPending.delete(url);
    }
  })();

  mindFetchPending.set(url, promise);
  return promise;
};
