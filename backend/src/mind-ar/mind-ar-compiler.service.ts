import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlbumStatus, ArTargetStatus } from '../common/enums';
import { Album, AlbumDocument } from '../albums/schemas/album.schema';
import { ArTarget, ArTargetDocument } from '../ar-targets/schemas/ar-target.schema';
import { Media, MediaDocument } from '../media/schemas/media.schema';
import { IStorageService, STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { compileAlbumMindFile } from './compile-album-mind';

@Injectable()
export class MindArCompilerService {
  private readonly logger = new Logger(MindArCompilerService.name);
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(ArTarget.name) private readonly arTargetModel: Model<ArTargetDocument>,
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  scheduleAlbumMindRebuild(albumId: string) {
    const existing = this.inFlight.get(albumId);
    if (existing) {
      return existing;
    }

    const task = this.rebuildAlbumMindFile(albumId)
      .catch((error) => {
        this.logger.error(
          `Mind file rebuild failed for album ${albumId}: ${error instanceof Error ? error.message : error}`,
        );
      })
      .finally(() => {
        this.inFlight.delete(albumId);
      });

    this.inFlight.set(albumId, task);
    return task;
  }

  async rebuildAlbumMindFile(albumId: string): Promise<void> {
    const album = await this.albumModel.findById(albumId).exec();
    if (!album || album.deletedAt) {
      return;
    }

    if (album.status !== AlbumStatus.PUBLISHED || !album.isPublished) {
      await this.clearAlbumMindFile(album);
      return;
    }

    const targets = await this.arTargetModel
      .find({
        albumId,
        deletedAt: null,
        status: ArTargetStatus.ACTIVE,
      })
      .sort({ targetIndex: 1 })
      .exec();
    if (!targets.length) {
      await this.clearAlbumMindFile(album);
      return;
    }

    const studioId = album.studioId.toString();
    const imageBuffers: Buffer[] = [];

    for (const target of targets) {
      const photo = await this.mediaModel
        .findOne({
          _id: target.photoMediaId,
          studioId,
          deletedAt: null,
        })
        .select('r2ObjectKey')
        .exec();

      if (!photo?.r2ObjectKey) {
        throw new Error(`Tracking photo unavailable for target ${target._id.toString()}`);
      }

      const stored = await this.storageService.getObjectBuffer(photo.r2ObjectKey);
      if (!stored?.buffer?.length) {
        throw new Error(`Failed to load tracking photo for target ${target._id.toString()}`);
      }

      imageBuffers.push(stored.buffer);
    }

    const hashInput = targets
      .map(
        (target) =>
          `${target._id.toString()}:${target.photoMediaId.toString()}:${target.targetIndex ?? ''}`,
      )
      .join('|');
    const mindFileHash = createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

    if (album.mindFileHash === mindFileHash && album.mindFileUrl && album.mindFileKey) {
      this.logger.log(`Mind file already up to date for album ${albumId}`);
      return;
    }

    const compiled = await compileAlbumMindFile(imageBuffers);
    const objectKey = `studios/${studioId}/albums/${albumId}/ar/targets-${mindFileHash}.mind`;

    if (album.mindFileKey && album.mindFileKey !== objectKey) {
      await this.storageService.deleteObject(album.mindFileKey).catch(() => undefined);
    }

    const uploaded = await this.storageService.putObjectBuffer(
      objectKey,
      compiled.buffer,
      'application/octet-stream',
    );

    album.mindFileKey = uploaded.key;
    album.mindFileUrl = uploaded.publicUrl;
    album.mindFileHash = mindFileHash;
    album.mindFileCompiledAt = new Date();
    album.mindFileTargetDimensions = compiled.targetDimensions;
    await album.save();

    this.logger.log(`Mind file compiled for album ${albumId} (${compiled.buffer.length} bytes)`);
  }

  private async clearAlbumMindFile(album: AlbumDocument) {
    if (album.mindFileKey) {
      await this.storageService.deleteObject(album.mindFileKey).catch(() => undefined);
    }

    album.mindFileKey = null;
    album.mindFileUrl = null;
    album.mindFileHash = null;
    album.mindFileCompiledAt = null;
    album.mindFileTargetDimensions = null;
    await album.save();
  }
}
