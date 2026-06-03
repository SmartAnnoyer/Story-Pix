import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { SubscriptionLimitGuard } from '../guards/subscription-limit.guard';
import { MediaType } from '../common/enums';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: jest.Mocked<MediaService>;

  const mockUser = {
    userId: '507f1f77bcf86cd799439012',
    studioId: '507f1f77bcf86cd799439011',
    role: 'studio_admin',
    email: 'admin@test.com',
    sub: '507f1f77bcf86cd799439012',
  };

  beforeEach(async () => {
    mediaService = {
      initiateUpload: jest.fn(),
      confirmUpload: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
      retryUpload: jest.fn(),
      cancelUpload: jest.fn(),
      findByAlbum: jest.fn(),
    } as unknown as jest.Mocked<MediaService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mediaService }],
    })
      .overrideGuard(SubscriptionLimitGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(MediaController);
  });

  it('should initiate upload', async () => {
    mediaService.initiateUpload.mockResolvedValue({ media: { id: '1' }, upload: {} } as never);

    await controller.initiateUpload(mockUser as never, {
      albumId: '507f1f77bcf86cd799439013',
      mediaType: MediaType.PHOTO,
      originalFileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    });

    expect(mediaService.initiateUpload).toHaveBeenCalled();
  });

  it('should reject missing studio context', () => {
    expect(() =>
      controller.findAll({ ...mockUser, studioId: undefined } as never, {}),
    ).toThrow(ForbiddenException);
  });
});
