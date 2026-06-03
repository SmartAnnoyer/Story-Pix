import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { ArTargetsService } from './ar-targets.service';
import { AlbumsService } from '../albums/albums.service';
import { MediaService } from '../media/media.service';
import { ArTargetStatus, MediaStatus, MediaType } from '../common/enums';

describe('ArTargetsService', () => {
  let service: ArTargetsService;
  let arTargetModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    countDocuments: jest.Mock;
  };

  const studioId = '507f1f77bcf86cd799439011';
  const albumId = '507f1f77bcf86cd799439013';
  const photoId = '507f1f77bcf86cd799439014';
  const videoId = '507f1f77bcf86cd799439015';

  const albumsService = {
    findById: jest.fn(),
  };

  const mediaService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    albumsService.findById.mockReset();
    mediaService.findById.mockReset();

    arTargetModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArTargetsService,
        { provide: getModelToken('ArTarget'), useValue: arTargetModel },
        { provide: AlbumsService, useValue: albumsService },
        { provide: MediaService, useValue: mediaService },
      ],
    }).compile();

    service = module.get(ArTargetsService);
  });

  it('creates mapping when photo and video are unique', async () => {
    albumsService.findById.mockResolvedValue({ id: albumId });
    mediaService.findById.mockImplementation((_studio: string, id: string) => {
      if (id === photoId) {
        return Promise.resolve({
          id: photoId,
          albumId,
          mediaType: MediaType.PHOTO,
          status: MediaStatus.READY,
          publicUrl: 'https://example.com/photo.jpg',
          thumbnailUrl: null,
          originalFileName: 'photo.jpg',
        });
      }
      return Promise.resolve({
        id: videoId,
        albumId,
        mediaType: MediaType.VIDEO,
        status: MediaStatus.READY,
        publicUrl: 'https://example.com/video.mp4',
        thumbnailUrl: null,
        originalFileName: 'video.mp4',
        duration: 10,
      });
    });
    arTargetModel.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439016',
      studioId,
      albumId,
      photoMediaId: photoId,
      videoMediaId: videoId,
      targetName: 'Ceremony',
      targetIndex: null,
      status: ArTargetStatus.DRAFT,
      mindFileUrl: null,
      save: jest.fn(),
    });

    const result = await service.create(studioId, {
      albumId,
      photoMediaId: photoId,
      videoMediaId: videoId,
      targetName: 'Ceremony',
    });

    expect(result.targetName).toBe('Ceremony');
    expect(arTargetModel.create).toHaveBeenCalled();
  });

  it('rejects duplicate photo mapping', async () => {
    albumsService.findById.mockResolvedValue({ id: albumId });
    mediaService.findById.mockImplementation((_studio: string, id: string) =>
      Promise.resolve({
        id,
        albumId,
        mediaType: id === photoId ? MediaType.PHOTO : MediaType.VIDEO,
        status: MediaStatus.READY,
      }),
    );
    arTargetModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'existing' }) });

    await expect(
      service.create(studioId, {
        albumId,
        photoMediaId: photoId,
        videoMediaId: videoId,
        targetName: 'Duplicate',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
