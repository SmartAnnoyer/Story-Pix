import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ArTargetsController } from './ar-targets.controller';
import { ArTargetsService } from './ar-targets.service';

describe('ArTargetsController', () => {
  let controller: ArTargetsController;
  let arTargetsService: jest.Mocked<ArTargetsService>;

  const mockUser = {
    userId: '507f1f77bcf86cd799439012',
    studioId: '507f1f77bcf86cd799439011',
    role: 'studio_admin',
    email: 'admin@test.com',
    sub: '507f1f77bcf86cd799439012',
  };

  beforeEach(async () => {
    arTargetsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      publish: jest.fn(),
      archive: jest.fn(),
      findByAlbum: jest.fn(),
      findActiveByAlbumId: jest.fn(),
    } as unknown as jest.Mocked<ArTargetsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArTargetsController],
      providers: [{ provide: ArTargetsService, useValue: arTargetsService }],
    }).compile();

    controller = module.get(ArTargetsController);
  });

  it('creates mapping', async () => {
    arTargetsService.create.mockResolvedValue({ id: '1' } as never);

    await controller.create(mockUser as never, {
      albumId: '507f1f77bcf86cd799439013',
      photoMediaId: '507f1f77bcf86cd799439014',
      videoMediaId: '507f1f77bcf86cd799439015',
      targetName: 'First Dance',
    });

    expect(arTargetsService.create).toHaveBeenCalled();
  });

  it('rejects missing studio context', () => {
    expect(() => controller.findAll({ ...mockUser, studioId: undefined } as never, {})).toThrow(
      ForbiddenException,
    );
  });
});
