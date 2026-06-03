import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService, STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { MediaType } from '../common/enums';
import { IMediaProcessor, ProcessedMediaResult } from './interfaces/media-processor.interface';

/**
 * In-process media processor placeholder.
 * Worker-based sharp/ffmpeg processing can replace this without changing MediaService.
 */
@Injectable()
export class MediaProcessingService extends IMediaProcessor {
  private readonly logger = new Logger(MediaProcessingService.name);

  constructor(
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async processPhoto(
    publicUrl: string,
    r2ObjectKey: string,
    hints?: { width?: number; height?: number },
  ): Promise<ProcessedMediaResult> {
    this.logger.debug(`Processing photo ${r2ObjectKey}`);
    const thumbKey = this.getThumbnailKey(r2ObjectKey);
    return {
      width: hints?.width ?? 1920,
      height: hints?.height ?? 1080,
      duration: null,
      thumbnailUrl: this.storageService.getPublicUrl(thumbKey),
    };
  }

  async processVideo(
    publicUrl: string,
    r2ObjectKey: string,
    hints?: { width?: number; height?: number; duration?: number },
  ): Promise<ProcessedMediaResult> {
    this.logger.debug(`Processing video ${r2ObjectKey}`);
    const thumbKey = this.getThumbnailKey(r2ObjectKey);
    return {
      width: hints?.width ?? 1920,
      height: hints?.height ?? 1080,
      duration: hints?.duration ?? 0,
      thumbnailUrl: this.storageService.getPublicUrl(thumbKey),
    };
  }

  async runProcessing(
    mediaType: MediaType,
    publicUrl: string,
    r2ObjectKey: string,
    hints?: { width?: number; height?: number; duration?: number },
  ): Promise<ProcessedMediaResult> {
    if (mediaType === MediaType.VIDEO) {
      return this.processVideo(publicUrl, r2ObjectKey, hints);
    }
    return this.processPhoto(publicUrl, r2ObjectKey, hints);
  }

  private getThumbnailKey(r2ObjectKey: string): string {
    const parts = r2ObjectKey.split('/');
    const fileName = parts.pop() ?? 'file';
    const base = fileName.replace(/\.[^.]+$/, '');
    parts.push('thumbnails', `${base}.jpg`);
    return parts.join('/');
  }
}
