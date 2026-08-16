import { clampOverlayFrame, type OverlayFrame } from './overlay-frame';

/** Screen bounds of a MindAR image target, relative to the scene host element. */
export type TargetScreenBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => Vec3;
  applyMatrix4: (matrix: unknown) => Vec3;
  project: (camera: unknown) => Vec3;
};

type Mat4 = {
  elements: ArrayLike<number>;
  fromArray: (values: ArrayLike<number>) => Mat4;
  multiplyMatrices: (a: unknown, b: unknown) => Mat4;
  copy: (m: unknown) => Mat4;
};

type Object3D = {
  matrix: { elements: ArrayLike<number> };
  matrixWorld: { elements: ArrayLike<number> };
  matrixWorldNeedsUpdate?: boolean;
  parent?: Object3D | null;
  visible?: boolean;
  updateMatrixWorld?: (force?: boolean) => void;
  localToWorld?: (vector: Vec3) => Vec3;
};

type SceneCamera = {
  projectionMatrix: { elements: ArrayLike<number> };
  matrixWorldInverse: { elements: ArrayLike<number> };
  updateMatrixWorld?: (force?: boolean) => void;
  updateProjectionMatrix?: () => void;
};

type ProjectableEntity = HTMLElement & {
  object3D?: Object3D;
  getObject3D?: (type: string) => SceneCamera | undefined;
};

type ASceneEl = HTMLElement & {
  camera?: SceneCamera;
  object3D?: Object3D;
};

type ThreeRuntime = {
  Vector3: new (x?: number, y?: number, z?: number) => Vec3;
  Matrix4: new () => Mat4;
};

const getThree = (): ThreeRuntime | null => {
  const frame = window as Window & {
    AFRAME?: { THREE?: ThreeRuntime };
    THREE?: ThreeRuntime;
  };
  return frame.AFRAME?.THREE ?? frame.THREE ?? null;
};

const isIdentityMatrix = (elements: ArrayLike<number> | undefined): boolean => {
  if (!elements || elements.length < 16) return true;
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = 0; i < 16; i += 1) {
    if (Math.abs((elements[i] ?? 0) - identity[i]) > 1e-5) return false;
  }
  return true;
};

const getProjectionRect = (host: HTMLElement): DOMRect | null => {
  const scene = host.querySelector('a-scene') as HTMLElement | null;
  const canvas = host.querySelector('.a-canvas, canvas.a-canvas') as HTMLElement | null;
  const rect =
    (canvas && canvas.clientWidth > 0 ? canvas.getBoundingClientRect() : null) ??
    (scene && scene.clientWidth > 0 ? scene.getBoundingClientRect() : null) ??
    host.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return rect;
};

const getSceneCamera = (host: HTMLElement): SceneCamera | null => {
  const scene = host.querySelector('a-scene') as ASceneEl | null;
  if (scene?.camera) return scene.camera;

  const cameraEl = host.querySelector('a-camera') as ProjectableEntity | null;
  const fromEntity = cameraEl?.getObject3D?.('camera');
  return fromEntity ?? null;
};

/**
 * MindAR sets object3D.matrix directly with matrixAutoUpdate = false and does not
 * flag matrixWorldNeedsUpdate, so matrixWorld can stay identity (screen center).
 */
const syncTrackedWorldMatrix = (entity: ProjectableEntity, camera: SceneCamera): boolean => {
  const object3D = entity.object3D;
  if (!object3D?.matrix) return false;

  const sceneEl = entity.closest('a-scene') as ASceneEl | null;
  sceneEl?.object3D?.updateMatrixWorld?.(true);

  object3D.matrixWorldNeedsUpdate = true;
  object3D.updateMatrixWorld?.(true);
  camera.updateMatrixWorld?.(true);

  if (!isIdentityMatrix(object3D.matrixWorld?.elements)) return true;
  if (isIdentityMatrix(object3D.matrix.elements)) return false;

  const THREE = getThree();
  if (!THREE || !object3D.matrixWorld) return false;
  const world = new THREE.Matrix4();
  if (object3D.parent?.matrixWorld) {
    world.multiplyMatrices(object3D.parent.matrixWorld, object3D.matrix);
  } else {
    world.fromArray(object3D.matrix.elements);
  }
  const dest = object3D.matrixWorld.elements as number[] | Float32Array;
  const src = world.elements;
  for (let i = 0; i < 16; i += 1) {
    dest[i] = Number(src[i] ?? 0);
  }
  return !isIdentityMatrix(object3D.matrixWorld.elements);
};

const projectLocalPoint = (
  THREE: ThreeRuntime,
  entity: ProjectableEntity,
  camera: SceneCamera,
  viewRect: DOMRect,
  localX: number,
  localY: number,
): ScreenPoint | null => {
  if (!entity.object3D) return null;

  const point = new THREE.Vector3(localX, localY, 0);
  if (typeof entity.object3D.localToWorld === 'function') {
    entity.object3D.localToWorld(point);
  } else {
    const matrixWorld = new THREE.Matrix4().fromArray(entity.object3D.matrixWorld.elements);
    point.applyMatrix4(matrixWorld);
  }

  const projected = point.project(camera);
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return null;

  return {
    x: (projected.x * 0.5 + 0.5) * viewRect.width + viewRect.left,
    y: (-projected.y * 0.5 + 0.5) * viewRect.height + viewRect.top,
  };
};

const overlayLocalCorners = (aspectRatio: number, frame: OverlayFrame): Array<[number, number]> => {
  const overlay = clampOverlayFrame(frame);
  const halfH = aspectRatio * 0.5;
  const left = -0.5 + overlay.x;
  const right = -0.5 + overlay.x + overlay.width;
  const top = halfH - overlay.y * aspectRatio;
  const bottom = halfH - (overlay.y + overlay.height) * aspectRatio;
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
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
  const camera = getSceneCamera(host);
  const viewRect = getProjectionRect(host);

  if (!THREE || !entity.object3D || !camera || !viewRect) return null;
  if (!syncTrackedWorldMatrix(entity, camera)) {
    return { left: 0, top: 0, width: 0, height: 0, visible: false };
  }

  const halfH = aspectRatio * 0.5;
  const localCorners: Array<[number, number]> = [
    [-0.5, halfH],
    [0.5, halfH],
    [0.5, -halfH],
    [-0.5, -halfH],
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let visibleCorners = 0;

  for (const [x, y] of localCorners) {
    const projected = projectLocalPoint(THREE, entity, camera, viewRect, x, y);
    if (!projected) continue;
    visibleCorners += 1;
    minX = Math.min(minX, projected.x - viewRect.left);
    minY = Math.min(minY, projected.y - viewRect.top);
    maxX = Math.max(maxX, projected.x - viewRect.left);
    maxY = Math.max(maxY, projected.y - viewRect.top);
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
  const camera = getSceneCamera(host);
  const viewRect = getProjectionRect(host);

  if (!THREE || !entity.object3D || !camera || !viewRect) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }
  if (!syncTrackedWorldMatrix(entity, camera)) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }

  const corners = overlayLocalCorners(aspectRatio, overlay).map(([x, y]) =>
    projectLocalPoint(THREE, entity, camera, viewRect, x, y),
  );

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

  const hostRect = getProjectionRect(host) ?? host.getBoundingClientRect();
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
