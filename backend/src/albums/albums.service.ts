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
import { AlbumStatus, AnalyticsEventType, DomainEventType } from '../common/enums';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import { MindArCompilerService } from '../mind-ar/mind-ar-compiler.service';
import { UsageService } from '../subscriptions/usage.service';
import { Album, AlbumDocument } from './schemas/album.schema';
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
    private readonly usageService: UsageService,
    private readonly configService: ConfigService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
    private readonly eventBus: EventBusService,
    private readonly mindArCompilerService: MindArCompilerService,
  ) {}

  async findAll(studioId: string, query: QueryAlbumsDto): Promise<PaginatedResult<ReturnType<typeof this.serialize>>> {
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

    const album = await this.albumModel.create({
      studioId: new Types.ObjectId(studioId),
      albumCode,
      albumName: dto.albumName.trim(),
      slug,
      eventType: dto.eventType,
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone ?? null,
      customerEmail: dto.customerEmail?.toLowerCase() ?? null,
      eventDate: new Date(dto.eventDate),
      coverImage: dto.coverImage ?? null,
      description: dto.description ?? null,
      status: AlbumStatus.DRAFT,
      isPublished: false,
      publishedAt: null,
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

  async update(studioId: string, id: string, dto: UpdateAlbumDto) {
    const album = await this.findDocument(studioId, id);

    if (album.status === AlbumStatus.ARCHIVED) {
      throw new BadRequestException('Archived albums cannot be edited');
    }

    if (dto.albumName && dto.albumName.trim() !== album.albumName) {
      album.slug = await this.generateUniqueSlug(dto.albumName.trim(), album._id.toString());
      album.albumName = dto.albumName.trim();
    }

    if (dto.eventType !== undefined) album.eventType = dto.eventType;
    if (dto.customerName !== undefined) album.customerName = dto.customerName.trim();
    if (dto.customerPhone !== undefined) album.customerPhone = dto.customerPhone ?? null;
    if (dto.customerEmail !== undefined) album.customerEmail = dto.customerEmail?.toLowerCase() ?? null;
    if (dto.eventDate !== undefined) album.eventDate = new Date(dto.eventDate);
    if (dto.coverImage !== undefined) album.coverImage = dto.coverImage ?? null;
    if (dto.description !== undefined) album.description = dto.description ?? null;

    await album.save();
    return this.serialize(album);
  }

  async softDelete(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    if (album.status === AlbumStatus.PUBLISHED) {
      throw new BadRequestException('Unpublish the album before deleting');
    }

    album.deletedAt = new Date();
    album.isPublished = false;
    await album.save();

    await this.usageService.decrementAlbumCount(studioId);
    return { id: album._id.toString(), deleted: true };
  }

  async publish(studioId: string, id: string) {
    const album = await this.findDocument(studioId, id);

    if (album.status === AlbumStatus.ARCHIVED) {
      throw new BadRequestException('Archived albums cannot be published');
    }

    album.status = AlbumStatus.PUBLISHED;
    album.isPublished = true;
    album.publishedAt = new Date();
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
    void this.mindArCompilerService.scheduleAlbumMindRebuild(album._id.toString());
    void this.trackEvent(studioId, album._id.toString(), AnalyticsEventType.ALBUM_ARCHIVED);
    void this.eventBus.publish({
      eventType: DomainEventType.ALBUM_ARCHIVED,
      studioId,
      metadata: { albumName: album.albumName, albumId: album._id.toString() },
    });
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

    if (query.eventType) {
      filter.eventType = query.eventType;
    }

    if (query.dateFrom || query.dateTo) {
      filter.eventDate = {};
      if (query.dateFrom) filter.eventDate.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.eventDate.$lte = new Date(query.dateTo);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { albumName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { eventType: { $regex: search, $options: 'i' } },
      ];
    }

    return filter;
  }

  private buildSort(query: QueryAlbumsDto): Record<string, MongoSortOrder> {
    const field = query.sortBy ?? AlbumSortField.CREATED_AT;
    const order: MongoSortOrder = query.sortOrder === SortOrder.ASC ? 1 : -1;
    return { [field]: order };
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
    const baseUrl = this.configService.get<string>('app.viewerBaseUrl') ?? 'https://story-pix.app/viewer';
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
      eventType: album.eventType,
      customerName: album.customerName,
      customerPhone: album.customerPhone ?? null,
      customerEmail: album.customerEmail ?? null,
      eventDate: album.eventDate,
      coverImage: album.coverImage ?? null,
      description: album.description ?? null,
      status: album.status,
      isPublished: album.isPublished,
      publishedAt: album.publishedAt ?? null,
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
      eventType: album.eventType,
      eventDate: album.eventDate,
      coverImage: album.coverImage ?? null,
      description: album.description ?? null,
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
