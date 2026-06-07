import type { ViewerManifest } from '@/types/ar-target.types';
import { viewerService } from '@/services/viewer.service';
import {
  compileMindFile,
  getMindCacheKey,
  loadArScripts,
  loadCompilerScript,
  readMindCache,
} from './mindar-loader';

export type WarmupStage = 'manifest' | 'scripts' | 'targets' | 'ready' | 'error';

export type WarmupProgress = {
  progress: number;
  stage: WarmupStage;
  message: string;
  ready: boolean;
  error: string | null;
  manifest: ViewerManifest | null;
  mindBundle: { url: string; cacheKey: string } | null;
};

export type WarmupResult = WarmupProgress;

const warmupPromises = new Map<string, Promise<WarmupResult>>();

const prefetchImage = (url: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });

const emit = (
  onUpdate: ((state: WarmupProgress) => void) | undefined,
  state: WarmupProgress,
) => {
  onUpdate?.(state);
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

const runWarmup = async (
  albumSlug: string,
  onUpdate?: (state: WarmupProgress) => void,
): Promise<WarmupResult> => {
  let state: WarmupProgress = {
    progress: 0.05,
    stage: 'manifest',
    message: 'Opening your album…',
    ready: false,
    error: null,
    manifest: null,
    mindBundle: null,
  };
  emit(onUpdate, state);

  try {
    const manifest = await viewerService.getManifest(albumSlug);
    if (!manifest.targets.length) {
      throw new Error('No published AR mappings for this album yet.');
    }

    state = {
      ...state,
      progress: 0.2,
      manifest,
      message: `Loading ${manifest.album.albumName}…`,
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

    state = {
      ...state,
      stage: 'scripts',
      progress: 0.28,
      message: manifest.mindFile?.url ? 'Loading AR scanner…' : 'Preparing AR engine…',
    };
    emit(onUpdate, state);

    if (manifest.mindFile?.url) {
      await loadArScripts();

      state = {
        ...state,
        stage: 'targets',
        progress: 0.72,
        message: 'Scan targets ready…',
      };
      emit(onUpdate, state);

      cacheMindBundle(
        mindCacheKey,
        manifest.mindFile.url,
        manifest.mindFile.targetDimensions ?? [],
      );

      await Promise.all(
        sortedTargets
          .map((target) => target.photoThumbnailUrl ?? target.photoUrl)
          .filter(Boolean)
          .map((url) => prefetchImage(url as string)),
      );
    } else {
      await Promise.all([loadArScripts(), loadCompilerScript()]);

      state = {
        ...state,
        progress: 0.42,
        message: 'Analyzing your photos for scanning…',
        stage: 'targets',
      };
      emit(onUpdate, state);

      const trackingImageUrls = sortedTargets.map((target) =>
        viewerService.getTrackingImageUrl(albumSlug, target.id, target.photoMediaId),
      );

      const cached = await readMindCache(mindCacheKey);
      let mindUrl = cached?.mindUrl ?? null;

      if (!mindUrl) {
        const compiled = await compileMindFile(trackingImageUrls, (value) => {
          state = {
            ...state,
            progress: 0.42 + value * 0.38,
            message: 'Building scan targets…',
          };
          emit(onUpdate, state);
        });

        mindUrl = compiled.mindUrl;
        cacheMindBundle(mindCacheKey, compiled.mindUrl, compiled.targetDimensions);
      } else {
        state = {
          ...state,
          progress: 0.72,
          message: 'Scan targets ready…',
        };
        emit(onUpdate, state);
      }

      await Promise.all(trackingImageUrls.map((url) => prefetchImage(url)));

      state = {
        ...state,
        progress: 0.92,
        message: 'Finishing up…',
        mindBundle: { url: mindUrl, cacheKey: mindCacheKey },
      };
      emit(onUpdate, state);

      state = {
        progress: 1,
        stage: 'ready',
        message: 'Ready to scan',
        ready: true,
        error: null,
        manifest,
        mindBundle: { url: mindUrl, cacheKey: mindCacheKey },
      };
      emit(onUpdate, state);
      return state;
    }

    state = {
      progress: 1,
      stage: 'ready',
      message: 'Ready to scan',
      ready: true,
      error: null,
      manifest,
      mindBundle: { url: manifest.mindFile.url, cacheKey: mindCacheKey },
    };
    emit(onUpdate, state);
    return state;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare viewer';
    state = {
      ...state,
      progress: 0,
      stage: 'error',
      message,
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
