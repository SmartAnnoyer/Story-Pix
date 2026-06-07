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
            images: HTMLImageElement[],
            progressCallback?: (progress: number) => void,
          ) => Promise<void>;
          exportData: () => Promise<ArrayBuffer>;
        };
      };
    };
  }
}

/**
 * MindAR 1.2.x `mindar-image.prod.js` on npm is ESM-only (breaks classic script tags).
 * Use 1.1.4 IIFE builds from jsDelivr — same as official MindAR HTML examples.
 * @see https://hiukim.github.io/mind-ar-js-doc/quick-start/compile
 */
const MINDAR_VERSION = '1.1.4';
const MINDAR_IMAGE_SCRIPT = `https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@${MINDAR_VERSION}/dist/mindar-image.prod.js`;
const AFRAME_SCRIPT = 'https://aframe.io/releases/1.2.0/aframe.min.js';
const MINDAR_AFRAME_SCRIPT = `https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@${MINDAR_VERSION}/dist/mindar-image-aframe.prod.js`;

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

    // Drop broken/partial tags (e.g. failed ESM load from an older deploy)
    existing?.remove();

    const script = document.createElement('script');
    script.src = src;
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

export const compileMindFile = async (imageUrls: string[]): Promise<string> => {
  if (!imageUrls.length) {
    throw new Error('No tracking images available');
  }

  await loadCompilerScript();

  const Compiler = window.MINDAR?.IMAGE?.Compiler;
  if (!Compiler) {
    throw new Error('MindAR compiler unavailable');
  }

  const images = await Promise.all(imageUrls.map((url) => loadImage(url)));
  const compiler = new Compiler();

  await Promise.race([
    compiler.compileImageTargets(images, (progress) => {
      if (progress > 0 && progress < 1) {
        console.info(`[Story-pix AR] compiling targets: ${Math.round(progress * 100)}%`);
      }
    }),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('MindAR compile timed out')), COMPILE_TIMEOUT_MS);
    }),
  ]);

  const buffer = await compiler.exportData();
  const blob = new Blob([buffer]);
  return URL.createObjectURL(blob);
};

export const getMindCacheKey = (albumSlug: string, targetIds: string[]) =>
  `storypix-mind-v3-${MINDAR_VERSION}-${albumSlug}-${targetIds.join('-')}`;
