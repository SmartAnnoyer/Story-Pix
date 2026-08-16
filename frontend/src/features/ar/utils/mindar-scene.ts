import { installPoseCapture } from './target-projection';

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
    trackingStates?: Array<{
      showing?: boolean;
      isTracking?: boolean;
      trackCount?: number;
      trackMiss?: number;
    }>;
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

/** Image-tracked overlay: camera feed below, transparent WebGL canvas with the mapped plane. */
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
      `maxTrack: 1`,
      'uiLoading: no',
      'uiScanning: no',
      'uiError: no',
      'filterMinCF: 0.0001',
      'filterBeta: 1000',
      'warmupTolerance: 5',
      'missTolerance: 10',
    ].join('; '),
  );
  scene.setAttribute('color-space', 'sRGB');
  scene.setAttribute('embedded', '');
  scene.setAttribute(
    'renderer',
    'alpha: true; colorManagement: true; physicallyCorrectLights: true',
  );
  scene.removeAttribute('background');
  scene.setAttribute('vr-mode-ui', 'enabled: false');
  scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
  scene.dataset.cameraFacing = options.facingMode ?? 'environment';
  scene.style.position = 'absolute';
  scene.style.inset = '0';
  scene.style.pointerEvents = 'none';

  const camera = document.createElement('a-camera');
  camera.setAttribute('position', '0 0 0');
  camera.setAttribute('look-controls', 'enabled: false; magicWindowTrackingEnabled: false');
  camera.setAttribute('wasd-controls', 'enabled: false');
  scene.appendChild(camera);

  const targetEntities: HTMLElement[] = [];

  for (let mindIndex = 0; mindIndex < options.targetCount; mindIndex += 1) {
    const entity = document.createElement('a-entity');
    entity.setAttribute('mindar-image-target', `targetIndex: ${mindIndex}`);
    entity.addEventListener('loaded', () => installPoseCapture(entity));
    scene.appendChild(entity);
    targetEntities.push(entity);
    installPoseCapture(entity);
  }

  host.replaceChildren();
  host.appendChild(scene);

  return { scene, targetEntities };
};

export const getCameraVideo = (host: HTMLElement): HTMLVideoElement | null => {
  const arSystem = getMindArSystem(host);
  if (arSystem?.video) {
    return arSystem.video;
  }

  const withStream = host.querySelector('video') as HTMLVideoElement | null;
  if (withStream?.srcObject) {
    return withStream;
  }

  return (host.querySelector('video') as HTMLVideoElement | null) ?? null;
};

/** Keep the live camera <video> visible. WebGL is transparent so the mapped plane shows on the photo. */
export const ensureTransparentRenderer = (host: HTMLElement): void => {
  const scene = host.querySelector('a-scene') as
    | (HTMLElement & {
        renderer?: {
          setClearColor: (color: number, alpha: number) => void;
          setClearAlpha?: (alpha: number) => void;
        };
        object3D?: { background: unknown };
        canvas?: HTMLCanvasElement;
      })
    | null;
  if (!scene) return;

  scene.removeAttribute('background');
  if (scene.object3D) scene.object3D.background = null;
  scene.renderer?.setClearColor(0x000000, 0);
  scene.renderer?.setClearAlpha?.(0);
  if (scene.canvas) {
    scene.canvas.style.background = 'transparent';
    scene.canvas.style.backgroundColor = 'transparent';
  }

  const cameraEl = host.querySelector('a-camera') as
    | (HTMLElement & {
        getObject3D?: (type: string) => { near: number; updateProjectionMatrix: () => void };
      })
    | null;
  const camera = cameraEl?.getObject3D?.('camera');
  if (camera && camera.near > 0.05) {
    camera.near = 0.01;
    camera.updateProjectionMatrix();
  }

  if (host.dataset.spClearLoop === '1') return;
  host.dataset.spClearLoop = '1';
  const keepTransparent = () => {
    if (!host.isConnected) {
      host.dataset.spClearLoop = '0';
      return;
    }
    const live = host.querySelector('a-scene') as typeof scene;
    live?.renderer?.setClearColor(0x000000, 0);
    live?.renderer?.setClearAlpha?.(0);
    window.requestAnimationFrame(keepTransparent);
  };
  window.requestAnimationFrame(keepTransparent);
};

/** Style and play the MindAR camera feed under a transparent tracking canvas. */
export const ensureCameraPreviewVisible = (host: HTMLElement): HTMLVideoElement | null => {
  const video = getCameraVideo(host);
  if (!video) return null;

  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.objectFit = 'cover';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.position = 'absolute';
  video.style.inset = '0';
  video.style.opacity = '1';
  video.style.zIndex = '1';
  video.style.pointerEvents = 'none';

  if (video.paused) {
    void video.play().catch(() => undefined);
  }

  ensureTransparentRenderer(host);
  return video;
};

export const isCameraPreviewLive = (host: HTMLElement): boolean => {
  ensureCameraPreviewVisible(host);
  const video = getCameraVideo(host);
  if (!video) return false;

  const stream = video.srcObject as MediaStream | null;
  const hasLiveTrack = Boolean(
    stream?.getVideoTracks().some((track) => track.readyState === 'live'),
  );

  if (
    hasLiveTrack &&
    (video.videoWidth > 0 || video.readyState >= HTMLMediaElement.HAVE_METADATA)
  ) {
    return true;
  }

  return video.videoWidth > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
};

/** Attach an already-open MediaStream to MindAR (avoids a second getUserMedia on iOS). */
export const attachCameraStream = async (
  host: HTMLElement,
  stream: MediaStream,
  facingMode: CameraFacing,
): Promise<boolean> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const video = getCameraVideo(host);
    const arSystem = getMindArSystem(host);

    if (video) {
      try {
        arSystem?.controller?.stopProcessVideo();
      } catch {
        // ignore — controller may not be ready yet
      }

      const previous = video.srcObject as MediaStream | null;
      if (previous && previous !== stream) {
        previous.getTracks().forEach((track) => track.stop());
      }

      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.muted = true;
      video.playsInline = true;

      try {
        if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve, reject) => {
            const onMeta = () => {
              cleanup();
              resolve();
            };
            const onErr = () => {
              cleanup();
              reject(new Error('Camera stream failed'));
            };
            const cleanup = () => {
              video.removeEventListener('loadedmetadata', onMeta);
              video.removeEventListener('error', onErr);
            };
            video.addEventListener('loadedmetadata', onMeta);
            video.addEventListener('error', onErr);
          });
        }
        await video.play();
      } catch {
        // keep trying — A-Frame may recreate the element
      }

      ensureCameraPreviewVisible(host);

      if (arSystem?.controller && video.videoWidth > 0) {
        arSystem.controller.inputWidth = video.videoWidth;
        arSystem.controller.inputHeight = video.videoHeight;
        arSystem._resize?.call(arSystem);
        try {
          await arSystem.controller.dummyRun(video);
          arSystem.controller.processVideo(video);
        } catch {
          // processVideo may throw before arReady; retry
        }
      }

      const scene = host.querySelector('a-scene') as HTMLElement | null;
      if (scene) scene.dataset.cameraFacing = facingMode;

      if (isCameraPreviewLive(host)) {
        return true;
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 200));
  }

  return isCameraPreviewLive(host);
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
  ensureCameraPreviewVisible(host);

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
