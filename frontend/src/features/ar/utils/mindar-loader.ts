import {
  AFRAME_SCRIPT,
  MINDAR_AFRAME_SCRIPT,
  MINDAR_IMAGE_SCRIPT,
  MINDAR_VERSION,
} from './mindar-cdn';
import { prepareTrackingImage, type TrackingImageDimensions } from './tracking-image';

declare global {
  interface Window {
    AFRAME?: {
      registerComponent?: unknown;
      scenes?: unknown[];
    };
    MINDAR?: {
      IMAGE?: {
        Compiler: new () => {
          compileImageTargets: (
            images: Array<HTMLImageElement | HTMLCanvasElement>,
            progressCallback?: (progress: number) => void,
          ) => Promise<void>;
          exportData: () => Promise<ArrayBuffer>;
        };
      };
    };
  }
}

const IMAGE_LOAD_TIMEOUT_MS = 30_000;
const COMPILE_TIMEOUT_MS = 120_000;
const GLOBAL_READY_TIMEOUT_MS = 45_000;

let compilerScriptsPromise: Promise<void> | null = null;
let sceneScriptsPromise: Promise<void> | null = null;

const waitUntil = (
  predicate: () => boolean,
  label: string,
  timeoutMs = GLOBAL_READY_TIMEOUT_MS,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`${label} was not ready in time`));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;

    if (existing?.dataset.mindarLoaded === 'true') {
      resolve();
      return;
    }

    if (existing) {
      // Index.html may have injected scripts already — wait or resolve if global ready
      const maybeReady = () => {
        if (src.includes('mindar-image.prod') && window.MINDAR?.IMAGE) {
          existing.dataset.mindarLoaded = 'true';
          resolve();
          return true;
        }
        if (src.includes('aframe.min') && window.AFRAME) {
          existing.dataset.mindarLoaded = 'true';
          resolve();
          return true;
        }
        if (src.includes('mindar-image-aframe') && window.AFRAME?.registerComponent) {
          existing.dataset.mindarLoaded = 'true';
          resolve();
          return true;
        }
        return false;
      };

      if (maybeReady()) return;

      existing.addEventListener(
        'load',
        () => {
          existing.dataset.mindarLoaded = 'true';
          resolve();
        },
        { once: true },
      );
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    if (/^https?:\/\//i.test(src)) {
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => {
      script.dataset.mindarLoaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });

/** Loads MindAR compiler (browser IIFE build with window.MINDAR.IMAGE.Compiler). */
export const loadCompilerScript = (): Promise<void> => {
  if (compilerScriptsPromise) return compilerScriptsPromise;

  compilerScriptsPromise = (async () => {
    await loadScript(MINDAR_IMAGE_SCRIPT);
    await waitUntil(() => Boolean(window.MINDAR?.IMAGE?.Compiler), 'MindAR compiler');
  })().catch((error) => {
    compilerScriptsPromise = null;
    throw error;
  });

  return compilerScriptsPromise;
};

/** Loads MindAR + A-Frame in documented order for the live AR scene. */
export const loadArScripts = (): Promise<void> => {
  if (sceneScriptsPromise) return sceneScriptsPromise;

  sceneScriptsPromise = (async () => {
    await loadScript(MINDAR_IMAGE_SCRIPT);
    await waitUntil(() => Boolean(window.MINDAR?.IMAGE), 'MindAR image core');

    await loadScript(AFRAME_SCRIPT);
    await waitUntil(() => Boolean(window.AFRAME), 'A-Frame');

    await loadScript(MINDAR_AFRAME_SCRIPT);
    await waitUntil(() => Boolean(window.AFRAME?.registerComponent), 'MindAR A-Frame integration');
  })().catch((error) => {
    sceneScriptsPromise = null;
    throw error;
  });

  return sceneScriptsPromise;
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      reject(new Error(`Timed out loading image: ${url}`));
    }, IMAGE_LOAD_TIMEOUT_MS);

    img.crossOrigin = 'anonymous';
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load target image: ${url}`));
    };
    img.src = url;
  });

export type CompileMindResult = {
  mindUrl: string;
  targetDimensions: TrackingImageDimensions[];
};

export const compileMindFile = async (
  imageUrls: string[],
  onProgress?: (progress: number) => void,
): Promise<CompileMindResult> => {
  if (!imageUrls.length) {
    throw new Error('No tracking images available');
  }

  onProgress?.(0.02);
  await loadCompilerScript();
  onProgress?.(0.08);

  const Compiler = window.MINDAR?.IMAGE?.Compiler;
  if (!Compiler) {
    throw new Error('MindAR compiler unavailable');
  }

  onProgress?.(0.12);
  const preparedTargets = await Promise.all(
    imageUrls.map(async (url, index) => {
      const image = await loadImage(url);
      const canvas = prepareTrackingImage(image);
      onProgress?.(0.12 + ((index + 1) / imageUrls.length) * 0.18);
      return {
        canvas,
        dimensions: { width: canvas.width, height: canvas.height },
      };
    }),
  );

  const compiler = new Compiler();

  await Promise.race([
    compiler.compileImageTargets(
      preparedTargets.map((target) => target.canvas),
      (progress) => {
        const normalized = progress > 1 ? progress / 100 : progress;
        onProgress?.(0.3 + normalized * 0.55);
      },
    ),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('MindAR compile timed out')), COMPILE_TIMEOUT_MS);
    }),
  ]);

  onProgress?.(0.92);
  const buffer = await compiler.exportData();
  onProgress?.(1);
  const blob = new Blob([buffer]);

  return {
    mindUrl: URL.createObjectURL(blob),
    targetDimensions: preparedTargets.map((target) => target.dimensions),
  };
};

export const getMindCacheKey = (
  albumSlug: string,
  targets: Array<{ id: string; photoMediaId: string }>,
  mindFileHash?: string | null,
) =>
  `storypix-mind-v6-${MINDAR_VERSION}-${mindFileHash ?? 'client'}-${albumSlug}-${targets
    .map((target) => `${target.id}:${target.photoMediaId}`)
    .join('|')}`;

/** Drop stale compiled targets from older cache formats or revoked blob URLs. */
export const clearMindCacheForAlbum = (
  albumSlug: string,
  targets: Array<{ id: string; photoMediaId: string }>,
) => {
  sessionStorage.removeItem(getMindCacheKey(albumSlug, targets));
  for (let version = 3; version <= 4; version += 1) {
    sessionStorage.removeItem(
      `storypix-mind-v${version}-${MINDAR_VERSION}-${albumSlug}-${targets.map((t) => t.id).join('-')}`,
    );
  }
};

const isRemoteMindUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');

const isMindUrlAlive = async (url: string): Promise<boolean> => {
  if (url.startsWith('blob:')) {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  if (isRemoteMindUrl(url)) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  return false;
};

export const readMindCache = async (
  cacheKey: string,
): Promise<CompileMindResult | null> => {
  const raw = sessionStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CompileMindResult;
    if (!parsed.mindUrl) return null;
    if (isRemoteMindUrl(parsed.mindUrl)) {
      return parsed;
    }
    if (!(await isMindUrlAlive(parsed.mindUrl))) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch {
    if (raw.startsWith('blob:')) {
      if (!(await isMindUrlAlive(raw))) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      return { mindUrl: raw, targetDimensions: [] };
    }
  }

  return null;
};
