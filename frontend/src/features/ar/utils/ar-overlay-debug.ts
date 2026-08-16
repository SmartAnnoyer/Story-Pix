import { overlayFrameToLocalPose } from './overlay-plane';
import { viewerLog } from './viewer-debug-log';
import type { OverlayFrame } from './overlay-frame';

type Entity3D = HTMLElement & {
  object3D?: {
    visible?: boolean;
    matrix?: { elements?: ArrayLike<number> };
    children?: { length: number };
  };
};

type SceneEl = HTMLElement & {
  renderer?: {
    getClearAlpha?: () => number;
    getContext?: () => { getContextAttributes?: () => { alpha?: boolean } | null };
  };
  canvas?: HTMLCanvasElement;
};

const round = (value: number) => Number(value.toFixed(3));

export const dumpArOverlayDebug = (input: {
  host: HTMLElement | null;
  entity: HTMLElement | null;
  video: HTMLVideoElement | null;
  frame: OverlayFrame;
  aspectRatio: number;
  attached: boolean;
  reason?: string;
}): void => {
  const scene = input.host?.querySelector('a-scene') as SceneEl | null;
  const canvas = (scene?.canvas ?? input.host?.querySelector('.a-canvas')) as HTMLElement | null;
  const cameraVideo = input.host?.querySelector(':scope > video') as HTMLVideoElement | null;
  const object3D = (input.entity as Entity3D | null)?.object3D;
  const canvasCss = canvas ? window.getComputedStyle(canvas) : null;
  const cameraCss = cameraVideo ? window.getComputedStyle(cameraVideo) : null;
  const local = overlayFrameToLocalPose(input.frame, input.aspectRatio);
  const matrix = object3D?.matrix?.elements;
  const gl = scene?.renderer?.getContext?.();

  viewerLog('info', 'AR overlay debug', {
    attached: input.attached,
    reason: input.reason ?? (input.attached ? 'ok' : 'unknown'),
    frame: {
      x: round(input.frame.x),
      y: round(input.frame.y),
      w: round(input.frame.width),
      h: round(input.frame.height),
    },
    localPose: {
      x: round(local.x),
      y: round(local.y),
      w: round(local.width),
      h: round(local.height),
    },
    aspect: round(input.aspectRatio),
    three: Boolean((window as Window & { AFRAME?: { THREE?: unknown } }).AFRAME?.THREE),
    object3D: Boolean(object3D),
    objectVisible: object3D?.visible ?? null,
    children: object3D?.children?.length ?? 0,
    matrix0: matrix ? round(Number(matrix[0] ?? 0)) : null,
    matrix12: matrix ? round(Number(matrix[12] ?? 0)) : null,
    video: input.video
      ? {
          w: input.video.videoWidth,
          h: input.video.videoHeight,
          paused: input.video.paused,
          ready: input.video.readyState,
          muted: input.video.muted,
          cors: input.video.crossOrigin,
          src: input.video.currentSrc?.slice(0, 72) ?? '',
        }
      : null,
    canvas:
      canvas && canvasCss
        ? {
            opacity: canvasCss.opacity,
            z: canvasCss.zIndex,
            w: Math.round(canvas.getBoundingClientRect().width),
            h: Math.round(canvas.getBoundingClientRect().height),
          }
        : null,
    camera: cameraCss
      ? {
          opacity: cameraCss.opacity,
          z: cameraCss.zIndex,
          w: cameraVideo?.videoWidth ?? 0,
        }
      : null,
    glAlpha: gl?.getContextAttributes?.()?.alpha ?? null,
    clearAlpha: scene?.renderer?.getClearAlpha?.() ?? null,
  });
};
