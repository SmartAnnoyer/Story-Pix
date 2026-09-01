import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import sharp from 'sharp';
import { IStorageService, STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { MediaType } from '../common/enums';
import { IMediaProcessor, ProcessedMediaResult } from './interfaces/media-processor.interface';
import { buildThumbnailObjectKey, decodeThumbnailBase64 } from './media-thumbnail.util';

const THUMB_MAX_EDGE = 480;
const THUMB_JPEG_QUALITY = 82;

export type MediaProcessingHints = {
  width?: number;
  height?: number;
  duration?: number;
  thumbnailBase64?: string;
};

/**
 * Generates JPEG thumbnails in R2. Video posters come from the client frame capture.
 */
@Injectable()
export class MediaProcessingService extends IMediaProcessor {
  private readonly logger = new Logger(MediaProcessingService.name);

  constructor(@Inject(STORAGE_SERVICE) private readonly storageService: IStorageService) {
    super();
  }

  async processPhoto(
    _publicUrl: string,
    r2ObjectKey: string,
    hints?: MediaProcessingHints,
  ): Promise<ProcessedMediaResult> {
    this.logger.debug(`Processing photo ${r2ObjectKey}`);
    const thumbKey = buildThumbnailObjectKey(r2ObjectKey);
    const source = await this.storageService.getObjectBuffer(r2ObjectKey);

    let width = hints?.width ?? null;
    let height = hints?.height ?? null;

    if (source?.buffer?.length) {
      const image = sharp(source.buffer).rotate();
      const meta = await image.metadata();
      width = width ?? meta.width ?? null;
      height = height ?? meta.height ?? null;

      const clientPoster = decodeThumbnailBase64(hints?.thumbnailBase64);
      const thumbBuffer = clientPoster
        ? await sharp(clientPoster)
            .rotate()
            .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: THUMB_JPEG_QUALITY, mozjpeg: true })
            .toBuffer()
        : await image
            .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: THUMB_JPEG_QUALITY, mozjpeg: true })
            .toBuffer();

      await this.storageService.putObjectBuffer(thumbKey, thumbBuffer, 'image/jpeg');
      return {
        width,
        height,
        duration: null,
        thumbnailUrl: this.storageService.getPublicUrl(thumbKey),
      };
    }

    this.logger.warn(`Photo source missing for thumbnail: ${r2ObjectKey}`);
    return {
      width,
      height,
      duration: null,
      thumbnailUrl: null,
    };
  }

  async processVideo(
    _publicUrl: string,
    r2ObjectKey: string,
    hints?: MediaProcessingHints,
  ): Promise<ProcessedMediaResult> {
    this.logger.debug(`Processing video ${r2ObjectKey}`);
    const poster = decodeThumbnailBase64(hints?.thumbnailBase64);
    if (!poster) {
      return {
        width: hints?.width ?? null,
        height: hints?.height ?? null,
        duration: hints?.duration ?? null,
        thumbnailUrl: null,
      };
    }

    const thumbKey = buildThumbnailObjectKey(r2ObjectKey);
    const thumbBuffer = await sharp(poster)
      .rotate()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMB_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    await this.storageService.putObjectBuffer(thumbKey, thumbBuffer, 'image/jpeg');

    return {
      width: hints?.width ?? null,
      height: hints?.height ?? null,
      duration: hints?.duration ?? null,
      thumbnailUrl: this.storageService.getPublicUrl(thumbKey),
    };
  }

  async runProcessing(
    mediaType: MediaType,
    publicUrl: string,
    r2ObjectKey: string,
    hints?: MediaProcessingHints,
  ): Promise<ProcessedMediaResult> {
    if (mediaType === MediaType.VIDEO) {
      return this.processVideo(publicUrl, r2ObjectKey, hints);
    }
    return this.processPhoto(publicUrl, r2ObjectKey, hints);
  }

  async generatePhotoThumbnailBuffer(r2ObjectKey: string): Promise<Buffer | null> {
    const source = await this.storageService.getObjectBuffer(r2ObjectKey);
    if (!source?.buffer?.length) return null;

    return sharp(source.buffer)
      .rotate()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMB_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  }

  async saveVideoPosterFromBase64(
    r2ObjectKey: string,
    thumbnailBase64: string,
  ): Promise<string | null> {
    const poster = decodeThumbnailBase64(thumbnailBase64);
    if (!poster) return null;

    const thumbKey = buildThumbnailObjectKey(r2ObjectKey);
    const thumbBuffer = await sharp(poster)
      .rotate()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMB_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    await this.storageService.putObjectBuffer(thumbKey, thumbBuffer, 'image/jpeg');
    return this.storageService.getPublicUrl(thumbKey);
  }
}
