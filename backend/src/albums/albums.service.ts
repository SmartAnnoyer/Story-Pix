import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { FilterQuery, Model, Types, SortOrder as MongoSortOrder } from 'mongoose';
import { PaginatedResult } from '../common/dto/pagination.dto';
import {
  AlbumStatus,
  AnalyticsEventType,
  ArTargetStatus,
  DomainEventType,
  EventType,
} from '../common/enums';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import { MindArCompilerService } from '../mind-ar/mind-ar-compiler.service';
import { UsageService } from '../subscriptions/usage.service';
import { PacksService } from '../packs/packs.service';
import { SCANS_PER_MAPPING } from '../common/constants/pack.constants';
import { Album, AlbumDocument } from './schemas/album.schema';
import { ArTarget, ArTargetDocument } from '../ar-targets/schemas/ar-target.schema';
import {
  AlbumSortField,
  CreateAlbumDto,
  QueryAlbumsDto,
  SortOrder,
  UpdateAlbumDto,
} from './dto/album.dto';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(ArTarget.name) private readonly arTargetModel: Model<ArTargetDocument>,
    private readonly usageService: UsageService,
    private readonly packsService: PacksService,
    private readonly configService: ConfigService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    private readonly eventBus: EventBusService,
    private readonly mindArCompilerService: MindArCompilerService,
  ) {}

  async findAll(
    studioId: string,
    query: QueryAlbumsDto,
  ): Promise<PaginatedResult<ReturnType<typeof this.serialize>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = this.buildFilter(studioId, query);
    const sort = this.buildSort(query);

    const [items, total] = await Promise.all([
      this.albumModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.albumModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((album) => this.serialize(album)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findRecent(studioId: string, limit = 5) {
    const items = await this.albumModel
      .find({
        studioId: this.toObjectId(studioId),
        deletedAt: null,
        status: { $ne: AlbumStatus.ARCHIVED },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return items.map((album) => this.serialize(album));
  }

  async findById(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);
    return this.serialize(album);
  }

  async create(studioId: string, userId: string, dto: CreateAlbumDto) {
    const albumCode = await this.generateUniqueAlbumCode();
    const slug = await this.generateUniqueSlug(dto.albumName);
    const quota = await this.packsService.getMappingQuota(studioId);

    const album = await this.albumModel.create({
      studioId: new Types.ObjectId(studioId),
      albumCode,
      albumName: dto.albumName.trim(),
      slug,
      eventType: EventType.CUSTOM,
      customerName: dto.customerName.trim(),
      customerPhone: null,
      customerEmail: null,
      eventDate: new Date(),
      coverImage: dto.coverImage ?? null,
      description: null,
      status: AlbumStatus.DRAFT,
      isPublished: false,
      publishedAt: null,
      // Soft display hint — hard limit is studio-wide mapping pool.
      maxMappings: Math.max(quota.remainingMappingSlots, 1),
      scansPerMapping: SCANS_PER_MAPPING,
      scanLimit: Math.max(quota.remainingMappingSlots, 1) * SCANS_PER_MAPPING,
      scanUsage: 0,
      createdBy: new Types.ObjectId(userId),
    });

    await this.usageService.incrementAlbumCount(studioId);
    void this.trackEvent(studioId, album._id.toString(), AnalyticsEventType.ALBUM_CREATED);
    void this.eventBus.publish({
      eventType: DomainEventType.ALBUM_CREATED,
      studioId,
      userId,
      metadata: { albumName: album.albumName, albumId: album._id.toString() },
    });
    return this.serialize(album);
  }

  async assertMappingCapacity(studioId: string, albumId: string) {
    const album = await this.findDocument(studioId, albumId);
    const quota = await this.packsService.assertStudioHasMappingSlot(studioId);
    const usedInAlbum = await this.arTargetModel
      .countDocuments({
        albumId: album._id,
        studioId: this.toObjectId(studioId),
        status: { $ne: ArTargetStatus.ARCHIVED },
        deletedAt: null,
      })
      .exec();

    // Keep album soft cap in sync with remaining studio pool for UI.
    const softMax = usedInAlbum + quota.remainingMappingSlots;
    if ((album.maxMappings ?? 0) !== softMax) {
      album.maxMappings = softMax;
      album.scanLimit = softMax * (album.scansPerMapping || SCANS_PER_MAPPING);
      await album.save();
    }

    return {
      album,
      maxMappings: softMax,
      used: usedInAlbum,
      remainingMappingSlots: quota.remainingMappingSlots,
    };
  }

  async assertMappingScanAvailable(arTargetId: string) {
    const target = await this.arTargetModel.findById(arTargetId).exec();
    if (!target || target.deletedAt) {
      throw new NotFoundException('AR mapping not found');
    }

    const scanLimit = target.scanLimit ?? SCANS_PER_MAPPING;
    const scanUsage = target.scanUsage ?? 0;
    if (scanUsage >= scanLimit) {
      throw new ForbiddenException({
        message:
          'This photo’s scan limit is over. Please contact the photo studio to renew access.',
        code: 'MAPPING_SCAN_LIMIT_EXCEEDED',
        details: { arTargetId, scanLimit, scanUsage },
      });
    }

    return target;
  }

  async incrementMappingScanUsage(arTargetId: string, albumId: string) {
    await this.assertMappingScanAvailable(arTargetId);
    const target = await this.arTargetModel
      .findByIdAndUpdate(arTargetId, { $inc: { scanUsage: 1 } }, { new: true })
      .exec();
    if (!target) throw new NotFoundException('AR mapping not found');

    await this.albumModel.findByIdAndUpdate(albumId, { $inc: { scanUsage: 1 } }).exec();
    return target;
  }

  /** Add +1000 plays to every active mapping in the album (shop renewal). */
  async topUpAlbumScans(albumId: string, additionalScans = SCANS_PER_MAPPING) {
    const result = await this.renewMappingScans({ albumId, additionalScans });
    return result.album;
  }

  /**
   * Photos in an album that can receive extra plays. When `arTargetIds` is empty,
   * every live (non-archived) photo in the album is returned.
   */
  async resolveRenewableTargets(input: {
    albumId: string;
    studioId?: string;
    arTargetIds?: string[] | null;
  }) {
    if (!Types.ObjectId.isValid(input.albumId)) throw new NotFoundException('Album not found');
    const album = input.studioId
      ? await this.findDocument(input.studioId, input.albumId)
      : await this.albumModel.findOne({ _id: input.albumId, deletedAt: null }).exec();
    if (!album) throw new NotFoundException('Album not found');

    const filter: FilterQuery<ArTargetDocument> = {
      albumId: album._id,
      deletedAt: null,
      status: { $ne: ArTargetStatus.ARCHIVED },
    };
    const requested = [...new Set(input.arTargetIds ?? [])];
    if (requested.length) {
      if (requested.some((id) => !Types.ObjectId.isValid(id))) {
        throw new BadRequestException('Invalid photo selection');
      }
      filter._id = { $in: requested.map((id) => new Types.ObjectId(id)) };
    }

    const targets = await this.arTargetModel.find(filter).exec();
    if (!targets.length) {
      throw new BadRequestException('No live photos to renew in this album');
    }
    if (requested.length && targets.length !== requested.length) {
      throw new BadRequestException('Some selected photos are not in this album anymore');
    }
    return { album, targets };
  }

  /** Increase lifetime play limit on selected photos (or all live photos) in an album. */
  async renewMappingScans(input: {
    albumId: string;
    additionalScans: number;
    studioId?: string;
    arTargetIds?: string[] | null;
  }) {
    const { additionalScans } = input;
    if (!Number.isFinite(additionalScans) || additionalScans < 1) {
      throw new BadRequestException('additionalScans must be at least 1');
    }
    const { album, targets } = await this.resolveRenewableTargets(input);
    const targetIds = targets.map((target) => target._id);

    await this.arTargetModel
      .updateMany({ _id: { $in: targetIds } }, { $inc: { scanLimit: additionalScans } })
      .exec();

    album.scanLimit = (album.scanLimit ?? 0) + additionalScans * targetIds.length;
    await album.save();

    return {
      album: this.serialize(album),
      renewedCount: targetIds.length,
      arTargetIds: targetIds.map((id) => id.toString()),
    };
  }

  /** Per-album play usage for every live photo in a studio (super admin renewals). */
  async getScanUsageOverview(studioId: string) {
    if (!Types.ObjectId.isValid(studioId)) throw new NotFoundException('Studio not found');
    const albums = await this.albumModel
      .find({ studioId: this.toObjectId(studioId), deletedAt: null })
      .sort({ createdAt: -1 })
      .select({ albumName: 1, albumCode: 1, slug: 1, status: 1 })
      .exec();
    if (!albums.length) return [];

    const targets = await this.arTargetModel
      .find({
        albumId: { $in: albums.map((album) => album._id) },
        deletedAt: null,
        status: { $ne: ArTargetStatus.ARCHIVED },
      })
      .select({ albumId: 1, targetName: 1, status: 1, scanLimit: 1, scanUsage: 1 })
      .sort({ createdAt: 1 })
      .exec();

    const byAlbum = new Map<string, ArTargetDocument[]>();
    for (const target of targets) {
      const key = target.albumId.toString();
      byAlbum.set(key, [...(byAlbum.get(key) ?? []), target]);
    }

    return albums.map((album) => {
      const photos = (byAlbum.get(album._id.toString()) ?? []).map((target) => {
        const scanLimit = target.scanLimit ?? SCANS_PER_MAPPING;
        const scanUsage = target.scanUsage ?? 0;
        return {
          id: target._id.toString(),
          targetName: target.targetName,
          status: target.status,
          scanLimit,
          scanUsage,
          scansRemaining: Math.max(0, scanLimit - scanUsage),
          scansExhausted: scanUsage >= scanLimit,
        };
      });
      return {
        id: album._id.toString(),
        albumName: album.albumName,
        albumCode: album.albumCode,
        slug: album.slug,
        status: album.status,
        photoCount: photos.length,
        exhaustedCount: photos.filter((photo) => photo.scansExhausted).length,
        photos,
      };
    });
  }

  async assertAlbumScanAvailable(_albumId: string) {
    // Kept for compatibility — guest enforcement is per mapping.
    return null;
  }

  async incrementAlbumScanUsage(_albumId: string) {
    return null;
  }

  async update(studioId: string, id: string, dto: UpdateAlbumDto) {
    const album = await this.findDocument(studioId, id);

    if (album.status === AlbumStatus.ARCHIVED) {
      throw new BadRequestException('Archived albums cannot be edited');
    }

    if (dto.albumName && dto.albumName.trim() !== album.albumName) {
      album.slug = await this.generateUniqueSlug(dto.albumName.trim(), album._id.toString());
      album.albumName = dto.albumName.trim();
    }

    if (dto.customerName !== undefined) album.customerName = dto.customerName.trim();
    if (dto.coverImage !== undefined) album.coverImage = dto.coverImage ?? null;

    await album.save();
    return this.serialize(album);
  }

  async softDelete(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    album.deletedAt = new Date();
    album.isPublished = false;
    if (album.status === AlbumStatus.PUBLISHED) {
      album.status = AlbumStatus.DRAFT;
      album.publishedAt = null;
    }
    await album.save();

    // Free mapping slots — targets on deleted albums must not keep consuming quota.
    await this.archiveTargetsForAlbum(studioId, album._id);

    await this.usageService.decrementAlbumCount(studioId);
    return { id: album._id.toString(), deleted: true };
  }

  async publish(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    if (album.status === AlbumStatus.ARCHIVED) {
      throw new BadRequestException('Archived albums cannot be published');
    }

    // Match the same albumId lookup the AR Mappings list uses (string id).
    // Some docs may store albumId as ObjectId or string — accept both.
    const albumId = album._id.toString();
    const activeMappings = await this.arTargetModel
      .countDocuments({
        albumId: { $in: [albumId, album._id, new Types.ObjectId(albumId)] },
        status: ArTargetStatus.ACTIVE,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .exec();

    if (activeMappings < 1) {
      throw new BadRequestException(
        'Publish at least one AR mapping (photo → video) before publishing the album',
      );
    }

    album.status = AlbumStatus.PUBLISHED;
    album.isPublished = true;
    album.publishedAt = new Date();
    album.mindFileBuildStatus = 'building';
    album.mindFileBuildProgress = 1;
    album.mindFileBuildMessage = 'Starting AR scan file build…';
    album.mindFileBuildError = null;
    album.mindFileBuildStartedAt = new Date();
    await album.save();
    void this.mindArCompilerService.scheduleAlbumMindRebuild(album._id.toString());
    void this.trackEvent(studioId, album._id.toString(), AnalyticsEventType.ALBUM_PUBLISHED);
    void this.eventBus.publish({
      eventType: DomainEventType.ALBUM_PUBLISHED,
      studioId,
      metadata: { albumName: album.albumName, albumId: album._id.toString() },
    });
    return this.serialize(album);
  }

  async unpublish(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    if (album.status !== AlbumStatus.PUBLISHED) {
      throw new BadRequestException('Only published albums can be unpublished');
    }

    album.status = AlbumStatus.DRAFT;
    album.isPublished = false;
    await album.save();
    void this.mindArCompilerService.scheduleAlbumMindRebuild(album._id.toString());
    return this.serialize(album);
  }

  async archive(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    album.status = AlbumStatus.ARCHIVED;
    album.isPublished = false;
    await album.save();

    await this.archiveTargetsForAlbum(studioId, album._id);

    void this.mindArCompilerService.scheduleAlbumMindRebuild(album._id.toString());
    void this.trackEvent(studioId, album._id.toString(), AnalyticsEventType.ALBUM_ARCHIVED);
    void this.eventBus.publish({
      eventType: DomainEventType.ALBUM_ARCHIVED,
      studioId,
      metadata: { albumName: album.albumName, albumId: album._id.toString() },
    });
    return this.serialize(album);
  }

  async rebuildArScanFile(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    if (album.status !== AlbumStatus.PUBLISHED || !album.isPublished) {
      throw new BadRequestException('Publish the album before rebuilding the AR scan file');
    }

    album.mindFileBuildStatus = 'building';
    album.mindFileBuildProgress = 1;
    album.mindFileBuildMessage = 'Retrying AR scan file build…';
    album.mindFileBuildError = null;
    album.mindFileBuildStartedAt = new Date();
    album.mindFileHash = null;
    await album.save();

    void this.mindArCompilerService.scheduleAlbumMindRebuild(album._id.toString());
    return this.serialize(album);
  }

  async findPublicBySlug(slug: string) {
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

    return this.serializePublic(album);
  }

  private buildFilter(studioId: string, query: QueryAlbumsDto): FilterQuery<AlbumDocument> {
    const filter: FilterQuery<AlbumDocument> = {
      studioId: this.toObjectId(studioId),
      deletedAt: null,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { albumName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    return filter;
  }

  private buildSort(query: QueryAlbumsDto): Record<string, MongoSortOrder> {
    const field = query.sortBy ?? AlbumSortField.CREATED_AT;
    const order: MongoSortOrder = query.sortOrder === SortOrder.ASC ? 1 : -1;
    return { [field]: order };
  }

  /** Soft-delete all mappings on an album so pack quota is released. */
  private async archiveTargetsForAlbum(studioId: string, albumId: Types.ObjectId) {
    const studioFilter = Types.ObjectId.isValid(studioId)
      ? { $in: [studioId, new Types.ObjectId(studioId)] }
      : studioId;
    const albumIdStr = albumId.toString();
    const albumFilter = Types.ObjectId.isValid(albumIdStr)
      ? { $in: [albumIdStr, new Types.ObjectId(albumIdStr)] }
      : albumIdStr;

    const targets = await this.arTargetModel
      .find({
        studioId: studioFilter,
        albumId: albumFilter,
        status: { $ne: ArTargetStatus.ARCHIVED },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .exec();

    let hadActive = false;
    for (const target of targets) {
      if (target.status === ArTargetStatus.ACTIVE) hadActive = true;
      target.deletedAt = new Date();
      target.status = ArTargetStatus.ARCHIVED;
      target.targetIndex = null;
      await target.save();
    }

    if (hadActive) {
      void this.mindArCompilerService.scheduleAlbumMindRebuild(albumIdStr);
    }
  }

  private async findDocument(studioId: string, id: string): Promise<AlbumDocument> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(studioId)) {
      throw new NotFoundException('Album not found');
    }

    const album = await this.albumModel
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .exec();

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (album.studioId.toString() !== studioId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    return album;
  }

  private toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }

  private async generateUniqueAlbumCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `ALB-${randomBytes(3).toString('hex').toUpperCase()}`;
      const exists = await this.albumModel.exists({ albumCode: code }).exec();
      if (!exists) return code;
    }
    throw new BadRequestException('Unable to generate unique album code');
  }

  private async generateUniqueSlug(albumName: string, excludeId?: string): Promise<string> {
    const base = albumName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    const suffix = randomBytes(3).toString('hex');
    let slug = `${base}-${suffix}`;

    for (let attempt = 0; attempt < 10; attempt++) {
      const filter: FilterQuery<AlbumDocument> = { slug, deletedAt: null };
      if (excludeId) filter._id = { $ne: excludeId };
      const exists = await this.albumModel.exists(filter).exec();
      if (!exists) return slug;
      slug = `${base}-${randomBytes(3).toString('hex')}`;
    }

    throw new BadRequestException('Unable to generate unique album slug');
  }

  private getPublicViewerUrl(slug: string): string {
    const baseUrl =
      this.configService.get<string>('app.viewerBaseUrl') ?? 'https://story-pix.app/viewer';
    return `${baseUrl.replace(/\/$/, '')}/${slug}`;
  }

  serialize(album: AlbumDocument) {
    const doc = album as AlbumDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: album._id.toString(),
      studioId: album.studioId.toString(),
      albumCode: album.albumCode,
      albumName: album.albumName,
      slug: album.slug,
      publicViewerUrl: this.getPublicViewerUrl(album.slug),
      customerName: album.customerName,
      coverImage: album.coverImage ?? null,
      status: album.status,
      isPublished: album.isPublished,
      publishedAt: album.publishedAt ?? null,
      arScanFileReady: Boolean(
        album.mindFileUrl && (album.mindFileTargetDimensions?.length ?? 0) > 0,
      ),
      arScanFileStatus: album.mindFileUrl ? 'ready' : (album.mindFileBuildStatus ?? 'idle'),
      arScanFileProgress: album.mindFileUrl
        ? 100
        : Math.max(0, Math.min(100, album.mindFileBuildProgress ?? 0)),
      arScanFileMessage: album.mindFileBuildMessage ?? null,
      arScanFileError: album.mindFileBuildError ?? null,
      arScanFileCompiledAt: album.mindFileCompiledAt
        ? album.mindFileCompiledAt.toISOString()
        : null,
      arScanFileBuildStartedAt: album.mindFileBuildStartedAt
        ? album.mindFileBuildStartedAt.toISOString()
        : null,
      packCreditId: album.packCreditId?.toString() ?? null,
      packCode: album.packCode ?? null,
      packName: album.packName ?? null,
      maxMappings: album.maxMappings ?? 25,
      scansPerMapping: album.scansPerMapping ?? SCANS_PER_MAPPING,
      scanLimit: album.scanLimit ?? (album.maxMappings ?? 25) * SCANS_PER_MAPPING,
      scanUsage: album.scanUsage ?? 0,
      scansRemaining: Math.max(
        0,
        (album.scanLimit ?? (album.maxMappings ?? 25) * SCANS_PER_MAPPING) - (album.scanUsage ?? 0),
      ),
      scansExhausted: false,
      createdBy: album.createdBy.toString(),
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private serializePublic(album: AlbumDocument) {
    return {
      id: album._id.toString(),
      albumName: album.albumName,
      slug: album.slug,
      publicViewerUrl: this.getPublicViewerUrl(album.slug),
      coverImage: album.coverImage ?? null,
      publishedAt: album.publishedAt ?? null,
    };
  }

  assertStudioAccess(studioId: string, userStudioId?: string) {
    if (!userStudioId || userStudioId !== studioId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  private trackEvent(studioId: string, albumId: string, eventType: AnalyticsEventType) {
    void this.analyticsIngestionService
      .recordEvent({ studioId, albumId, eventType })
      .catch(() => undefined);
  }
}
