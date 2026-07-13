import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ViewerService } from './viewer.service';
import { AlbumsService } from '../albums/albums.service';
import { ArTargetsService } from '../ar-targets/ar-targets.service';
import { MediaService } from '../media/media.service';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import { LimitValidationService } from '../subscriptions/limit-validation.service';
import { UsageService } from '../subscriptions/usage.service';
import { MindArCompilerService } from '../mind-ar/mind-ar-compiler.service';
import { STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { ScanEventType } from '../common/enums';

describe('ViewerService', () => {
  let service: ViewerService;

  const albumsService = { findPublicBySlug: jest.fn() };
  const arTargetsService = { findActiveByAlbumId: jest.fn() };
  const mediaService = { findById: jest.fn() };
  const analyticsIngestionService = { recordEvent: jest.fn() };
  const limitValidationService = { checkScanLimit: jest.fn() };
  const usageService = { incrementScanUsage: jest.fn() };
  const storageService = {
    getObjectBuffer: jest.fn(),
    getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
  };

  const albumModel = { findOne: jest.fn() };
  const studioModel = { findById: jest.fn() };
  const mediaModel = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: 'photo1',
              studioId: 'studio1',
              publicUrl: null,
              thumbnailUrl: null,
              r2ObjectKey: 'studios/studio1/photos/photo1.jpg',
            },
            {
              _id: 'video1',
              studioId: 'studio1',
              publicUrl: null,
              thumbnailUrl: null,
              r2ObjectKey: 'studios/studio1/videos/video1.mp4',
            },
          ]),
        }),
      }),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewerService,
        { provide: getModelToken('Album'), useValue: albumModel },
        { provide: getModelToken('Studio'), useValue: studioModel },
        { provide: getModelToken('Media'), useValue: mediaModel },
        { provide: AlbumsService, useValue: albumsService },
        { provide: ArTargetsService, useValue: arTargetsService },
        { provide: MediaService, useValue: mediaService },
        { provide: AnalyticsIngestionService, useValue: analyticsIngestionService },
        { provide: LimitValidationService, useValue: limitValidationService },
        { provide: UsageService, useValue: usageService },
        { provide: STORAGE_SERVICE, useValue: storageService },
        {
          provide: MindArCompilerService,
          useValue: { scheduleAlbumMindRebuild: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(ViewerService);
  });

  it('returns manifest for published album', async () => {
    albumsService.findPublicBySlug.mockResolvedValue({
      id: 'album1',
      albumName: 'Wedding',
      slug: 'wedding-slug',
      coverImage: null,
      description: null,
    });
    albumModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'album1', studioId: 'studio1' }),
    });
    studioModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ studioName: 'Studio', logo: null }),
      }),
    });
    arTargetsService.findActiveByAlbumId.mockResolvedValue([
      {
        _id: 'target1',
        studioId: 'studio1',
        targetName: 'Photo 1',
        targetIndex: 0,
        photoMediaId: 'photo1',
        videoMediaId: 'video1',
      },
    ]);

    const manifest = await service.getPublicManifest('wedding-slug');

    expect(manifest.album.slug).toBe('wedding-slug');
    expect(manifest.targets).toHaveLength(1);
    expect(manifest.targets[0].photoUrl).toBe(
      'https://cdn.example.com/studios/studio1/photos/photo1.jpg',
    );
    expect(manifest.targets[0].videoUrl).toBe(
      'https://cdn.example.com/studios/studio1/videos/video1.mp4',
    );
    expect(manifest.targets[0].videoAvailable).toBe(true);
  });

  it('records scan success and increments usage', async () => {
    albumModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'album1', studioId: 'studio1' }),
    });
    analyticsIngestionService.recordEvent.mockResolvedValue({ id: 'event1' });

    await service.recordEvent('wedding-slug', {
      eventType: ScanEventType.SCAN_SUCCESS,
      targetIndex: 0,
    });

    expect(limitValidationService.checkScanLimit).toHaveBeenCalledWith('studio1');
    expect(usageService.incrementScanUsage).toHaveBeenCalledWith('studio1');
  });

  it('throws when album is not published', async () => {
    albumModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.recordEvent('missing-slug', { eventType: ScanEventType.VIEWER_OPEN }),
    ).rejects.toThrow(NotFoundException);
  });
});
