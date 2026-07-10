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
  albumSlug: string,
  manifest: ViewerManifest,
  mindUrl?: string | null,
) => {
  const sortedTargets = [...manifest.targets].sort((a, b) => a.targetIndex - b.targetIndex);

  if (manifest.album.coverImage) {
    prefetchImage(manifest.album.coverImage);
  }

  for (const target of sortedTargets) {
    const preview = target.photoThumbnailUrl ?? target.photoUrl;
    if (preview) prefetchImage(preview);
    prefetchImage(viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId));
  }

  if (mindUrl) prefetchMindFile(mindUrl);
};

const runWarmup = async (
  albumSlug: string,
  onUpdate?: (state: WarmupProgress) => void,
): Promise<WarmupResult> => {
  const cachedManifest = readCachedManifest(albumSlug);

  let state: WarmupProgress = {
    progress: cachedManifest ? 0.18 : 0.08,
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
  emit(onUpdate, state);

  try {
    const scriptsPromise = loadArScripts();

    const manifest = await viewerService.getManifest(albumSlug);
    writeCachedManifest(albumSlug, manifest);

    if (!manifest.targets.length) {
      throw new Error('No published AR mappings for this album yet.');
    }

    const albumName = manifest.album.albumName;

    state = {
      ...state,
      progress: 0.35,
      manifest,
      stage: 'manifest',
      message: `Welcome to ${albumName}`,
      detail: manifest.branding.studioName
        ? `A special experience from ${manifest.branding.studioName}`
        : 'Your photos are about to come alive',
    };
    emit(onUpdate, state);

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

    prefetchAlbumAssets(albumSlug, manifest, manifest.mindFile?.url);

    state = {
      ...state,
      stage: 'scripts',
      progress: 0.5,
      message: 'Preparing your AR experience…',
      detail: 'Hold your printed photo nearby',
    };
    emit(onUpdate, state);

    if (manifest.mindFile?.url) {
      await scriptsPromise;

      cacheMindBundle(
        mindCacheKey,
        manifest.mindFile.url,
        manifest.mindFile.targetDimensions ?? [],
      );

      state = {
        progress: 1,
        stage: 'ready',
        message: 'Your album is ready',
        detail: 'Tap Open camera, then point at your printed photo',
        ready: true,
        error: null,
        manifest,
        mindBundle: { url: manifest.mindFile.url, cacheKey: mindCacheKey },
      };
      emit(onUpdate, state);
      return state;
    }

    const compilerPromise = loadCompilerScript();
    await Promise.all([scriptsPromise, compilerPromise]);

    state = {
      ...state,
      progress: 0.55,
      message: 'Analyzing your photos…',
      detail: 'First visit may take a little longer',
      stage: 'targets',
    };
    emit(onUpdate, state);

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
        emit(onUpdate, state);
      });

      mindUrl = compiled.mindUrl;
      cacheMindBundle(mindCacheKey, compiled.mindUrl, compiled.targetDimensions);
    }

    state = {
      progress: 1,
      stage: 'ready',
      message: 'Your album is ready',
      detail: 'Tap Open camera, then point at your printed photo',
      ready: true,
      error: null,
      manifest,
      mindBundle: { url: mindUrl, cacheKey: mindCacheKey },
    };
    emit(onUpdate, state);
    return state;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare viewer';
    state = {
      ...state,
      progress: 0,
      stage: 'error',
      message: 'Something went wrong',
      detail: message,
      ready: false,
      error: message,
    };
    emit(onUpdate, state);
    return state;
  }
};

/** Start (or reuse) background warmup for a viewer album slug. */
export const startViewerWarmup = (
  albumSlug: string,
  onUpdate?: (state: WarmupProgress) => void,
): Promise<WarmupResult> => {
  const existing = warmupPromises.get(albumSlug);
  if (existing) {
    void existing.then((result) => onUpdate?.(result));
    return existing;
  }

  const promise = runWarmup(albumSlug, onUpdate);
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
