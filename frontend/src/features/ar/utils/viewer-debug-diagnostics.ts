import { getCameraVideo, getMindArSystem, isCameraPreviewLive } from './mindar-scene';
import { describeOverlayLayout } from './target-projection';
import { viewerLog } from './viewer-debug-log';

const rectSummary = (node: Element | null | undefined) => {
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return {
    w: Math.round(rect.width),
    h: Math.round(rect.height),
    t: Math.round(rect.top),
    l: Math.round(rect.left),
  };
};

const summarizeVideo = (video: HTMLVideoElement, index: number) => {
  const rect = video.getBoundingClientRect();
  return {
    i: index,
    id: video.id || null,
    cls: video.className || null,
    paused: video.paused,
    muted: video.muted,
    rs: video.readyState,
    vw: video.videoWidth,
    vh: video.videoHeight,
    ct: Number(video.currentTime.toFixed(2)),
    rect: {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      t: Math.round(rect.top),
      l: Math.round(rect.left),
    },
    parent: video.parentElement?.className?.slice(0, 48) ?? null,
    stream: Boolean(video.srcObject),
    src: video.src ? video.src.slice(0, 96) : null,
  };
};

export type ViewerDiagnosticsExtra = Record<string, unknown>;

export const collectViewerDiagnostics = (
  host: HTMLElement | null,
  extra: ViewerDiagnosticsExtra = {},
): Record<string, unknown> => {
  const view = window.visualViewport;
  const viewerRoot = (host?.closest('.ar-viewer-root') ?? host) as HTMLElement | null;
  const scene = host?.querySelector('a-scene') as HTMLElement | null;
  const canvas = host?.querySelector('.a-canvas, canvas') as HTMLElement | null;
  const system = host ? getMindArSystem(host) : null;
  const cameraVideo = host ? getCameraVideo(host) : null;
  const trackedEntity = host?.querySelector('[mindar-image-target]') as HTMLElement | null;

  const videos = [...(viewerRoot ?? document).querySelectorAll('video')].map((node, index) =>
    summarizeVideo(node as HTMLVideoElement, index),
  );

  const sceneCamera = (
    scene as HTMLElement & {
      camera?: {
        fov?: number;
        aspect?: number;
        projectionMatrix?: { elements?: ArrayLike<number> };
      };
    }
  )?.camera;

  return {
    ...extra,
    viewport: {
      w: Math.round(view?.width ?? window.innerWidth),
      h: Math.round(view?.height ?? window.innerHeight),
      top: Math.round(view?.offsetTop ?? 0),
      left: Math.round(view?.offsetLeft ?? 0),
    },
    host: host
      ? {
          cls: host.className,
          client: { w: host.clientWidth, h: host.clientHeight },
          rect: rectSummary(host),
          htmlCamera: host.classList.contains('ar-scene-host--html-camera'),
        }
      : null,
    viewerRoot: viewerRoot
      ? {
          rect: rectSummary(viewerRoot),
          client: { w: viewerRoot.clientWidth, h: viewerRoot.clientHeight },
        }
      : null,
    scene: scene
      ? {
          rect: rectSummary(scene),
          opacity: scene.style.opacity || null,
        }
      : null,
    canvas: canvas
      ? {
          rect: rectSummary(canvas),
          opacity: canvas.style.opacity || null,
        }
      : null,
    cameraLive: host ? isCameraPreviewLive(host) : false,
    cameraVideo: cameraVideo ? summarizeVideo(cameraVideo, -1) : null,
    videos,
    mindar: system
      ? {
          hasVideo: Boolean(system.video),
          resizePatched: Boolean(system._spResizePatched),
          input: {
            w: system.controller?.inputWidth ?? 0,
            h: system.controller?.inputHeight ?? 0,
          },
          tracking: (system.controller?.trackingStates ?? []).map((state, index) => ({
            i: index,
            showing: Boolean(state.showing),
            isTracking: Boolean(state.isTracking),
            trackCount: state.trackCount ?? 0,
            trackMiss: state.trackMiss ?? 0,
          })),
        }
      : null,
    sceneCamera: sceneCamera
      ? {
          fov: Number(sceneCamera.fov?.toFixed?.(1) ?? 0),
          aspect: Number(sceneCamera.aspect?.toFixed?.(3) ?? 0),
          p0: Number(sceneCamera.projectionMatrix?.elements?.[0] ?? 0).toFixed(4),
          p5: Number(sceneCamera.projectionMatrix?.elements?.[5] ?? 0).toFixed(4),
        }
      : null,
    overlay: trackedEntity && host ? describeOverlayLayout(host, trackedEntity) : null,
    aframe: Boolean(window.AFRAME),
    mindarImage: Boolean((window as Window & { MINDAR?: { IMAGE?: unknown } }).MINDAR?.IMAGE),
  };
};

export const logViewerDiagnostics = (
  label: string,
  host: HTMLElement | null,
  extra: ViewerDiagnosticsExtra = {},
  level: 'debug' | 'info' | 'warn' = 'debug',
) => {
  viewerLog(level, label, collectViewerDiagnostics(host, extra));
};
