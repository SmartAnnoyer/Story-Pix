import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { MindArCompilerService } from '../mind-ar/mind-ar-compiler.service';
import { IStorageService, STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { RecordViewerEventDto } from './dto/viewer.dto';
import { Album, AlbumDocument } from '../albums/schemas/album.schema';
import { Studio, StudioDocument } from '../studios/schemas/studio.schema';
import { Media, MediaDocument } from '../media/schemas/media.schema';
import { mapLegacyScanEventType } from '../analytics/utils/analytics.util';

@Injectable()
export class ViewerService {
  constructor(
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly albumsService: AlbumsService,
    private readonly arTargetsService: ArTargetsService,
    private readonly mediaService: MediaService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    private readonly limitValidationService: LimitValidationService,
    private readonly usageService: UsageService,
    private readonly mindArCompilerService: MindArCompilerService,
  ) {}

  async getPublicManifest(albumSlug: string) {
    const albumDoc = await this.findPublishedAlbumDocument(albumSlug);
    const [album, studio, targets] = await Promise.all([
      this.albumsService.findPublicBySlug(albumSlug),
      this.studioModel.findById(albumDoc.studioId).select('studioName logo').exec(),
      this.arTargetsService.findActiveByAlbumId(albumDoc._id.toString()),
    ]);

    const mediaIds = targets.flatMap((target) => [target.photoMediaId, target.videoMediaId]);
    const mediaDocs =
      mediaIds.length > 0
        ? await this.mediaModel
            .find({
              _id: { $in: mediaIds },
              deletedAt: null,
            })
            .select('publicUrl thumbnailUrl r2ObjectKey studioId')
            .lean()
            .exec()
        : [];

    const studioId = albumDoc.studioId.toString();
    const mediaById = new Map(
      mediaDocs
        .filter((doc) => String(doc.studioId) === studioId)
        .map((doc) => [String(doc._id), doc] as const),
    );

    const resolveUrl = (publicUrl?: string | null, r2ObjectKey?: string | null) => {
      if (publicUrl) return publicUrl;
      if (r2ObjectKey) return this.storageService.getPublicUrl(r2ObjectKey);
      return null;
    };

    const manifestTargets = targets.map((target) => {
      const photo = mediaById.get(target.photoMediaId.toString());
      const video = mediaById.get(target.videoMediaId.toString());
      const photoUrl = resolveUrl(photo?.publicUrl, photo?.r2ObjectKey);
      const videoUrl = resolveUrl(video?.publicUrl, video?.r2ObjectKey);

      return {
        id: target._id.toString(),
        targetName: target.targetName,
        targetIndex: target.targetIndex,
        photoMediaId: target.photoMediaId.toString(),
        videoMediaId: target.videoMediaId.toString(),
        photoUrl,
        photoThumbnailUrl: photo?.thumbnailUrl ?? photoUrl,
        videoUrl,
        videoThumbnailUrl: video?.thumbnailUrl ?? null,
        // Viewer loads video via API proxy using r2ObjectKey — CDN URL is optional
        videoAvailable: Boolean(video?.r2ObjectKey || videoUrl),
        hasTrackingPhoto: Boolean(photo?.r2ObjectKey || photoUrl),
      };
    });

    const filteredTargets = manifestTargets
      .filter((target) => target.hasTrackingPhoto)
      .map(({ hasTrackingPhoto: _ignored, ...target }) => target);

    if (!albumDoc.mindFileUrl && filteredTargets.length > 0) {
      void this.mindArCompilerService.scheduleAlbumMindRebuild(albumDoc._id.toString());
    }

    return {
      album: {
        id: album.id,
        albumName: album.albumName,
        slug: album.slug,
        coverImage: album.coverImage,
        description: album.description,
      },
      targets: filteredTargets,
      branding: {
        studioName: studio?.studioName ?? null,
        logoUrl: studio?.logo ?? null,
      },
      mindFile: albumDoc.mindFileUrl
        ? {
            url: albumDoc.mindFileUrl,
            hash: albumDoc.mindFileHash ?? null,
            targetDimensions: albumDoc.mindFileTargetDimensions ?? [],
            compiledAt: albumDoc.mindFileCompiledAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  async getTrackingImageBuffer(albumSlug: string, targetId: string) {
    const target = await this.findActiveTarget(albumSlug, targetId);

    const photo = await this.mediaService
      .findById(target.studioId.toString(), target.photoMediaId.toString())
      .catch(() => null);

    if (!photo?.r2ObjectKey) {
      throw new NotFoundException('Tracking image not available');
    }

    return this.loadMediaBuffer(
      photo.r2ObjectKey,
      photo.publicUrl ?? photo.thumbnailUrl,
      photo.mimeType,
    );
  }

  async getMappingVideoBuffer(albumSlug: string, targetId: string) {
    const target = await this.findActiveTarget(albumSlug, targetId);

    const video = await this.mediaService
      .findById(target.studioId.toString(), target.videoMediaId.toString())
      .catch(() => null);

    if (!video?.r2ObjectKey) {
      throw new NotFoundException('Mapping video not available');
    }

    return this.loadMediaBuffer(
      video.r2ObjectKey,
      video.publicUrl ?? video.thumbnailUrl,
      video.mimeType ?? 'video/mp4',
    );
  }

  async recordEvent(albumSlug: string, dto: RecordViewerEventDto, req?: Request) {
    const albumDoc = await this.findPublishedAlbumDocument(albumSlug);
    const studioId = albumDoc.studioId.toString();
    const albumId = albumDoc._id.toString();
    const eventType = this.resolveEventType(dto.eventType);

    if (
      eventType === AnalyticsEventType.SCAN_SUCCESS ||
      dto.eventType === ScanEventType.SCAN_SUCCESS
    ) {
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

  private async findActiveTarget(albumSlug: string, targetId: string) {
    const album = await this.albumsService.findPublicBySlug(albumSlug);
    const targets = await this.arTargetsService.findActiveByAlbumId(album.id);
    const target = targets.find((item) => item._id.toString() === targetId);

    if (!target) {
      throw new NotFoundException('AR target not found');
    }

    return target;
  }

  private async loadMediaBuffer(
    r2ObjectKey: string,
    fallbackUrl: string | null | undefined,
    fallbackMimeType?: string | null,
  ) {
    const fromStorage = await this.storageService.getObjectBuffer(r2ObjectKey);
    if (fromStorage) {
      return {
        buffer: fromStorage.buffer,
        contentType: fromStorage.contentType,
      };
    }

    if (!fallbackUrl) {
      throw new NotFoundException('Media not available');
    }

    try {
      const response = await fetch(fallbackUrl);
      if (!response.ok) {
        throw new BadGatewayException('Failed to load media from storage');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get('content-type') ?? fallbackMimeType ?? 'application/octet-stream';

      return { buffer, contentType };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(
        `Failed to load media: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
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
