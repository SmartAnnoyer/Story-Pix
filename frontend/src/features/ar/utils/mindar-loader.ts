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

const SCRIPT_URLS = [
  'https://aframe.io/releases/1.5.0/aframe.min.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
];

const IMAGE_LOAD_TIMEOUT_MS = 30_000;
const COMPILE_TIMEOUT_MS = 90_000;

let scriptsPromise: Promise<void> | null = null;

export const loadArScripts = (): Promise<void> => {
  if (scriptsPromise) return scriptsPromise;

  scriptsPromise = Promise.all(
    SCRIPT_URLS.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }

          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.head.appendChild(script);
        }),
    ),
  ).then(() => undefined);

  return scriptsPromise;
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

  await loadArScripts();

  const Compiler = window.MINDAR?.IMAGE?.Compiler;
  if (!Compiler) {
    throw new Error('MindAR compiler unavailable');
  }

  const images = await Promise.all(imageUrls.map((url) => loadImage(url)));

  const compiler = new Compiler();

  await Promise.race([
    compiler.compileImageTargets(images),
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
