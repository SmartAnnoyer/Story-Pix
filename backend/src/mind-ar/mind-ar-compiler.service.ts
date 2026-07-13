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
  private readonly lastProgressWrite = new Map<string, number>();

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

    // Mark building immediately so studio UI doesn't look stuck
    void this.albumModel
      .updateOne(
        { _id: albumId, mindFileUrl: null },
        {
          $set: {
            mindFileBuildStatus: 'building',
            mindFileBuildProgress: 1,
            mindFileBuildMessage: 'Starting AR scan file build…',
            mindFileBuildError: null,
            mindFileBuildStartedAt: new Date(),
          },
        },
      )
      .exec()
      .catch(() => undefined);

    const task = this.rebuildAlbumMindFile(albumId)
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Mind file rebuild failed for album ${albumId}: ${message}`);
        await this.markBuildFailed(albumId, message);
      })
      .finally(() => {
        this.inFlight.delete(albumId);
        this.lastProgressWrite.delete(albumId);
      });

    this.inFlight.set(albumId, task);
    return task;
  }

  async rebuildAlbumMindFile(albumId: string): Promise<void> {
    const startedAt = Date.now();
    const album = await this.albumModel.findById(albumId).exec();
    if (!album || album.deletedAt) {
      return;
    }

    if (album.status !== AlbumStatus.PUBLISHED || !album.isPublished) {
      await this.clearAlbumMindFile(album);
      return;
    }

    await this.updateBuildProgress(album, 2, 'Queuing scan-file build…');

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
    await this.updateBuildProgress(
      album,
      8,
      `Downloading ${targets.length} photo${targets.length === 1 ? '' : 's'}…`,
    );

    const imageBuffers = await Promise.all(
      targets.map(async (target) => {
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

        return stored.buffer;
      }),
    );

    const hashInput = targets
      .map(
        (target) =>
          `${target._id.toString()}:${target.photoMediaId.toString()}:${target.targetIndex ?? ''}`,
      )
      .join('|');
    const mindFileHash = createHash('sha256').update(hashInput).digest('hex').slice(0, 16);

    if (album.mindFileHash === mindFileHash && album.mindFileUrl && album.mindFileKey) {
      this.logger.log(`Mind file already up to date for album ${albumId}`);
      album.mindFileBuildStatus = 'ready';
      album.mindFileBuildProgress = 100;
      album.mindFileBuildMessage = 'Scan file already up to date';
      album.mindFileBuildError = null;
      await album.save();
      return;
    }

    await this.updateBuildProgress(
      album,
      18,
      `Analyzing ${targets.length} photo${targets.length === 1 ? '' : 's'} for AR…`,
    );

    const compiled = await compileAlbumMindFile(imageBuffers, (progress) => {
      const pct = Math.round(18 + progress * 70);
      void this.updateBuildProgress(
        album,
        pct,
        progress < 0.5
          ? 'Finding visual landmarks in your photos…'
          : 'Encoding the customer scan file…',
        false,
      );
    });

    await this.updateBuildProgress(album, 92, 'Uploading scan file…');

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
    album.mindFileBuildStatus = 'ready';
    album.mindFileBuildProgress = 100;
    album.mindFileBuildMessage = `Scan file ready (${compiled.mindVersion}) — safe to print QR`;
    album.mindFileBuildError = null;
    await album.save();

    this.logger.log(
      `Mind file compiled for album ${albumId} (${compiled.buffer.length} bytes, ${compiled.mindVersion}, ${Date.now() - startedAt}ms)`,
    );
  }

  private async updateBuildProgress(
    album: AlbumDocument,
    progress: number,
    message: string,
    force = true,
  ) {
    const albumId = album._id.toString();
    const clamped = Math.max(0, Math.min(100, progress));
    const last = this.lastProgressWrite.get(albumId) ?? -1;

    if (!force && clamped - last < 8 && clamped < 100) {
      return;
    }

    this.lastProgressWrite.set(albumId, clamped);
    const startedAt =
      !album.mindFileBuildStartedAt || clamped <= 5 ? new Date() : album.mindFileBuildStartedAt;

    album.mindFileBuildStatus = 'building';
    album.mindFileBuildProgress = clamped;
    album.mindFileBuildMessage = message;
    album.mindFileBuildError = null;
    album.mindFileBuildStartedAt = startedAt;

    await this.albumModel
      .updateOne(
        { _id: albumId },
        {
          $set: {
            mindFileBuildStatus: 'building',
            mindFileBuildProgress: clamped,
            mindFileBuildMessage: message,
            mindFileBuildError: null,
            mindFileBuildStartedAt: startedAt,
          },
        },
      )
      .exec();
  }

  private async markBuildFailed(albumId: string, errorMessage: string) {
    await this.albumModel
      .updateOne(
        { _id: albumId },
        {
          $set: {
            mindFileBuildStatus: 'failed',
            mindFileBuildProgress: 0,
            mindFileBuildMessage: 'Scan file build failed',
            mindFileBuildError: errorMessage.slice(0, 500),
          },
        },
      )
      .exec();
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
    album.mindFileBuildStatus = 'idle';
    album.mindFileBuildProgress = 0;
    album.mindFileBuildMessage = null;
    album.mindFileBuildError = null;
    album.mindFileBuildStartedAt = null;
    await album.save();
  }
}
