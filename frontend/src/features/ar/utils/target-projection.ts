import { clampOverlayFrame, type OverlayFrame } from './overlay-frame';

/** Screen bounds of a MindAR image target, relative to the scene host element. */
export type TargetScreenBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
};

type Object3D = {
  matrix: { elements: ArrayLike<number> };
  matrixWorld?: { elements: ArrayLike<number> };
  matrixWorldNeedsUpdate?: boolean;
  parent?: Object3D | null;
  visible?: boolean;
  updateMatrixWorld?: (force?: boolean) => void;
};

type SceneCamera = {
  projectionMatrix: { elements: ArrayLike<number> };
  matrixWorldInverse: { elements: ArrayLike<number> };
  updateMatrixWorld?: (force?: boolean) => void;
};

type ProjectableEntity = HTMLElement & {
  object3D?: Object3D;
  getObject3D?: (type: string) => SceneCamera | undefined;
};

type ASceneEl = HTMLElement & {
  camera?: SceneCamera;
  object3D?: Object3D;
};

const isIdentityMatrix = (elements: ArrayLike<number> | undefined): boolean => {
  if (!elements || elements.length < 16) return true;
  const expected = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = 0; i < 16; i += 1) {
    if (Math.abs((elements[i] ?? 0) - expected[i]) > 1e-5) return false;
  }
  return true;
};

const copy16 = (elements: ArrayLike<number>): number[] => {
  const out = new Array<number>(16);
  for (let i = 0; i < 16; i += 1) out[i] = Number(elements[i] ?? 0);
  return out;
};

/** Column-major 4x4 multiply: out = a * b */
const multiplyMat4 = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col += 1) {
    const b0 = Number(b[col * 4] ?? 0);
    const b1 = Number(b[col * 4 + 1] ?? 0);
    const b2 = Number(b[col * 4 + 2] ?? 0);
    const b3 = Number(b[col * 4 + 3] ?? 0);
    out[col * 4] = Number(a[0]) * b0 + Number(a[4]) * b1 + Number(a[8]) * b2 + Number(a[12]) * b3;
    out[col * 4 + 1] =
      Number(a[1]) * b0 + Number(a[5]) * b1 + Number(a[9]) * b2 + Number(a[13]) * b3;
    out[col * 4 + 2] =
      Number(a[2]) * b0 + Number(a[6]) * b1 + Number(a[10]) * b2 + Number(a[14]) * b3;
    out[col * 4 + 3] =
      Number(a[3]) * b0 + Number(a[7]) * b1 + Number(a[11]) * b2 + Number(a[15]) * b3;
  }
  return out;
};

const applyMat4 = (m: ArrayLike<number>, x: number, y: number, z: number) => {
  const w = Number(m[3]) * x + Number(m[7]) * y + Number(m[11]) * z + Number(m[15]);
  const invW = w !== 0 ? 1 / w : 1;
  return {
    x: (Number(m[0]) * x + Number(m[4]) * y + Number(m[8]) * z + Number(m[12])) * invW,
    y: (Number(m[1]) * x + Number(m[5]) * y + Number(m[9]) * z + Number(m[13])) * invW,
    z: (Number(m[2]) * x + Number(m[6]) * y + Number(m[10]) * z + Number(m[14])) * invW,
  };
};

const getProjectionRect = (host: HTMLElement): DOMRect | null => {
  const scene = host.querySelector('a-scene') as HTMLElement | null;
  const rect =
    (scene && scene.clientWidth > 0 ? scene.getBoundingClientRect() : null) ??
    host.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return rect;
};

const getSceneCamera = (host: HTMLElement): SceneCamera | null => {
  const scene = host.querySelector('a-scene') as ASceneEl | null;
  if (scene?.camera) return scene.camera;
  const cameraEl = host.querySelector('a-camera') as ProjectableEntity | null;
  return cameraEl?.getObject3D?.('camera') ?? null;
};

type MindArTargetComponent = {
  updateWorldMatrix: ((worldMatrix: ArrayLike<number> | null) => void) & {
    __spWrapped?: boolean;
  };
  el: ProjectableEntity;
};

const capturedPose = new WeakMap<HTMLElement, number[]>();

export const installPoseCapture = (entity: HTMLElement): void => {
  const wrap = () => {
    const component = (
      entity as HTMLElement & { components?: Record<string, MindArTargetComponent> }
    ).components?.['mindar-image-target'];
    if (!component || component.updateWorldMatrix.__spWrapped) return;

    const original = component.updateWorldMatrix.bind(component);
    const wrapped = ((worldMatrix: ArrayLike<number> | null) => {
      original(worldMatrix);
      if (worldMatrix == null) {
        capturedPose.delete(entity);
        return;
      }
      const matrix = component.el.object3D?.matrix?.elements ?? worldMatrix;
      capturedPose.set(entity, copy16(matrix));
    }) as MindArTargetComponent['updateWorldMatrix'];
    wrapped.__spWrapped = true;
    component.updateWorldMatrix = wrapped;
  };

  wrap();
  entity.addEventListener('loaded', wrap);
  entity.addEventListener('componentinitialized', wrap);
};

/**
 * MindAR writes pose into object3D.matrix with matrixAutoUpdate = false,
 * then A-Frame may reset that matrix. Prefer the copy captured in updateWorldMatrix.
 */
const getPoseMatrix = (entity: ProjectableEntity, camera: SceneCamera): number[] | null => {
  camera.updateMatrixWorld?.(true);

  const captured = capturedPose.get(entity);
  if (captured) return captured;

  const object3D = entity.object3D;
  if (!object3D?.matrix) return null;

  const sceneEl = entity.closest('a-scene') as ASceneEl | null;
  sceneEl?.object3D?.updateMatrixWorld?.(true);
  object3D.matrixWorldNeedsUpdate = true;
  object3D.updateMatrixWorld?.(true);

  const local = object3D.matrix.elements;
  if (!isIdentityMatrix(local)) {
    const parent = object3D.parent?.matrixWorld?.elements;
    if (parent && !isIdentityMatrix(parent)) {
      return multiplyMat4(parent, local);
    }
    return copy16(local);
  }

  const world = object3D.matrixWorld?.elements;
  if (world && !isIdentityMatrix(world)) {
    return copy16(world);
  }

  return null;
};

const projectLocalPoint = (
  pose: ArrayLike<number>,
  camera: SceneCamera,
  viewRect: DOMRect,
  localX: number,
  localY: number,
): ScreenPoint | null => {
  const world = applyMat4(pose, localX, localY, 0);
  const view = applyMat4(camera.matrixWorldInverse.elements, world.x, world.y, world.z);
  const clip = applyMat4(camera.projectionMatrix.elements, view.x, view.y, view.z);
  if (!Number.isFinite(clip.x) || !Number.isFinite(clip.y)) return null;

  return {
    x: (clip.x * 0.5 + 0.5) * viewRect.width + viewRect.left,
    y: (-clip.y * 0.5 + 0.5) * viewRect.height + viewRect.top,
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

const projectCorners = (
  host: HTMLElement,
  targetEntity: HTMLElement,
  locals: Array<[number, number]>,
): ScreenPoint[] | null => {
  const entity = targetEntity as ProjectableEntity;
  const camera = getSceneCamera(host);
  const viewRect = getProjectionRect(host);
  if (!entity.object3D || !camera || !viewRect) return null;

  const pose = getPoseMatrix(entity, camera);
  if (!pose) return null;

  const points: ScreenPoint[] = [];
  for (const [x, y] of locals) {
    const projected = projectLocalPoint(pose, camera, viewRect, x, y);
    if (!projected) return null;
    points.push(projected);
  }
  return points;
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
  const viewRect = getProjectionRect(host);
  const halfH = aspectRatio * 0.5;
  const points = projectCorners(host, targetEntity, [
    [-0.5, halfH],
    [0.5, halfH],
    [0.5, -halfH],
    [-0.5, -halfH],
  ]);
  if (!points || !viewRect) return { left: 0, top: 0, width: 0, height: 0, visible: false };

  const xs = points.map((point) => point.x - viewRect.left);
  const ys = points.map((point) => point.y - viewRect.top);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;

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
  const points = projectCorners(host, targetEntity, overlayLocalCorners(aspectRatio, overlay));
  if (!points || points.length !== 4) {
    return getOverlayQuadFromBounds(host, targetEntity, aspectRatio, overlay);
  }

  const quad = points as [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
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
    top: Math.max(0, (vh - height) / 2),
    width,
    height,
  };
};

const aabbFromQuad = (quad: OverlayQuad): ViewportBox | null => {
  if (!quad.visible) return null;
  const xs = quad.corners.map((point) => point.x);
  const ys = quad.corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
};

/** Axis-aligned viewport box of the studio overlay on the tracked photo. */
export const getOverlayAabbViewport = (
  host: HTMLElement,
  targetEntity: HTMLElement,
  aspectRatio: number,
  frame: OverlayFrame,
): ViewportBox | null => {
  const quad = getOverlayQuadScreenCorners(host, targetEntity, aspectRatio, frame);
  if (!quad) return null;
  return aabbFromQuad(quad);
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
