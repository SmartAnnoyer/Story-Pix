import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { MediaService } from '../media/media.service';
import { ArTargetsService } from '../ar-targets/ar-targets.service';
import { SubscriptionLimitGuard } from '../guards/subscription-limit.guard';
import { EventType } from '../common/enums';

describe('AlbumsController', () => {
  let controller: AlbumsController;
  let albumsService: jest.Mocked<AlbumsService>;

  const mockUser = {
    userId: '507f1f77bcf86cd799439012',
    studioId: '507f1f77bcf86cd799439011',
    role: 'studio_admin',
    email: 'admin@test.com',
    sub: '507f1f77bcf86cd799439012',
  };

  beforeEach(async () => {
    albumsService = {
      findAll: jest.fn(),
      findRecent: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      archive: jest.fn(),
      findPublicBySlug: jest.fn(),
    } as unknown as jest.Mocked<AlbumsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumsController],
      providers: [
        { provide: AlbumsService, useValue: albumsService },
        { provide: MediaService, useValue: { findByAlbum: jest.fn() } },
        { provide: ArTargetsService, useValue: { findByAlbum: jest.fn() } },
      ],
    })
      .overrideGuard(SubscriptionLimitGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(AlbumsController);
  });

  it('should list albums for studio user', async () => {
    albumsService.findAll.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
    });

    await controller.findAll(mockUser as never, { page: 1, limit: 20 });
    expect(albumsService.findAll).toHaveBeenCalledWith(mockUser.studioId, { page: 1, limit: 20 });
  });

  it('should reject studio context missing', () => {
    expect(() =>
      controller.findAll({ ...mockUser, studioId: undefined } as never, {}),
    ).toThrow(ForbiddenException);
  });

  it('should create album', async () => {
    albumsService.create.mockResolvedValue({ id: '1' } as never);

    await controller.create(mockUser as never, {
      albumName: 'Test',
      eventType: EventType.WEDDING,
      customerName: 'Jane',
      eventDate: '2026-06-01',
    });

    expect(albumsService.create).toHaveBeenCalledWith(
      mockUser.studioId,
      mockUser.userId,
      expect.objectContaining({ albumName: 'Test' }),
    );
  });

  it('should expose public album by slug', async () => {
    albumsService.findPublicBySlug.mockResolvedValue({ slug: 'test-slug' } as never);
    const result = await controller.findPublic('test-slug');
    expect(albumsService.findPublicBySlug).toHaveBeenCalledWith('test-slug');
    expect(result.slug).toBe('test-slug');
  });
});
