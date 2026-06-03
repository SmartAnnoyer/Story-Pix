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
import { ScanEventType } from '../common/enums';

describe('ViewerService', () => {
  let service: ViewerService;

  const albumsService = { findPublicBySlug: jest.fn() };
  const arTargetsService = { findActiveByAlbumId: jest.fn() };
  const mediaService = { findById: jest.fn() };
  const analyticsIngestionService = { recordEvent: jest.fn() };
  const limitValidationService = { checkScanLimit: jest.fn() };
  const usageService = { incrementScanUsage: jest.fn() };

  const albumModel = { findOne: jest.fn() };
  const studioModel = { findById: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewerService,
        { provide: getModelToken('Album'), useValue: albumModel },
        { provide: getModelToken('Studio'), useValue: studioModel },
        { provide: AlbumsService, useValue: albumsService },
        { provide: ArTargetsService, useValue: arTargetsService },
        { provide: MediaService, useValue: mediaService },
        { provide: AnalyticsIngestionService, useValue: analyticsIngestionService },
        { provide: LimitValidationService, useValue: limitValidationService },
        { provide: UsageService, useValue: usageService },
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
    mediaService.findById.mockImplementation((_studio: string, id: string) =>
      Promise.resolve({
        publicUrl: id === 'photo1' ? 'https://example.com/photo.jpg' : 'https://example.com/video.mp4',
        thumbnailUrl: null,
      }),
    );

    const manifest = await service.getPublicManifest('wedding-slug');

    expect(manifest.album.slug).toBe('wedding-slug');
    expect(manifest.targets).toHaveLength(1);
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
