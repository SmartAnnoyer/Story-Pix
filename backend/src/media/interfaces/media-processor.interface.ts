export interface ProcessedMediaResult {
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string | null;
}

export abstract class IMediaProcessor {
  abstract processPhoto(
    publicUrl: string,
    r2ObjectKey: string,
    hints?: { width?: number; height?: number },
  ): Promise<ProcessedMediaResult>;

  abstract processVideo(
    publicUrl: string,
    r2ObjectKey: string,
    hints?: { width?: number; height?: number; duration?: number },
  ): Promise<ProcessedMediaResult>;
}

export const MEDIA_PROCESSOR = Symbol('MEDIA_PROCESSOR');
