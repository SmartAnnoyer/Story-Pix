import type { ViewerManifest } from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';
import {
  compileMindFile,
  getMindCacheKey,
  loadArScripts,
  loadCompilerScript,
  readMindCache,
} from './mindar-loader';
import { readCachedManifest, writeCachedManifest } from './viewer-manifest-cache';
import { prefetchManifestVideos } from './video-prefetch';

export type WarmupStage = 'manifest' | 'scripts' | 'targets' | 'ready' | 'error';

export type WarmupProgress = {
  progress: number;
  /** User-facing intro line (not technical). */
  message: string;
  /** Optional technical detail — hidden in intro UI. */
  detail?: string | null;
  stage: WarmupStage;
  ready: boolean;
  error: string | null;
  manifest: ViewerManifest | null;
  mindBundle: { url: string; cacheKey: string } | null;
};

export type WarmupResult = WarmupProgress;

const warmupPromises = new Map<string, Promise<WarmupResult>>();
const warmupListeners = new Map<string, Set<(state: WarmupProgress) => void>>();

const emitToListeners = (albumSlug: string, state: WarmupProgress) => {
  const listeners = warmupListeners.get(albumSlug);
  if (!listeners?.size) return;
  const snapshot = { ...state, progress: clampProgress(state.progress) };
  listeners.forEach((listener) => listener(snapshot));
};

const subscribeWarmup = (
  albumSlug: string,
  onUpdate?: (state: WarmupProgress) => void,
) => {
  if (!onUpdate) return () => undefined;
  let set = warmupListeners.get(albumSlug);
  if (!set) {
    set = new Set();
    warmupListeners.set(albumSlug, set);
  }
  set.add(onUpdate);
  return () => {
    set?.delete(onUpdate);
    if (set && set.size === 0) warmupListeners.delete(albumSlug);
  };
};

const prefetchImage = (url: string): void => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
};

const prefetchMindFile = (url: string): void => {
  void fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => undefined);
};

const clampProgress = (value: number) => Math.min(1, Math.max(0, value > 1 ? value / 100 : value));

const emit = (
  onUpdate: ((state: WarmupProgress) => void) | undefined,
  state: WarmupProgress,
) => {
  onUpdate?.({ ...state, progress: clampProgress(state.progress) });
};

const cacheMindBundle = (
  cacheKey: string,
  mindUrl: string,
  targetDimensions: Array<{ width: number; height: number }>,
) => {
  sessionStorage.setItem(
    cacheKey,
    JSON.stringify({
      mindUrl,
      targetDimensions,
    }),
  );
};

const prefetchAlbumAssets = (
  _albumSlug: string,
  manifest: ViewerManifest,
  mindUrl?: string | null,
) => {
  const sortedTargets = [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex);

  // Videos first — time-to-play after match is the product KPI
  prefetchManifestVideos(sortedTargets);

  if (mindUrl) prefetchMindFile(mindUrl);

  if (manifest.album.coverImage) {
    prefetchImage(manifest.album.coverImage);
  }

  for (const target of sortedTargets) {
    const preview = target.photoThumbnailUrl ?? target.photoUrl;
    if (preview) prefetchImage(preview);
  }
};

const buildMindBundle = (albumSlug: string, manifest: ViewerManifest) => {
  const sortedTargets = [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex);
  const mindCacheTargets = sortedTargets.map((target) => ({
    id: target.id,
    photoMediaId: target.photoMediaId,
  }));
  const mindCacheKey = getMindCacheKey(
    albumSlug,
    mindCacheTargets,
    manifest.mindFile?.hash,
  );

  if (!manifest.mindFile?.url) {
    return { mindCacheKey, sortedTargets, mindBundle: null as null };
  }

  cacheMindBundle(
    mindCacheKey,
    manifest.mindFile.url,
    manifest.mindFile.targetDimensions ?? [],
  );

  return {
    mindCacheKey,
    sortedTargets,
    mindBundle: { url: manifest.mindFile.url, cacheKey: mindCacheKey },
  };
};

const runWarmup = async (
  albumSlug: string,
  onUpdate?: (state: WarmupProgress) => void,
): Promise<WarmupResult> => {
  const emitLocal = (state: WarmupProgress) => {
    emit(onUpdate, state);
    emitToListeners(albumSlug, state);
  };

  const cachedManifest = readCachedManifest(albumSlug);

  let state: WarmupProgress = {
    progress: cachedManifest ? 0.22 : 0.08,
    stage: 'manifest',
    message: cachedManifest
      ? `Welcome to ${cachedManifest.album.albumName}`
      : 'Opening your album…',
    detail: null,
    ready: false,
    error: null,
    manifest: cachedManifest,
    mindBundle: null,
  };

  // Instant path: cached manifest + server mind file → ready immediately
  if (cachedManifest?.targets.length && cachedManifest.mindFile?.url) {
    const { mindBundle } = buildMindBundle(albumSlug, cachedManifest);
    prefetchAlbumAssets(albumSlug, cachedManifest, cachedManifest.mindFile.url);
    void loadArScripts().catch(() => undefined);

    state = {
      progress: 0.85,
      stage: 'ready',
      message: 'Your album is ready',
      detail: 'Tap Open camera — point at your printed photo',
      ready: true,
      error: null,
      manifest: cachedManifest,
      mindBundle,
    };
    emitLocal(state);
  } else {
    emitLocal(state);
  }

  try {
    void loadArScripts().catch(() => undefined);

    const manifest = await viewerService.getManifest(albumSlug);
    writeCachedManifest(albumSlug, manifest);

    if (!manifest.targets.length) {
      throw new Error('No published AR mappings for this album yet.');
    }

    const albumName = manifest.album.albumName;
    const { mindCacheKey, sortedTargets, mindBundle: serverMind } = buildMindBundle(
      albumSlug,
      manifest,
    );

    prefetchAlbumAssets(albumSlug, manifest, manifest.mindFile?.url);

    // Fast path: server .mind already built — do NOT wait for AR scripts
    if (serverMind) {
      state = {
        progress: 1,
        stage: 'ready',
        message: 'Your album is ready',
        detail: 'Tap Open camera — point at your printed photo',
        ready: true,
        error: null,
        manifest,
        mindBundle: serverMind,
      };
      emitLocal(state);
      return state;
    }

    state = {
      ...state,
      progress: 0.4,
      manifest,
      stage: 'scripts',
      message: `Welcome to ${albumName}`,
      detail: 'Preparing scan file…',
      ready: false,
      mindBundle: null,
    };
    emitLocal(state);

    await Promise.all([loadArScripts(), loadCompilerScript()]);

    state = {
      ...state,
      progress: 0.55,
      message: 'Analyzing your photos…',
      detail: 'First visit may take a little longer',
      stage: 'targets',
    };
    emitLocal(state);

    const trackingImageUrls = sortedTargets.map((target) =>
      viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId),
    );

    const cachedMind = await readMindCache(mindCacheKey);
    let mindUrl = cachedMind?.mindUrl ?? null;

    if (!mindUrl) {
      const compiled = await compileMindFile(trackingImageUrls, (value) => {
        state = {
          ...state,
          progress: 0.55 + value * 0.4,
          message: 'Almost ready…',
          detail: 'Building your scan experience',
          stage: 'targets',
        };
        emitLocal(state);
      });

      mindUrl = compiled.mindUrl;
      cacheMindBundle(mindCacheKey, compiled.mindUrl, compiled.targetDimensions);
    }

    state = {
      progress: 1,
      stage: 'ready',
      message: 'Your album is ready',
      detail: 'Tap Open camera — point at your printed photo',
      ready: true,
      error: null,
      manifest,
      mindBundle: { url: mindUrl, cacheKey: mindCacheKey },
    };
    emitLocal(state);
    return state;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare viewer';
    if (state.ready && state.mindBundle && state.manifest) {
      return state;
    }
    state = {
      ...state,
      progress: 0,
      stage: 'error',
      message: 'Something went wrong',
      detail: message,
      ready: false,
      error: message,
    };
    emitLocal(state);
    return state;
  }
};

/** Start (or reuse) background warmup for a viewer album slug. */
export const startViewerWarmup = (
  albumSlug: string,
  onUpdate?: (state: WarmupProgress) => void,
): Promise<WarmupResult> => {
  subscribeWarmup(albumSlug, onUpdate);

  const existing = warmupPromises.get(albumSlug);
  if (existing) {
    void existing.then((result) => onUpdate?.(result));
    return existing;
  }

  const promise = runWarmup(albumSlug);
  warmupPromises.set(albumSlug, promise);
  return promise;
};

export const preloadViewerScripts = (): void => {
  void loadArScripts().catch(() => undefined);
};

/** Call as early as possible on viewer routes (before React paints). */
export const bootstrapViewerRoute = (albumSlug: string): void => {
  preloadViewerScripts();
  const cached = readCachedManifest(albumSlug);
  if (cached) {
    prefetchAlbumAssets(albumSlug, cached, cached.mindFile?.url ?? null);
  }
};
