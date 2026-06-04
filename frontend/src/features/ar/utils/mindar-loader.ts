declare global {
  interface Window {
    AFRAME?: unknown;
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

const AFRAME_SCRIPT = 'https://aframe.io/releases/1.5.0/aframe.min.js';
const MINDAR_IMAGE_SCRIPT = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
const MINDAR_AFRAME_SCRIPT =
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js';

const IMAGE_LOAD_TIMEOUT_MS = 30_000;
const COMPILE_TIMEOUT_MS = 120_000;
const SCRIPT_READY_TIMEOUT_MS = 15_000;

let compilerScriptsPromise: Promise<void> | null = null;
let sceneScriptsPromise: Promise<void> | null = null;

const waitUntil = (label: string, predicate: () => boolean, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`${label} was not ready within ${timeoutMs}ms`));
        return;
      }
      window.setTimeout(tick, 50);
    };

    tick();
  });

const loadScriptSequential = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.defer = false;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

/** MindAR compiler only — does not require A-Frame. */
const loadMindarCompilerScripts = (): Promise<void> => {
  if (compilerScriptsPromise) return compilerScriptsPromise;

  compilerScriptsPromise = (async () => {
    await loadScriptSequential(MINDAR_IMAGE_SCRIPT);
    await waitUntil(
      'MindAR compiler',
      () => Boolean(window.MINDAR?.IMAGE?.Compiler),
      SCRIPT_READY_TIMEOUT_MS,
    );
  })().catch((error) => {
    compilerScriptsPromise = null;
    throw error;
  });

  return compilerScriptsPromise;
};

/** A-Frame + MindAR A-Frame components for the live AR scene. */
export const loadArScripts = (): Promise<void> => {
  if (sceneScriptsPromise) return sceneScriptsPromise;

  sceneScriptsPromise = (async () => {
    await loadScriptSequential(AFRAME_SCRIPT);
    await waitUntil('A-Frame', () => Boolean(window.AFRAME), SCRIPT_READY_TIMEOUT_MS);
    await loadScriptSequential(MINDAR_AFRAME_SCRIPT);
    await waitUntil(
      'MindAR A-Frame',
      () => Boolean(window.AFRAME && window.MINDAR),
      SCRIPT_READY_TIMEOUT_MS,
    );
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
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error(`Invalid image dimensions: ${url}`));
        return;
      }
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

  await loadMindarCompilerScripts();

  const Compiler = window.MINDAR?.IMAGE?.Compiler;
  if (!Compiler) {
    throw new Error('MindAR compiler unavailable');
  }

  const images = await Promise.all(imageUrls.map((url) => loadImage(url)));

  const compiler = new Compiler();

  await Promise.race([
    compiler.compileImageTargets(images, (progress) => {
      if (progress > 0 && progress < 1) {
        console.debug(`[Story-pix AR] compile progress: ${Math.round(progress * 100)}%`);
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
  `storypix-mind-${albumSlug}-${targetIds.join('-')}`;
