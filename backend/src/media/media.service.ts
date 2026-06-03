import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { FilterQuery, Model, SortOrder } from 'mongoose';
import { AlbumsService } from '../albums/albums.service';
import { MediaStatus, MediaType, AnalyticsEventType, DomainEventType } from '../common/enums';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import { IStorageService, STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { UsageService } from '../subscriptions/usage.service';
import { ConfirmUploadDto, InitiateUploadDto, MediaSortField, MediaSortOrder, QueryMediaDto } from './dto/media.dto';
import { MediaLimitService } from './media-limit.service';
import { MediaProcessingService } from './media-processing.service';
import { MediaValidationService } from './media-validation.service';
import { Media, MediaDocument } from './schemas/media.schema';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly albumsService: AlbumsService,
    private readonly mediaLimitService: MediaLimitService,
    private readonly mediaValidationService: MediaValidationService,
    private readonly mediaProcessingService: MediaProcessingService,
    private readonly usageService: UsageService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    private readonly eventBus: EventBusService,
  ) {}

  async initiateUpload(studioId: string, userId: string, dto: InitiateUploadDto) {
    await this.albumsService.findById(studioId, dto.albumId);
    await this.mediaLimitService.validateUpload(
      studioId,
      dto.albumId,
      dto.mediaType,
      dto.mimeType,
      dto.fileSize,
    );

    const extension = this.resolveExtension(dto.originalFileName, dto.mimeType);
    const fileName = `${randomUUID()}${extension}`;
    const r2ObjectKey = this.buildObjectKey(studioId, dto.albumId, dto.mediaType, fileName);

    const presigned = await this.storageService.getPresignedUploadUrl(
      r2ObjectKey,
      dto.mimeType,
      undefined,
      dto.fileSize,
    );

    const media = await this.mediaModel.create({
      studioId,
      albumId: dto.albumId,
      mediaType: dto.mediaType,
      fileName,
      originalFileName: dto.originalFileName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      r2ObjectKey,
      publicUrl: presigned.publicUrl,
      status: MediaStatus.UPLOADING,
      uploadedBy: userId,
    });

    return {
      media: this.serialize(media),
      upload: presigned,
    };
  }

  async confirmUpload(studioId: string, mediaId: string, dto: ConfirmUploadDto) {
    const media = await this.findDocument(studioId, mediaId);

    if (media.status !== MediaStatus.UPLOADING && media.status !== MediaStatus.FAILED) {
      throw new BadRequestException('Media is not awaiting upload confirmation');
    }

    const metadata = await this.storageService.getObjectMetadata(media.r2ObjectKey);
    let actualSize = media.fileSize;

    if (metadata) {
      actualSize = metadata.sizeBytes;

      if (actualSize <= 0) {
        throw new BadRequestException(
          'Upload incomplete — no file data found in storage. Check R2 endpoint and CORS settings.',
        );
      }

      const drift = Math.abs(actualSize - media.fileSize);
      const allowedDrift = Math.max(4096, Math.round(media.fileSize * 0.02));

      if (drift > allowedDrift) {
        if (actualSize < media.fileSize * 0.5) {
          throw new BadRequestException(
            'Uploaded file size mismatch — stored file is much smaller than expected. The upload may have failed.',
          );
        }
        if (actualSize > media.fileSize * 1.1) {
          throw new BadRequestException('Uploaded file exceeds declared size');
        }
      }
    }

    media.status = MediaStatus.PROCESSING;
    await media.save();

    try {
      const processed = await this.mediaProcessingService.runProcessing(
        media.mediaType,
        media.publicUrl ?? this.storageService.getPublicUrl(media.r2ObjectKey),
        media.r2ObjectKey,
        dto,
      );

      media.width = processed.width;
      media.height = processed.height;
      media.duration = processed.duration;
      media.thumbnailUrl = processed.thumbnailUrl;
      media.publicUrl = this.storageService.getPublicUrl(media.r2ObjectKey);
      media.fileSize = actualSize;
      media.status = MediaStatus.READY;
      media.failureReason = null;
      await media.save();

      await this.usageService.incrementStorageUsage(
        studioId,
        this.mediaValidationService.bytesToGB(actualSize),
      );

      void this.trackMediaEvent(studioId, media.albumId.toString(), media.mediaType);
      void this.eventBus.publish({
        eventType: DomainEventType.MEDIA_UPLOAD_COMPLETED,
        studioId,
        metadata: { mediaId: media._id.toString(), mediaType: media.mediaType },
      });

      return this.serialize(media);
    } catch (error) {
      media.status = MediaStatus.FAILED;
      media.failureReason = (error as Error).message;
      await media.save();
      void this.eventBus.publish({
        eventType: DomainEventType.MEDIA_UPLOAD_FAILED,
        studioId,
        metadata: { mediaId: media._id.toString(), reason: media.failureReason },
      });
      throw error;
    }
  }

  async retryUpload(studioId: string, mediaId: string) {
    const media = await this.findDocument(studioId, mediaId);

    if (media.status !== MediaStatus.FAILED && media.status !== MediaStatus.UPLOADING) {
      throw new BadRequestException('Only failed or stalled uploads can be retried');
    }

    await this.mediaLimitService.validateUpload(
      studioId,
      media.albumId.toString(),
      media.mediaType,
      media.mimeType,
      media.fileSize,
    );

    const presigned = await this.storageService.getPresignedUploadUrl(
      media.r2ObjectKey,
      media.mimeType,
      undefined,
      media.fileSize,
    );
    media.status = MediaStatus.UPLOADING;
    media.failureReason = null;
    await media.save();

    return {
      media: this.serialize(media),
      upload: presigned,
    };
  }

  async cancelUpload(studioId: string, mediaId: string) {
    const media = await this.findDocument(studioId, mediaId);

    if (media.status !== MediaStatus.UPLOADING && media.status !== MediaStatus.FAILED) {
      throw new BadRequestException('Only pending uploads can be cancelled');
    }

    media.status = MediaStatus.DELETED;
    media.deletedAt = new Date();
    await media.save();

    return { id: media._id.toString(), cancelled: true };
  }

  async findAll(studioId: string, query: QueryMediaDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const filter = this.buildFilter(studioId, query);
    const sort = this.buildSort(query);

    const [items, total] = await Promise.all([
      this.mediaModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.mediaModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.serialize(item)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findByAlbum(studioId: string, albumId: string, query: QueryMediaDto) {
    await this.albumsService.findById(studioId, albumId);
    return this.findAll(studioId, { ...query, albumId });
  }

  async findById(studioId: string, id: string) {
    const media = await this.findDocument(studioId, id);
    return this.serialize(media);
  }

  async softDelete(studioId: string, id: string) {
    const media = await this.findDocument(studioId, id);

    if (media.status === MediaStatus.DELETED) {
      throw new BadRequestException('Media already deleted');
    }

    if (media.status === MediaStatus.READY) {
      await this.storageService.deleteObject(media.r2ObjectKey);
      if (media.thumbnailUrl) {
        const thumbKey = this.extractKeyFromUrl(media.thumbnailUrl);
        if (thumbKey) await this.storageService.deleteObject(thumbKey).catch(() => undefined);
      }
      await this.usageService.decrementStorageUsage(
        studioId,
        this.mediaValidationService.bytesToGB(media.fileSize),
      );
    }

    media.status = MediaStatus.DELETED;
    media.deletedAt = new Date();
    await media.save();

    void this.analyticsIngestionService
      .recordEvent({
        studioId,
        albumId: media.albumId.toString(),
        eventType: AnalyticsEventType.MEDIA_DELETED,
        metadata: { mediaId: media._id.toString(), mediaType: media.mediaType },
      })
      .catch(() => undefined);

    return { id: media._id.toString(), deleted: true };
  }

  private buildFilter(studioId: string, query: QueryMediaDto): FilterQuery<MediaDocument> {
    const filter: FilterQuery<MediaDocument> = {
      studioId,
      deletedAt: null,
      status: { $ne: MediaStatus.DELETED },
    };

    if (query.albumId) filter.albumId = query.albumId;
    if (query.mediaType) filter.mediaType = query.mediaType;
    if (query.status) filter.status = query.status;

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { originalFileName: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } },
      ];
    }

    return filter;
  }

  private buildSort(query: QueryMediaDto): Record<string, SortOrder> {
    const field = query.sortBy ?? MediaSortField.CREATED_AT;
    const order: SortOrder = query.sortOrder === MediaSortOrder.ASC ? 1 : -1;
    return { [field]: order };
  }

  private async findDocument(studioId: string, id: string): Promise<MediaDocument> {
    const media = await this.mediaModel
      .findOne({ _id: id, studioId, deletedAt: null, status: { $ne: MediaStatus.DELETED } })
      .exec();

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  private buildObjectKey(
    studioId: string,
    albumId: string,
    mediaType: MediaType,
    fileName: string,
  ): string {
    const folder = mediaType === MediaType.PHOTO ? 'photos' : 'videos';
    return `tenants/${studioId}/albums/${albumId}/${folder}/${fileName}`;
  }

  private resolveExtension(fileName: string, mimeType: string): string {
    const ext = extname(fileName);
    if (ext) return ext.toLowerCase();

    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
    };

    return map[mimeType.toLowerCase()] ?? '';
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const base = this.storageService.getPublicUrl('');
      return url.replace(base.replace(/\/$/, ''), '').replace(/^\//, '');
    } catch {
      return null;
    }
  }

  serialize(media: MediaDocument) {
    const doc = media as MediaDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: media._id.toString(),
      studioId: media.studioId.toString(),
      albumId: media.albumId.toString(),
      mediaType: media.mediaType,
      fileName: media.fileName,
      originalFileName: media.originalFileName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      width: media.width ?? null,
      height: media.height ?? null,
      duration: media.duration ?? null,
      r2ObjectKey: media.r2ObjectKey,
      publicUrl: media.publicUrl ?? null,
      thumbnailUrl: media.thumbnailUrl ?? null,
      status: media.status,
      uploadedBy: media.uploadedBy.toString(),
      failureReason: media.failureReason ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private trackMediaEvent(studioId: string, albumId: string, mediaType: MediaType) {
    const eventType =
      mediaType === MediaType.PHOTO
        ? AnalyticsEventType.PHOTO_UPLOADED
        : AnalyticsEventType.VIDEO_UPLOADED;
    void this.analyticsIngestionService
      .recordEvent({ studioId, albumId, eventType })
      .catch(() => undefined);
  }
}
