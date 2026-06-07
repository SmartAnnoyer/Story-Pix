export type CameraFacing = 'environment' | 'user';

export type MindArSceneTarget = {
  videoUrl: string | null;
  width: number;
  height: number;
};

export type MindArSceneResult = {
  scene: Element;
  targetEntities: HTMLElement[];
};

type MindArImageSystem = {
  pause: (keepVideo?: boolean) => void;
  unpause: () => void;
  controller?: {
    inputWidth: number;
    inputHeight: number;
    dummyRun: (video: HTMLVideoElement) => Promise<void>;
    processVideo: (video: HTMLVideoElement) => void;
    stopProcessVideo: () => void;
  };
  video?: HTMLVideoElement | null;
  _resize?: () => void;
};

export const getMindArSystem = (host: HTMLElement): MindArImageSystem | null => {
  const scene = host.querySelector('a-scene') as HTMLElement & {
    systems?: Record<string, MindArImageSystem>;
  };
  return scene?.systems?.['mindar-image-system'] ?? null;
};

export const buildMindArScene = (
  host: HTMLElement,
  options: {
    mindUrl: string;
    targets: MindArSceneTarget[];
    facingMode?: CameraFacing;
  },
): MindArSceneResult => {
  const scene = document.createElement('a-scene');
  scene.setAttribute(
    'mindar-image',
    [
      `imageTargetSrc: ${options.mindUrl}`,
      'autoStart: true',
      `maxTrack: ${Math.max(options.targets.length, 1)}`,
      'uiLoading: no',
      'uiScanning: no',
      'uiError: no',
      'filterMinCF: 0.001',
      'filterBeta: 1000',
      'warmupTolerance: 3',
      'missTolerance: 5',
    ].join('; '),
  );
  scene.setAttribute('color-space', 'sRGB');
  scene.setAttribute('embedded', '');
  scene.setAttribute('renderer', 'alpha: true; colorManagement: true, physicallyCorrectLights');
  scene.setAttribute('vr-mode-ui', 'enabled: false');
  scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
  scene.dataset.cameraFacing = options.facingMode ?? 'environment';
  scene.style.position = 'absolute';
  scene.style.inset = '0';

  const camera = document.createElement('a-camera');
  camera.setAttribute('position', '0 0 0');
  camera.setAttribute('look-controls', 'enabled: false');
  scene.appendChild(camera);

  const assets = document.createElement('a-assets');
  assets.setAttribute('timeout', '120000');

  const targetEntities: HTMLElement[] = [];

  options.targets.forEach((target, mindIndex) => {
    const entity = document.createElement('a-entity');
    entity.setAttribute('mindar-image-target', `targetIndex: ${mindIndex}`);

    if (target.videoUrl) {
      const videoEl = document.createElement('video');
      videoEl.id = `mindar-target-video-${mindIndex}`;
      videoEl.crossOrigin = 'anonymous';
      videoEl.preload = 'auto';
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.muted = true;
      videoEl.src = target.videoUrl;
      assets.appendChild(videoEl);

      const aspect =
        target.width > 0 && target.height > 0 ? target.width / target.height : 35 / 45;
      const planeHeight = 1;
      const planeWidth = planeHeight * aspect;

      const plane = document.createElement('a-video');
      plane.setAttribute('src', `#mindar-target-video-${mindIndex}`);
      plane.setAttribute('position', '0 0 0.05');
      plane.setAttribute('height', String(planeHeight));
      plane.setAttribute('width', String(planeWidth));
      plane.setAttribute('rotation', '0 0 0');
      plane.setAttribute('material', 'transparent: false');
      entity.appendChild(plane);
    }

    scene.appendChild(entity);
    targetEntities.push(entity);
  });

  if (assets.childElementCount > 0) {
    scene.insertBefore(assets, scene.firstChild);
  }

  host.replaceChildren();
  host.appendChild(scene);

  return { scene, targetEntities };
};

const waitForVideoData = (video: HTMLVideoElement): Promise<void> =>
  new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve();
      return;
    }

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video failed to load'));
    };
    const cleanup = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    video.load();
  });

export const preloadTargetVideos = async (host: HTMLElement): Promise<void> => {
  const videos = host.querySelectorAll('video[id^="mindar-target-video-"]');
  await Promise.all(
    Array.from(videos).map(async (element) => {
      const video = element as HTMLVideoElement;
      if (!video.src) return;
      try {
        await waitForVideoData(video);
      } catch {
        // Individual preload failures are handled when playback starts.
      }
    }),
  );
};

export const playTargetVideo = async (
  host: HTMLElement,
  mindIndex: number,
  withSound = true,
): Promise<boolean> => {
  const video = host.querySelector(`#mindar-target-video-${mindIndex}`) as HTMLVideoElement | null;
  if (!video?.src) return false;

  try {
    await waitForVideoData(video);
    video.muted = !withSound;
    await video.play();
    return true;
  } catch {
    try {
      video.muted = true;
      await video.play();
      return true;
    } catch {
      return false;
    }
  }
};

export const pauseTargetVideos = (host: HTMLElement): void => {
  host.querySelectorAll('video[id^="mindar-target-video-"]').forEach((element) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = 0;
  });
};

export const getCameraVideo = (host: HTMLElement): HTMLVideoElement | null => {
  for (const element of host.querySelectorAll('video')) {
    const video = element as HTMLVideoElement;
    if (video.srcObject) {
      return video;
    }
  }
  return null;
};

export const isCameraPreviewLive = (host: HTMLElement): boolean => {
  const video = getCameraVideo(host);
  return Boolean(video && video.videoWidth > 0 && !video.paused);
};

export const flipMindArCamera = async (
  host: HTMLElement,
  nextFacing: CameraFacing,
): Promise<void> => {
  const video = getCameraVideo(host);
  const arSystem = getMindArSystem(host);
  if (!video || !arSystem?.controller) {
    throw new Error('AR camera is not ready yet');
  }

  arSystem.controller.stopProcessVideo();

  const previousStream = video.srcObject as MediaStream | null;
  previousStream?.getTracks().forEach((track) => track.stop());

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: nextFacing } },
  });

  video.srcObject = stream;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Camera stream failed'));
  });
  await video.play();

  arSystem.controller.inputWidth = video.videoWidth;
  arSystem.controller.inputHeight = video.videoHeight;
  arSystem._resize?.call(arSystem);
  await arSystem.controller.dummyRun(video);
  arSystem.controller.processVideo(video);

  const scene = host.querySelector('a-scene') as HTMLElement | null;
  if (scene) scene.dataset.cameraFacing = nextFacing;
};

export const destroyMindArScene = (host: HTMLElement): void => {
  const arSystem = getMindArSystem(host);
  const video = getCameraVideo(host);
  try {
    pauseTargetVideos(host);
    arSystem?.controller?.stopProcessVideo();
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
  } catch {
    // ignore teardown errors
  }
  host.replaceChildren();
};
