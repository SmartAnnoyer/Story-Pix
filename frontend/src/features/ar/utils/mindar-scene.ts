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
      // MindAR defaults: filterMinCF 0.001, filterBeta 1000 — do not use tiny filterBeta values.
      'filterMinCF: 0.001',
      'filterBeta: 1000',
      'warmupTolerance: 1',
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
  const targetEntities: HTMLElement[] = [];

  options.targets.forEach((target, mindIndex) => {
    const entity = document.createElement('a-entity');
    entity.setAttribute('mindar-image-target', `targetIndex: ${mindIndex}`);

    if (target.videoUrl) {
      const videoEl = document.createElement('video');
      videoEl.id = `mindar-target-video-${mindIndex}`;
      videoEl.setAttribute('src', target.videoUrl);
      videoEl.setAttribute('crossorigin', 'anonymous');
      videoEl.setAttribute('loop', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.muted = true;
      assets.appendChild(videoEl);

      const aspect =
        target.width > 0 && target.height > 0 ? target.width / target.height : 35 / 45;
      const planeHeight = 1;
      const planeWidth = planeHeight * aspect;

      const plane = document.createElement('a-video');
      plane.setAttribute('src', `#mindar-target-video-${mindIndex}`);
      plane.setAttribute('position', '0 0 0');
      plane.setAttribute('height', String(planeHeight));
      plane.setAttribute('width', String(planeWidth));
      plane.setAttribute('rotation', '0 0 0');
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

export const playTargetVideo = (host: HTMLElement, mindIndex: number, withSound = true): void => {
  const video = host.querySelector(`#mindar-target-video-${mindIndex}`) as HTMLVideoElement | null;
  if (!video) return;

  video.muted = !withSound;
  void video.play().catch(() => {
    video.muted = true;
    void video.play().catch(() => undefined);
  });
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

/** Swap front/back camera without rebuilding the whole scene. */
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
