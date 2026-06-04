import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request } from 'express';
import { AlbumsService } from '../albums/albums.service';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import { AlbumStatus, AnalyticsEventType, ScanEventType } from '../common/enums';
import { MediaService } from '../media/media.service';
import { LimitValidationService } from '../subscriptions/limit-validation.service';
import { UsageService } from '../subscriptions/usage.service';
import { ArTargetsService } from '../ar-targets/ar-targets.service';
import { IStorageService, STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { RecordViewerEventDto } from './dto/viewer.dto';
import { Album, AlbumDocument } from '../albums/schemas/album.schema';
import { Studio, StudioDocument } from '../studios/schemas/studio.schema';
import { mapLegacyScanEventType } from '../analytics/utils/analytics.util';

@Injectable()
export class ViewerService {
  constructor(
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly albumsService: AlbumsService,
    private readonly arTargetsService: ArTargetsService,
    private readonly mediaService: MediaService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    private readonly limitValidationService: LimitValidationService,
    private readonly usageService: UsageService,
  ) {}

  async getPublicManifest(albumSlug: string) {
    const album = await this.albumsService.findPublicBySlug(albumSlug);
    const albumDoc = await this.findPublishedAlbumDocument(albumSlug);
    const studio = await this.studioModel
      .findById(albumDoc.studioId)
      .select('studioName logo')
      .exec();
    const targets = await this.arTargetsService.findActiveByAlbumId(album.id);

    const manifestTargets = await Promise.all(
      targets.map(async (target) => {
        const photo = await this.mediaService
          .findById(target.studioId.toString(), target.photoMediaId.toString())
          .catch(() => null);
        const video = await this.mediaService
          .findById(target.studioId.toString(), target.videoMediaId.toString())
          .catch(() => null);

        return {
          id: target._id.toString(),
          targetName: target.targetName,
          targetIndex: target.targetIndex,
          photoMediaId: target.photoMediaId.toString(),
          videoMediaId: target.videoMediaId.toString(),
          photoUrl: photo?.publicUrl ?? null,
          photoThumbnailUrl: photo?.thumbnailUrl ?? photo?.publicUrl ?? null,
          videoUrl: video?.publicUrl ?? null,
          videoThumbnailUrl: video?.thumbnailUrl ?? null,
          videoAvailable: Boolean(video?.publicUrl),
        };
      }),
    );

    return {
      album: {
        id: album.id,
        albumName: album.albumName,
        slug: album.slug,
        coverImage: album.coverImage,
        description: album.description,
      },
      targets: manifestTargets.filter((target) => target.photoUrl),
      branding: {
        studioName: studio?.studioName ?? null,
        logoUrl: studio?.logo ?? null,
      },
    };
  }

  async getTrackingImageBuffer(albumSlug: string, targetId: string) {
    const album = await this.albumsService.findPublicBySlug(albumSlug);
    const targets = await this.arTargetsService.findActiveByAlbumId(album.id);
    const target = targets.find((item) => item._id.toString() === targetId);

    if (!target) {
      throw new NotFoundException('AR target not found');
    }

    const photo = await this.mediaService
      .findById(target.studioId.toString(), target.photoMediaId.toString())
      .catch(() => null);

    if (!photo?.r2ObjectKey) {
      throw new NotFoundException('Tracking image not available');
    }

    const fromStorage = await this.storageService.getObjectBuffer(photo.r2ObjectKey);
    if (fromStorage) {
      return {
        buffer: fromStorage.buffer,
        contentType: fromStorage.contentType,
      };
    }

    const imageUrl = photo.publicUrl ?? photo.thumbnailUrl;
    if (!imageUrl) {
      throw new NotFoundException('Tracking image not available');
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new BadGatewayException('Failed to load tracking image from storage');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') ?? photo.mimeType ?? 'image/jpeg';

      return { buffer, contentType };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(
        `Failed to load tracking image: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async recordEvent(albumSlug: string, dto: RecordViewerEventDto, req?: Request) {
    const albumDoc = await this.findPublishedAlbumDocument(albumSlug);
    const studioId = albumDoc.studioId.toString();
    const albumId = albumDoc._id.toString();
    const eventType = this.resolveEventType(dto.eventType);

    if (eventType === AnalyticsEventType.SCAN_SUCCESS || dto.eventType === ScanEventType.SCAN_SUCCESS) {
      await this.limitValidationService.checkScanLimit(studioId);
      await this.usageService.incrementScanUsage(studioId);
    }

    return this.analyticsIngestionService.recordEvent({
      studioId,
      albumId,
      albumSlug,
      eventType,
      arTargetId: dto.arTargetId,
      targetIndex: dto.targetIndex,
      deviceType: dto.deviceType,
      browser: dto.browser,
      userAgent: dto.userAgent,
      sessionId: dto.sessionId,
      ipAddress: this.extractIp(req),
      metadata: dto.metadata,
    });
  }

  private resolveEventType(eventType: RecordViewerEventDto['eventType']) {
    if (Object.values(ScanEventType).includes(eventType as ScanEventType)) {
      return mapLegacyScanEventType(eventType as ScanEventType);
    }
    return eventType as AnalyticsEventType;
  }

  private extractIp(req?: Request) {
    const forwarded = req?.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
    return req?.ip;
  }

  private async findPublishedAlbumDocument(slug: string) {
    const album = await this.albumModel
      .findOne({
        slug,
        deletedAt: null,
        isPublished: true,
        status: AlbumStatus.PUBLISHED,
      })
      .exec();

    if (!album) {
      throw new NotFoundException('Album not found or not published');
    }

    return album;
  }
}
