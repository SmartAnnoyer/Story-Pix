import { clampOverlayFrame, type OverlayFrame } from './overlay-frame';
import { viewerLog } from './viewer-debug-log';

const MESH_NAME = 'sp-overlay-video-mesh';
const CAMERA_BG_NAME = 'sp-camera-bg';

type ThreeTexture = {
  minFilter: unknown;
  magFilter: unknown;
  generateMipmaps: boolean;
  colorSpace?: unknown;
  encoding?: unknown;
  needsUpdate: boolean;
  dispose: () => void;
};

type ThreeRuntime = {
  CanvasTexture: new (canvas: HTMLCanvasElement) => ThreeTexture;
  Vector3: new (
    x?: number,
    y?: number,
    z?: number,
  ) => {
    set: (x: number, y: number, z: number) => unknown;
    project: (camera: unknown) => { x: number; y: number; z: number };
    x: number;
    y: number;
    z: number;
  };
  PlaneGeometry: new (width: number, height: number) => { dispose: () => void };
  MeshBasicMaterial: new (params: Record<string, unknown>) => {
    map: ThreeTexture | null;
    dispose: () => void;
  };
  Mesh: new (
    geometry: unknown,
    material: unknown,
  ) => {
    name: string;
    position: { set: (x: number, y: number, z: number) => void };
    scale: { set: (x: number, y: number, z: number) => void };
    renderOrder: number;
    visible: boolean;
    frustumCulled: boolean;
    userData: {
      spStopPaint?: () => void;
      spCamCanvas?: HTMLCanvasElement;
      spViewW?: number;
      spViewH?: number;
    };
    geometry: { dispose: () => void; parameters?: { width: number; height: number } };
    localToWorld?: (vector: { x: number; y: number; z: number }) => unknown;
    material: { map: ThreeTexture | null; dispose: () => void };
  };
  LinearFilter: unknown;
  DoubleSide: unknown;
  SRGBColorSpace?: unknown;
  sRGBEncoding?: unknown;
};

type OverlayMesh = {
  visible: boolean;
  position?: { set: (x: number, y: number, z: number) => void };
  scale?: { set: (x: number, y: number, z: number) => void };
  userData?: {
    spStopPaint?: () => void;
    spCamCanvas?: HTMLCanvasElement;
    spViewW?: number;
    spViewH?: number;
  };
  geometry?: { dispose: () => void; parameters?: { width: number; height: number } };
  localToWorld?: (vector: { x: number; y: number; z: number }) => unknown;
  material?: { map?: { dispose: () => void } | null; dispose: () => void };
};

type Object3D = {
  add: (mesh: unknown) => void;
  remove: (mesh: unknown) => void;
  getObjectByName: (name: string) => OverlayMesh | undefined;
};

type EntityWithObject3D = HTMLElement & { object3D?: Object3D };

const getThree = (): ThreeRuntime | null => {
  const frame = window as Window & { AFRAME?: { THREE?: ThreeRuntime } };
  return frame.AFRAME?.THREE ?? null;
};

/** MindAR target is 1 unit wide, height = aspectRatio, origin at center; image y=0 is the top. */
export const overlayFrameToLocalPose = (frame: OverlayFrame, aspectRatio: number) => {
  const overlay = clampOverlayFrame(frame);
  const halfH = aspectRatio * 0.5;
  return {
    x: -0.5 + overlay.x + overlay.width / 2,
    y: halfH - (overlay.y + overlay.height / 2) * aspectRatio,
    z: 0.02,
    width: overlay.width,
    height: overlay.height * aspectRatio,
  };
};

export const detachOverlayVideoPlane = (entity: HTMLElement | null): void => {
  if (!entity) return;
  const object3D = (entity as EntityWithObject3D).object3D;
  const mesh = object3D?.getObjectByName(MESH_NAME);
  if (!object3D || !mesh) return;
  mesh.userData?.spStopPaint?.();
  object3D.remove(mesh);
  mesh.geometry?.dispose();
  mesh.material?.map?.dispose();
  mesh.material?.dispose();
};

export const setOverlayVideoPlaneVisible = (entity: HTMLElement | null, visible: boolean): void => {
  if (!entity) return;
  const mesh = (entity as EntityWithObject3D).object3D?.getObjectByName(MESH_NAME);
  if (mesh) mesh.visible = visible;
};

const drawVideoCover = (
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  destW: number,
  destH: number,
): void => {
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (srcW < 2 || srcH < 2 || destW < 2 || destH < 2) return;
  const scale = Math.max(destW / srcW, destH / srcH);
  const cropW = destW / scale;
  const cropH = destH / scale;
  const sx = (srcW - cropW) / 2;
  const sy = (srcH - cropH) / 2;
  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, destW, destH);
};

/**
 * Draw the live camera inside the A-Frame scene so it stays visible on iOS
 * even when the WebGL canvas is opaque and a second <video> is decoding.
 */
export const attachCameraFeedPlane = (
  cameraEl: HTMLElement | null,
  video: HTMLVideoElement,
  viewWidth: number,
  viewHeight: number,
): void => {
  const THREE = getThree();
  const object3D = (cameraEl as EntityWithObject3D | null)?.object3D;
  if (!THREE || !object3D || video.videoWidth < 2 || viewWidth < 8 || viewHeight < 8) return;

  let mesh = object3D.getObjectByName(CAMERA_BG_NAME) as
    | (OverlayMesh & { material?: { map?: ThreeTexture | null } })
    | undefined;

  if (!mesh) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round(viewWidth));
    canvas.height = Math.max(2, Math.round(viewHeight));
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;

    const created = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
      }),
    );
    created.name = CAMERA_BG_NAME;
    created.renderOrder = -1000;
    created.frustumCulled = false;
    created.visible = true;

    let painting = true;
    const paint = () => {
      if (!painting) return;
      const w = created.userData.spViewW ?? canvas.width;
      const h = created.userData.spViewH ?? canvas.height;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 1) {
        if (w > 8 && canvas.width !== w) canvas.width = w;
        if (h > 8 && canvas.height !== h) canvas.height = h;
        drawVideoCover(ctx, video, canvas.width, canvas.height);
        texture.needsUpdate = true;
      }
      window.requestAnimationFrame(paint);
    };
    created.userData.spStopPaint = () => {
      painting = false;
    };
    created.userData.spCamCanvas = canvas;
    created.userData.spViewW = canvas.width;
    created.userData.spViewH = canvas.height;
    window.requestAnimationFrame(paint);
    object3D.add(created);
    mesh = created;
  }

  if (mesh.userData) {
    mesh.userData.spViewW = Math.max(2, Math.round(viewWidth));
    mesh.userData.spViewH = Math.max(2, Math.round(viewHeight));
  }

  const cam = (
    cameraEl as HTMLElement & {
      getObject3D?: (type: string) => { fov?: number; aspect?: number };
    }
  ).getObject3D?.('camera');
  const distance = 12;
  const fovDeg = cam?.fov && cam.fov > 10 && cam.fov < 150 ? cam.fov : 45;
  const aspect = cam?.aspect && cam.aspect > 0.1 ? cam.aspect : viewWidth / Math.max(viewHeight, 1);
  const height = 2 * Math.tan((fovDeg * Math.PI) / 360) * distance;
  mesh.position?.set(0, 0, -distance);
  mesh.scale?.set(height * aspect, height, 1);
  mesh.visible = true;
};

/** Screen box of the crop plane, using the same camera that draws the AR scene. */
export const getOverlayMeshViewport = (
  host: HTMLElement,
  entity: HTMLElement,
  frame?: OverlayFrame,
  aspectRatio?: number,
): { left: number; top: number; width: number; height: number } | null => {
  const THREE = getThree();
  const scene = host.querySelector('a-scene') as
    | (HTMLElement & { camera?: unknown; canvas?: HTMLCanvasElement })
    | null;
  const mesh = (entity as EntityWithObject3D).object3D?.getObjectByName(MESH_NAME);
  const camera = scene?.camera;
  const pose = frame && aspectRatio ? overlayFrameToLocalPose(frame, aspectRatio) : null;
  const width = mesh?.geometry?.parameters?.width ?? pose?.width;
  const height = mesh?.geometry?.parameters?.height ?? pose?.height;
  if (!THREE || !mesh?.localToWorld || !camera || !width || !height) return null;

  const rect = host.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  const corners: Array<[number, number]> = [
    [-width / 2, height / 2],
    [width / 2, height / 2],
    [width / 2, -height / 2],
    [-width / 2, -height / 2],
  ];
  for (const [x, y] of corners) {
    const point = new THREE.Vector3(x, y, 0);
    mesh.localToWorld(point);
    const projected = point.project(camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return null;
    xs.push((projected.x * 0.5 + 0.5) * rect.width + rect.left);
    ys.push((-projected.y * 0.5 + 0.5) * rect.height + rect.top);
  }

  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const boxWidth = Math.max(...xs) - left;
  const boxHeight = Math.max(...ys) - top;
  if (boxWidth < 8 || boxHeight < 8) return null;
  return { left, top, width: boxWidth, height: boxHeight };
};

/**
 * Parent a video plane to the MindAR target so it covers the tracked photo
 * (origin center, width 1, height = aspect). CanvasTexture is used because iOS
 * VideoTexture often stays blank if it was created before the clip had frames.
 */
export const attachOverlayVideoPlane = (
  entity: HTMLElement,
  video: HTMLVideoElement,
  frame: OverlayFrame,
  aspectRatio: number,
): { ok: boolean; reason: string } => {
  const THREE = getThree();
  const object3D = (entity as EntityWithObject3D).object3D;
  if (!THREE) return { ok: false, reason: 'THREE missing' };
  if (!object3D) return { ok: false, reason: 'target object3D missing' };
  if (video.videoWidth < 2 || video.videoHeight < 2) {
    return { ok: false, reason: 'video has no frames yet' };
  }

  try {
    detachOverlayVideoPlane(entity);

    const pose = overlayFrameToLocalPose(frame, aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return { ok: false, reason: '2d context missing' };
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'drawImage blocked',
      };
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    if (THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if (THREE.sRGBEncoding) {
      texture.encoding = THREE.sRGBEncoding;
    }

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pose.width, pose.height),
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    );
    mesh.name = MESH_NAME;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.renderOrder = 999;
    mesh.frustumCulled = false;
    mesh.visible = true;

    let painting = true;
    let loggedDrawError = false;
    const paint = () => {
      if (!painting) return;
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          texture.needsUpdate = true;
        } catch {
          if (!loggedDrawError) {
            loggedDrawError = true;
            viewerLog('warn', 'crop plane could not copy video frame', {
              size: `${video.videoWidth}x${video.videoHeight}`,
            });
          }
        }
      }
      window.requestAnimationFrame(paint);
    };
    mesh.userData.spStopPaint = () => {
      painting = false;
    };
    const videoWithFrameCb = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => void;
    };
    if (videoWithFrameCb.requestVideoFrameCallback) {
      const onFrame = () => {
        paint();
        if (painting) videoWithFrameCb.requestVideoFrameCallback?.(onFrame);
      };
      videoWithFrameCb.requestVideoFrameCallback(onFrame);
    } else {
      window.requestAnimationFrame(paint);
    }

    object3D.add(mesh);
    return { ok: true, reason: 'attached' };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};
