import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { MediaValidationService } from './media-validation.service';
import { MediaType } from '../common/enums';

describe('MediaValidationService', () => {
  let service: MediaValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaValidationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const map: Record<string, unknown> = {
                'media.maxPhotoSizeMB': 25,
                'media.maxVideoSizeMB': 500,
                'media.allowedPhotoMimeTypes': ['image/jpeg', 'image/png', 'image/webp'],
                'media.allowedVideoMimeTypes': ['video/mp4', 'video/quicktime'],
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MediaValidationService);
  });

  it('should accept valid photo mime type', () => {
    expect(() =>
      service.validateUploadRequest(MediaType.PHOTO, 'image/jpeg', 1024),
    ).not.toThrow();
  });

  it('should reject invalid photo mime type', () => {
    expect(() =>
      service.validateUploadRequest(MediaType.PHOTO, 'image/gif', 1024),
    ).toThrow(BadRequestException);
  });

  it('should reject oversized video', () => {
    expect(() =>
      service.validateUploadRequest(MediaType.VIDEO, 'video/mp4', 600 * 1024 * 1024),
    ).toThrow(BadRequestException);
  });

  it('should convert bytes to GB', () => {
    expect(service.bytesToGB(1024 * 1024 * 1024)).toBe(1);
  });
});
