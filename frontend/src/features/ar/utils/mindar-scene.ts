export type CameraFacing = 'environment' | 'user';

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
    targetCount: number;
    facingMode?: CameraFacing;
  },
): MindArSceneResult => {
  const scene = document.createElement('a-scene');
  scene.setAttribute(
    'mindar-image',
    [
      `imageTargetSrc: ${options.mindUrl}`,
      'autoStart: true',
      `maxTrack: ${Math.max(options.targetCount, 1)}`,
      'uiLoading: no',
      'uiScanning: no',
      'uiError: no',
      'filterMinCF: 0.001',
      'filterBeta: 1000',
      'warmupTolerance: 2',
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

  const targetEntities: HTMLElement[] = [];

  for (let mindIndex = 0; mindIndex < options.targetCount; mindIndex += 1) {
    const entity = document.createElement('a-entity');
    entity.setAttribute('mindar-image-target', `targetIndex: ${mindIndex}`);
    scene.appendChild(entity);
    targetEntities.push(entity);
  }

  host.replaceChildren();
  host.appendChild(scene);

  return { scene, targetEntities };
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
    arSystem?.controller?.stopProcessVideo();
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
  } catch {
    // ignore teardown errors
  }
  host.replaceChildren();
};
