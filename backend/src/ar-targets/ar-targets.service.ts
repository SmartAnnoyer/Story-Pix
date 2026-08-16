import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { AlbumsService } from '../albums/albums.service';
import { ArTargetStatus, MediaStatus, MediaType } from '../common/enums';
import { MediaService } from '../media/media.service';
import { clampOverlayFrame } from '../common/dto/overlay-frame.dto';
import { MindArCompilerService } from '../mind-ar/mind-ar-compiler.service';
import {
  ArTargetSortField,
  ArTargetSortOrder,
  CreateArTargetDto,
  QueryArTargetsDto,
  UpdateArTargetDto,
} from './dto/ar-target.dto';
import { ArTarget, ArTargetDocument } from './schemas/ar-target.schema';

@Injectable()
export class ArTargetsService {
  constructor(
    @InjectModel(ArTarget.name) private readonly arTargetModel: Model<ArTargetDocument>,
    private readonly albumsService: AlbumsService,
    private readonly mediaService: MediaService,
    private readonly mindArCompilerService: MindArCompilerService,
  ) {}

  async findAll(studioId: string, query: QueryArTargetsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = this.buildFilter(studioId, query);
    const sort = this.buildSort(query);

    const [items, total] = await Promise.all([
      this.arTargetModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.arTargetModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: await Promise.all(items.map((item) => this.serializeWithMedia(studioId, item))),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findByAlbum(studioId: string, albumId: string, query: QueryArTargetsDto) {
    await this.albumsService.findById(studioId, albumId);
    return this.findAll(studioId, { ...query, albumId });
  }

  async findById(studioId: string, id: string) {
    const target = await this.findDocument(studioId, id);
    return this.serializeWithMedia(studioId, target);
  }

  async create(studioId: string, dto: CreateArTargetDto) {
    await this.albumsService.findById(studioId, dto.albumId);
    await this.validateMediaPair(studioId, dto.albumId, dto.photoMediaId, dto.videoMediaId);
    await this.ensureUniquePair(studioId, dto.albumId, dto.photoMediaId, dto.videoMediaId);

    const overlayFrame = await this.resolveOverlayFrame(
      studioId,
      dto.photoMediaId,
      dto.overlayFrame,
    );

    const target = await this.arTargetModel.create({
      studioId,
      albumId: dto.albumId,
      photoMediaId: dto.photoMediaId,
      videoMediaId: dto.videoMediaId,
      targetName: dto.targetName.trim(),
      status: ArTargetStatus.DRAFT,
      targetIndex: null,
      overlayFrame,
    });

    return this.serializeWithMedia(studioId, target);
  }

  async update(studioId: string, id: string, dto: UpdateArTargetDto) {
    const target = await this.findDocument(studioId, id);

    if (target.status === ArTargetStatus.ARCHIVED) {
      throw new BadRequestException('Archived mappings cannot be edited');
    }

    if (target.status === ArTargetStatus.ACTIVE) {
      throw new BadRequestException('Published mappings must be archived before editing');
    }

    const albumId = target.albumId.toString();
    const previousPhotoId = target.photoMediaId.toString();
    const photoMediaId = dto.photoMediaId ?? previousPhotoId;
    const videoMediaId = dto.videoMediaId ?? target.videoMediaId.toString();

    if (dto.photoMediaId || dto.videoMediaId) {
      await this.validateMediaPair(studioId, albumId, photoMediaId, videoMediaId);
      await this.ensureUniquePair(studioId, albumId, photoMediaId, videoMediaId, id);
    }

    if (dto.photoMediaId && dto.photoMediaId !== target.photoMediaId.toString()) {
      target.photoMediaId = dto.photoMediaId as never;
    }

    if (dto.videoMediaId && dto.videoMediaId !== target.videoMediaId.toString()) {
      target.videoMediaId = dto.videoMediaId as never;
    }

    if (dto.targetName) {
      target.targetName = dto.targetName.trim();
    }

    if (dto.overlayFrame) {
      target.overlayFrame = clampOverlayFrame(dto.overlayFrame);
    } else if (dto.photoMediaId && dto.photoMediaId !== previousPhotoId) {
      target.overlayFrame = await this.resolveOverlayFrame(studioId, dto.photoMediaId);
    }

    await target.save();
    return this.serializeWithMedia(studioId, target);
  }

  async softDelete(studioId: string, id: string) {
    const target = await this.findDocument(studioId, id);
    const wasActive = target.status === ArTargetStatus.ACTIVE;

    target.deletedAt = new Date();
    target.status = ArTargetStatus.ARCHIVED;
    target.targetIndex = null;
    await target.save();

    if (wasActive) {
      void this.mindArCompilerService.scheduleAlbumMindRebuild(target.albumId.toString());
    }

    return { id: target._id.toString(), deleted: true };
  }

  async publish(studioId: string, id: string) {
    const target = await this.findDocument(studioId, id);

    if (target.status === ArTargetStatus.ACTIVE) {
      throw new BadRequestException('Mapping is already published');
    }

    if (target.status === ArTargetStatus.ARCHIVED) {
      throw new BadRequestException('Archived mappings cannot be published');
    }

    await this.validateMediaPair(
      studioId,
      target.albumId.toString(),
      target.photoMediaId.toString(),
      target.videoMediaId.toString(),
    );

    const nextIndex = await this.resolvePublishTargetIndex(
      target.albumId.toString(),
      target.photoMediaId.toString(),
    );
    target.targetIndex = nextIndex;
    target.status = ArTargetStatus.ACTIVE;
    await target.save();

    void this.mindArCompilerService.scheduleAlbumMindRebuild(target.albumId.toString());
    return this.serializeWithMedia(studioId, target);
  }

  async archive(studioId: string, id: string) {
    const target = await this.findDocument(studioId, id);

    if (target.status === ArTargetStatus.ARCHIVED) {
      throw new BadRequestException('Mapping is already archived');
    }

    target.status = ArTargetStatus.ARCHIVED;
    target.targetIndex = null;
    await target.save();

    void this.mindArCompilerService.scheduleAlbumMindRebuild(target.albumId.toString());
    return this.serializeWithMedia(studioId, target);
  }

  async findActiveByAlbumId(albumId: string) {
    const albumIdFilter = Types.ObjectId.isValid(albumId)
      ? { $in: [albumId, new Types.ObjectId(albumId)] }
      : albumId;

    return this.arTargetModel
      .find({
        albumId: albumIdFilter,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        status: ArTargetStatus.ACTIVE,
      })
      .sort({ targetIndex: 1 })
      .exec();
  }

  private async resolveOverlayFrame(
    studioId: string,
    photoMediaId: string,
    overlayFrame?: { x: number; y: number; width: number; height: number } | null,
  ) {
    if (overlayFrame) {
      return clampOverlayFrame(overlayFrame);
    }

    const photo = await this.mediaService.findById(studioId, photoMediaId).catch(() => null);
    return clampOverlayFrame(photo?.overlayFrame);
  }

  private async validateMediaPair(
    studioId: string,
    albumId: string,
    photoMediaId: string,
    videoMediaId: string,
  ) {
    if (photoMediaId === videoMediaId) {
      throw new BadRequestException('Photo and video must be different media items');
    }

    const [photo, video] = await Promise.all([
      this.mediaService.findById(studioId, photoMediaId),
      this.mediaService.findById(studioId, videoMediaId),
    ]);

    if (photo.albumId !== albumId) {
      throw new BadRequestException('Photo must belong to the selected album');
    }

    if (video.albumId !== albumId) {
      throw new BadRequestException('Video must belong to the selected album');
    }

    if (photo.mediaType !== MediaType.PHOTO) {
      throw new BadRequestException('Selected photo media must be an image');
    }

    if (video.mediaType !== MediaType.VIDEO) {
      throw new BadRequestException('Selected video media must be a video');
    }

    if (photo.status !== MediaStatus.READY) {
      throw new BadRequestException('Photo must be ready before mapping');
    }

    if (video.status !== MediaStatus.READY) {
      throw new BadRequestException('Video must be ready before mapping');
    }
  }

  private async ensureUniquePair(
    studioId: string,
    albumId: string,
    photoMediaId: string,
    videoMediaId: string,
    excludeId?: string,
  ) {
    const filter: FilterQuery<ArTargetDocument> = {
      studioId,
      albumId,
      deletedAt: null,
      status: { $in: [ArTargetStatus.DRAFT, ArTargetStatus.ACTIVE] },
      photoMediaId,
      videoMediaId,
    };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existing = await this.arTargetModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException('This photo and video are already mapped together');
    }
  }

  private async resolvePublishTargetIndex(albumId: string, photoMediaId: string) {
    const existing = await this.arTargetModel
      .findOne({
        albumId,
        photoMediaId,
        deletedAt: null,
        status: ArTargetStatus.ACTIVE,
        targetIndex: { $ne: null },
      })
      .exec();

    if (existing?.targetIndex != null) {
      return existing.targetIndex;
    }

    return this.getNextTargetIndex(albumId);
  }

  private async getNextTargetIndex(albumId: string) {
    const latest = await this.arTargetModel
      .findOne({
        albumId,
        deletedAt: null,
        status: ArTargetStatus.ACTIVE,
        targetIndex: { $ne: null },
      })
      .sort({ targetIndex: -1 })
      .exec();

    return latest?.targetIndex != null ? latest.targetIndex + 1 : 0;
  }

  private buildFilter(studioId: string, query: QueryArTargetsDto): FilterQuery<ArTargetDocument> {
    const filter: FilterQuery<ArTargetDocument> = {
      studioId,
      deletedAt: null,
    };

    if (query.albumId) filter.albumId = query.albumId;
    if (query.status) filter.status = query.status;

    return filter;
  }

  private buildSort(query: QueryArTargetsDto): Record<string, SortOrder> {
    const field = query.sortBy ?? ArTargetSortField.CREATED_AT;
    const order = query.sortOrder === ArTargetSortOrder.ASC ? 1 : -1;
    return { [field]: order };
  }

  private async findDocument(studioId: string, id: string) {
    const target = await this.arTargetModel.findOne({ _id: id, studioId, deletedAt: null }).exec();

    if (!target) {
      throw new NotFoundException('AR mapping not found');
    }

    return target;
  }

  private async serializeWithMedia(studioId: string, target: ArTargetDocument) {
    const doc = target as ArTargetDocument & { createdAt?: Date; updatedAt?: Date };
    const [photo, video] = await Promise.all([
      this.mediaService.findById(studioId, target.photoMediaId.toString()).catch(() => null),
      this.mediaService.findById(studioId, target.videoMediaId.toString()).catch(() => null),
    ]);

    return {
      id: target._id.toString(),
      studioId: target.studioId.toString(),
      albumId: target.albumId.toString(),
      photoMediaId: target.photoMediaId.toString(),
      videoMediaId: target.videoMediaId.toString(),
      targetName: target.targetName,
      targetIndex: target.targetIndex ?? null,
      status: target.status,
      mindFileUrl: target.mindFileUrl ?? null,
      overlayFrame: clampOverlayFrame(target.overlayFrame ?? photo?.overlayFrame),
      photo: photo
        ? {
            id: photo.id,
            publicUrl: photo.publicUrl,
            thumbnailUrl: photo.thumbnailUrl,
            originalFileName: photo.originalFileName,
          }
        : null,
      video: video
        ? {
            id: video.id,
            publicUrl: video.publicUrl,
            thumbnailUrl: video.thumbnailUrl,
            originalFileName: video.originalFileName,
            duration: video.duration,
          }
        : null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }
}
