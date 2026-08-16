export type OverlayFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Slight inset so studios frame the photo, not the whole wall/mat. */
export const DEFAULT_OVERLAY_FRAME: OverlayFrame = { x: 0.06, y: 0.06, width: 0.88, height: 0.88 };

export const FULL_OVERLAY_FRAME: OverlayFrame = { x: 0, y: 0, width: 1, height: 1 };

export const clampOverlayFrame = (frame?: OverlayFrame | null): OverlayFrame => {
  if (!frame) return { ...DEFAULT_OVERLAY_FRAME };
  const x = Math.min(0.9, Math.max(0, Number(frame.x) || 0));
  const y = Math.min(0.9, Math.max(0, Number(frame.y) || 0));
  const width = Math.min(1 - x, Math.max(0.08, Number(frame.width) || 0.08));
  const height = Math.min(1 - y, Math.max(0.08, Number(frame.height) || 0.08));
  return { x, y, width, height };
};
