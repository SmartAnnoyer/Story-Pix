import { viewerLog } from './viewer-debug-log';

const MIND_FETCH_TIMEOUT_MS = 30_000;
const mindBlobByUrl = new Map<string, string>();
const mindFetchPending = new Map<string, Promise<{ url: string; revoke: boolean }>>();

/** Warm the .mind file without blocking the AR scene critical path. */
export const prefetchMindFileBlob = (url: string | null | undefined): void => {
  if (!url || url.startsWith('blob:') || mindBlobByUrl.has(url) || mindFetchPending.has(url)) {
    return;
  }
  void resolveMindUrlForScene(url).catch(() => undefined);
};

export const resolveMindUrlForScene = async (
  url: string,
): Promise<{ url: string; revoke: boolean }> => {
  if (url.startsWith('blob:')) {
    return { url, revoke: false };
  }

  const cached = mindBlobByUrl.get(url);
  if (cached) {
    return { url: cached, revoke: false };
  }

  const inflight = mindFetchPending.get(url);
  if (inflight) return inflight;

  const promise = (async (): Promise<{ url: string; revoke: boolean }> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), MIND_FETCH_TIMEOUT_MS);
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
      const blobUrl = URL.createObjectURL(blob);
      mindBlobByUrl.set(url, blobUrl);
      viewerLog('info', 'mind file fetch ok', { bytes: blob.size, url: url.slice(0, 80) });
      return { url: blobUrl, revoke: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      viewerLog('error', 'mind file fetch failed', { message, url: url.slice(0, 80) });
      throw error instanceof Error ? error : new Error(message);
    } finally {
      window.clearTimeout(timer);
      mindFetchPending.delete(url);
    }
  })();

  mindFetchPending.set(url, promise);
  return promise;
};
