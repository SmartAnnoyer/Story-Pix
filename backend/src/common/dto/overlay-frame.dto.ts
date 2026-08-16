import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

/** Normalized crop of the tracking photo (top-left origin, 0–1). Video plays inside this frame. */
export class OverlayFrameDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1)
  width!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1)
  height!: number;
}

export type OverlayFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_OVERLAY_FRAME: OverlayFrame = { x: 0.06, y: 0.06, width: 0.88, height: 0.88 };

export const clampOverlayFrame = (frame?: OverlayFrame | null): OverlayFrame => {
  if (!frame) return { ...DEFAULT_OVERLAY_FRAME };
  const x = Math.min(0.9, Math.max(0, frame.x));
  const y = Math.min(0.9, Math.max(0, frame.y));
  const width = Math.min(1 - x, Math.max(0.08, frame.width));
  const height = Math.min(1 - y, Math.max(0.08, frame.height));
  return { x, y, width, height };
};
