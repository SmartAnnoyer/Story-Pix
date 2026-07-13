import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { Album } from './schemas/album.schema';
import { ArTarget } from '../ar-targets/schemas/ar-target.schema';
import { UsageService } from '../subscriptions/usage.service';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import { MindArCompilerService } from '../mind-ar/mind-ar-compiler.service';
import { AlbumStatus, EventType } from '../common/enums';

const STUDIO_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const ALBUM_ID = '507f1f77bcf86cd799439013';

describe('AlbumsService', () => {
  let service: AlbumsService;

  const mockAlbumDoc = {
    _id: { toString: () => ALBUM_ID },
    studioId: { toString: () => STUDIO_ID },
    albumCode: 'ALB-ABC123',
    albumName: 'Wedding Album',
    slug: 'wedding-album-abc123',
    eventType: EventType.WEDDING,
    customerName: 'John Doe',
    customerPhone: null,
    customerEmail: null,
    eventDate: new Date('2026-06-01'),
    coverImage: null,
    description: null,
    status: AlbumStatus.DRAFT,
    isPublished: false,
    publishedAt: null,
    createdBy: { toString: () => USER_ID },
    deletedAt: null,
    save: jest.fn().mockResolvedValue(true),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const albumModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    countDocuments: jest.fn(),
  };

  const arTargetModel = {
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    }),
  };

  const usageService = {
    incrementAlbumCount: jest.fn().mockResolvedValue(1),
    decrementAlbumCount: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    arTargetModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumsService,
        { provide: getModelToken(Album.name), useValue: albumModel },
        { provide: getModelToken(ArTarget.name), useValue: arTargetModel },
        { provide: UsageService, useValue: usageService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('https://story-pix.app/viewer') },
        },
        {
          provide: AnalyticsIngestionService,
          useValue: { recordEvent: jest.fn().mockResolvedValue({ id: '1' }) },
        },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
        {
          provide: MindArCompilerService,
          useValue: { scheduleAlbumMindRebuild: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(AlbumsService);
  });

  it('should create album and increment usage', async () => {
    albumModel.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    albumModel.create.mockResolvedValue(mockAlbumDoc);

    const result = await service.create(STUDIO_ID, USER_ID, {
      albumName: 'Wedding Album',
      eventType: EventType.WEDDING,
      customerName: 'John Doe',
      eventDate: '2026-06-01',
    });

    expect(albumModel.create).toHaveBeenCalled();
    expect(usageService.incrementAlbumCount).toHaveBeenCalledWith(STUDIO_ID);
    expect(result.albumName).toBe('Wedding Album');
    expect(result.publicViewerUrl).toContain('wedding-album');
  });

  it('should throw when album not found', async () => {
    albumModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findById(STUDIO_ID, ALBUM_ID)).rejects.toThrow(NotFoundException);
  });

  it('should publish album', async () => {
    albumModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ ...mockAlbumDoc }) });

    const result = await service.publish(STUDIO_ID, ALBUM_ID);

    expect(result.status).toBe(AlbumStatus.PUBLISHED);
    expect(result.isPublished).toBe(true);
  });

  it('should reject delete on published album', async () => {
    albumModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...mockAlbumDoc, status: AlbumStatus.PUBLISHED }),
    });

    await expect(service.softDelete(STUDIO_ID, ALBUM_ID)).rejects.toThrow(BadRequestException);
  });

  it('should return public album by slug', async () => {
    albumModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockAlbumDoc,
        status: AlbumStatus.PUBLISHED,
        isPublished: true,
      }),
    });

    const result = await service.findPublicBySlug('wedding-album-abc123');
    expect(result.slug).toBe('wedding-album-abc123');
  });

  it('should reject public access for unpublished album', async () => {
    albumModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findPublicBySlug('missing')).rejects.toThrow(NotFoundException);
  });
});
