/** Screen bounds of a MindAR image target, relative to the scene host element. */
export type TargetScreenBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
};

type ProjectableEntity = HTMLElement & {
  object3D?: {
    matrixWorld: { elements: number[] };
  };
  getObject3D?: (type: string) => {
    projectionMatrix: { elements: number[] };
    matrixWorldInverse: { elements: number[] };
  };
};

type ThreeRuntime = {
  Vector3: new (x?: number, y?: number, z?: number) => {
    clone: () => {
      applyMatrix4: (matrix: unknown) => { project: (camera: unknown) => { x: number; y: number; z: number } };
    };
    applyMatrix4: (matrix: unknown) => { project: (camera: unknown) => { x: number; y: number; z: number } };
  };
  Matrix4: new () => { fromArray: (values: number[]) => unknown };
};

const getThree = (): ThreeRuntime | null => {
  const frame = window as Window & {
    AFRAME?: { THREE?: ThreeRuntime };
    THREE?: ThreeRuntime;
  };
  return frame.AFRAME?.THREE ?? frame.THREE ?? null;
};

/**
 * Project MindAR target corners to 2D coordinates inside the AR host.
 * MindAR targets are 1 world unit wide; height = aspectRatio (h/w).
 */
export const getTargetScreenBounds = (
  host: HTMLElement,
  targetEntity: HTMLElement,
  aspectRatio: number,
): TargetScreenBounds | null => {
  const THREE = getThree();
  const entity = targetEntity as ProjectableEntity;
  const cameraEl = host.querySelector('[camera]') as ProjectableEntity | null;

  if (!THREE || !entity.object3D || !cameraEl?.getObject3D) {
    return null;
  }

  const camera = cameraEl.getObject3D('camera');
  if (!camera) return null;

  const hostWidth = host.clientWidth;
  const hostHeight = host.clientHeight;
  if (hostWidth <= 0 || hostHeight <= 0) return null;

  const halfH = aspectRatio * 0.5;
  const localCorners = [
    new THREE.Vector3(-0.5, halfH, 0),
    new THREE.Vector3(0.5, halfH, 0),
    new THREE.Vector3(0.5, -halfH, 0),
    new THREE.Vector3(-0.5, -halfH, 0),
  ];

  const matrixWorld = new THREE.Matrix4().fromArray(entity.object3D.matrixWorld.elements);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let visibleCorners = 0;

  for (const corner of localCorners) {
    const world = corner.clone().applyMatrix4(matrixWorld);
    const projected = world.project(camera);

    if (projected.z > 1 || Number.isNaN(projected.x) || Number.isNaN(projected.y)) {
      continue;
    }

    visibleCorners += 1;
    const x = (projected.x * 0.5 + 0.5) * hostWidth;
    const y = (-projected.y * 0.5 + 0.5) * hostHeight;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (visibleCorners < 2) {
    return { left: 0, top: 0, width: 0, height: 0, visible: false };
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  return {
    left: minX,
    top: minY,
    width,
    height,
    visible: width > 8 && height > 8,
  };
};

export const getTargetAspectRatio = (mindCacheKey: string, mindIndex: number): number => {
  try {
    const raw = sessionStorage.getItem(mindCacheKey);
    if (!raw) return 1.414;
    const parsed = JSON.parse(raw) as {
      targetDimensions?: Array<{ width: number; height: number }>;
    };
    const dim = parsed.targetDimensions?.[mindIndex];
    if (dim?.width && dim?.height) {
      return dim.height / dim.width;
    }
  } catch {
    // ignore cache parse errors
  }
  return 1.414;
};
