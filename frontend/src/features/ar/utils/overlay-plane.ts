import { clampOverlayFrame, type OverlayFrame } from './overlay-frame';

const MESH_NAME = 'sp-overlay-video-mesh';

type ThreeRuntime = {
  VideoTexture: new (video: HTMLVideoElement) => {
    minFilter: unknown;
    magFilter: unknown;
    generateMipmaps: boolean;
    colorSpace?: unknown;
    encoding?: unknown;
    needsUpdate: boolean;
    dispose: () => void;
  };
  PlaneGeometry: new (width: number, height: number) => { dispose: () => void };
  MeshBasicMaterial: new (params: Record<string, unknown>) => {
    map: { dispose: () => void } | null;
    dispose: () => void;
  };
  Mesh: new (
    geometry: unknown,
    material: unknown,
  ) => {
    name: string;
    position: { set: (x: number, y: number, z: number) => void };
    renderOrder: number;
    visible: boolean;
    geometry: { dispose: () => void };
    material: { map: { dispose: () => void } | null; dispose: () => void };
  };
  LinearFilter: unknown;
  DoubleSide: unknown;
  SRGBColorSpace?: unknown;
  sRGBEncoding?: unknown;
};

type Object3D = {
  add: (mesh: unknown) => void;
  remove: (mesh: unknown) => void;
  getObjectByName: (name: string) =>
    | {
        visible: boolean;
        geometry?: { dispose: () => void };
        material?: { map?: { dispose: () => void } | null; dispose: () => void };
      }
    | undefined;
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

/**
 * Parent a video plane to the MindAR target so it inherits photo pose, tilt, and scale.
 */
export const attachOverlayVideoPlane = (
  entity: HTMLElement,
  video: HTMLVideoElement,
  frame: OverlayFrame,
  aspectRatio: number,
): boolean => {
  const THREE = getThree();
  const object3D = (entity as EntityWithObject3D).object3D;
  if (!THREE || !object3D) return false;

  try {
    detachOverlayVideoPlane(entity);

    const pose = overlayFrameToLocalPose(frame, aspectRatio);
    const texture = new THREE.VideoTexture(video);
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
        depthTest: true,
        depthWrite: true,
      }),
    );
    mesh.name = MESH_NAME;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.renderOrder = 20;
    object3D.add(mesh);
    return true;
  } catch {
    return false;
  }
};
