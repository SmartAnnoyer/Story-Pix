import type { ViewerManifest } from '@/types/ar-target.types';

const CACHE_PREFIX = 'storypix-manifest-v1-';
const CACHE_TTL_MS = 45 * 60 * 1000;

type CachedManifest = {
  savedAt: number;
  manifest: ViewerManifest;
};

export const readCachedManifest = (albumSlug: string): ViewerManifest | null => {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${albumSlug}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedManifest;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${albumSlug}`);
      return null;
    }

    return parsed.manifest;
  } catch {
    return null;
  }
};

export const writeCachedManifest = (albumSlug: string, manifest: ViewerManifest): void => {
  try {
    const payload: CachedManifest = {
      savedAt: Date.now(),
      manifest,
    };
    sessionStorage.setItem(`${CACHE_PREFIX}${albumSlug}`, JSON.stringify(payload));
  } catch {
    // sessionStorage may be full or blocked
  }
};
