import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaType } from '../common/enums';
import { ALLOWED_PHOTO_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES } from '../config/media.config';

@Injectable()
export class MediaValidationService {
  constructor(private readonly configService: ConfigService) {}

  validateUploadRequest(mediaType: MediaType, mimeType: string, fileSize: number) {
    const normalizedMime = mimeType.toLowerCase();

    if (mediaType === MediaType.PHOTO) {
      const allowed = this.configService.get<string[]>('media.allowedPhotoMimeTypes', [
        ...ALLOWED_PHOTO_MIME_TYPES,
      ]);
      if (!allowed.includes(normalizedMime)) {
        throw new BadRequestException({
          code: 'INVALID_FILE_TYPE',
          message: 'Unsupported photo format. Allowed: JPG, JPEG, PNG, WEBP',
        });
      }
      const maxBytes = this.getMaxPhotoBytes();
      if (fileSize > maxBytes) {
        throw new BadRequestException({
          code: 'FILE_TOO_LARGE',
          message: `Photo exceeds maximum size of ${this.configService.get('media.maxPhotoSizeMB')}MB`,
        });
      }
    }

    if (mediaType === MediaType.VIDEO) {
      const allowed = this.configService.get<string[]>('media.allowedVideoMimeTypes', [
        ...ALLOWED_VIDEO_MIME_TYPES,
      ]);
      if (!allowed.includes(normalizedMime)) {
        throw new BadRequestException({
          code: 'INVALID_FILE_TYPE',
          message: 'Unsupported video format. Allowed: MP4, MOV',
        });
      }
      const maxBytes = this.getMaxVideoBytes();
      if (fileSize > maxBytes) {
        throw new BadRequestException({
          code: 'FILE_TOO_LARGE',
          message: `Video exceeds maximum size of ${this.configService.get('media.maxVideoSizeMB')}MB`,
        });
      }
    }
  }

  bytesToGB(bytes: number): number {
    return bytes / (1024 * 1024 * 1024);
  }

  getMaxPhotoBytes(): number {
    return this.configService.get<number>('media.maxPhotoSizeMB', 25) * 1024 * 1024;
  }

  getMaxVideoBytes(): number {
    return this.configService.get<number>('media.maxVideoSizeMB', 500) * 1024 * 1024;
  }
}
