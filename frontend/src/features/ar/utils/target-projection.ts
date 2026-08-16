import { clampOverlayFrame, type OverlayFrame } from './overlay-frame';

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
  Vector3: new (
    x?: number,
    y?: number,
    z?: number,
  ) => {
    clone: () => {
      applyMatrix4: (matrix: unknown) => {
        project: (camera: unknown) => { x: number; y: number; z: number };
      };
    };
    applyMatrix4: (matrix: unknown) => {
      project: (camera: unknown) => { x: number; y: number; z: number };
    };
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

export type ScreenPoint = { x: number; y: number };

export type OverlayQuad = {
  corners: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  visible: boolean;
};

const projectLocalPoint = (
  THREE: ThreeRuntime,
  entity: ProjectableEntity,
  camera: { projectionMatrix: { elements: number[] }; matrixWorldInverse: { elements: number[] } },
  hostRect: DOMRect,
  localX: number,
  localY: number,
): ScreenPoint | null => {
  if (!entity.object3D) return null;
  const matrixWorld = new THREE.Matrix4().fromArray(entity.object3D.matrixWorld.elements);
  const world = new THREE.Vector3(localX, localY, 0).applyMatrix4(matrixWorld);
  const projected = world.project(camera);
  if (projected.z > 1 || Number.isNaN(projected.x) || Number.isNaN(projected.y)) {
    return null;
  }
  return {
    x: (projected.x * 0.5 + 0.5) * hostRect.width + hostRect.left,
    y: (-projected.y * 0.5 + 0.5) * hostRect.height + hostRect.top,
  };
};

/**
 * Project the studio-selected overlay rectangle into viewport pixels.
 * MindAR target is 1 unit wide, height = aspectRatio, origin at center; image y=0 is the top.
 */
export const getOverlayQuadScreenCorners = (
  host: HTMLElement,
  targetEntity: HTMLElement,
  aspectRatio: number,
  frame: OverlayFrame,
): OverlayQuad | null => {
  const overlay = clampOverlayFrame(frame);
  const THREE = getThree();
  const entity = targetEntity as ProjectableEntity;
  const cameraEl = host.querySelector('[camera]') as ProjectableEntity | null;

  if (!THREE || !entity.object3D || !cameraEl?.getObject3D) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }

  const camera = cameraEl.getObject3D('camera');
  if (!camera) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }

  const hostRect = host.getBoundingClientRect();
  if (hostRect.width <= 0 || hostRect.height <= 0) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }

  const halfH = aspectRatio * 0.5;
  const left = -0.5 + overlay.x;
  const right = -0.5 + overlay.x + overlay.width;
  const top = halfH - overlay.y * aspectRatio;
  const bottom = halfH - (overlay.y + overlay.height) * aspectRatio;

  const corners = [
    projectLocalPoint(THREE, entity, camera, hostRect, left, top),
    projectLocalPoint(THREE, entity, camera, hostRect, right, top),
    projectLocalPoint(THREE, entity, camera, hostRect, right, bottom),
    projectLocalPoint(THREE, entity, camera, hostRect, left, bottom),
  ];

  if (corners.some((corner) => !corner)) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }

  const quad = corners as [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  const xs = quad.map((point) => point.x);
  const ys = quad.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return {
    corners: quad,
    visible: width > 8 && height > 8,
  };
};

const getOverlayQuadFromBounds = (
  host: HTMLElement,
  targetEntity: HTMLElement,
  aspectRatio: number,
  overlay: OverlayFrame,
): OverlayQuad | null => {
  const bounds = getTargetScreenBounds(host, targetEntity, aspectRatio);
  if (!bounds?.visible) return null;

  const hostRect = host.getBoundingClientRect();
  const left = hostRect.left + bounds.left + overlay.x * bounds.width;
  const top = hostRect.top + bounds.top + overlay.y * bounds.height;
  const right = left + overlay.width * bounds.width;
  const bottom = top + overlay.height * bounds.height;

  return {
    corners: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
    visible: right - left > 8 && bottom - top > 8,
  };
};

export type ViewportBox = { left: number; top: number; width: number; height: number };

/** Scan-frame sized box so video is visible even before a tracked pose arrives. */
export const getFallbackFrameBox = (): ViewportBox => {
  const vw = typeof window === 'undefined' ? 360 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 640 : window.innerHeight;
  const width = Math.min(vw * 0.78, 340);
  const height = Math.min(width * (4 / 3), vh * 0.58, 460);
  return {
    left: Math.max(0, (vw - width) / 2),
    top: Math.max(12, (vh - height) / 2 - 36),
    width,
    height,
  };
};

/** Axis-aligned viewport box of the studio overlay on the tracked photo. */
export const getOverlayAabbViewport = (
  host: HTMLElement,
  targetEntity: HTMLElement,
  aspectRatio: number,
  frame: OverlayFrame,
): ViewportBox | null => {
  const quad = getOverlayQuadScreenCorners(host, targetEntity, aspectRatio, frame);
  if (!quad?.visible) return null;
  const xs = quad.corners.map((point) => point.x);
  const ys = quad.corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
};

const solveLinearSystem = (inputA: number[][], inputB: number[]): number[] | null => {
  const n = inputB.length;
  const matrix = inputA.map((row, index) => [...row, inputB[index]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) {
        pivot = row;
      }
    }
    if (Math.abs(matrix[pivot][col]) < 1e-12) return null;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const divisor = matrix[col][col];
    for (let j = col; j <= n; j += 1) {
      matrix[col][j] /= divisor;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let j = col; j <= n; j += 1) {
        matrix[row][j] -= factor * matrix[col][j];
      }
    }
  }

  return matrix.map((row) => row[n]);
};

/** CSS matrix3d that maps a width×height rectangle onto the destination quad (TL, TR, BR, BL). */
export const quadToCssMatrix3d = (
  width: number,
  height: number,
  dest: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint],
): string | null => {
  const src: Array<[number, number]> = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const dst: Array<[number, number]> = dest.map((point) => [point.x, point.y]);
  const rows: number[][] = [];
  const vector: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    vector.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    vector.push(v);
  }

  const h = solveLinearSystem(rows, vector);
  if (!h) return null;

  const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
  const h33 = 1;
  return `matrix3d(${[h11, h21, 0, h31, h12, h22, 0, h32, 0, 0, 1, 0, h13, h23, 0, h33].join(
    ',',
  )})`;
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
