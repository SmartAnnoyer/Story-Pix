import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LimitValidationService } from './limit-validation.service';
import { SubscriptionService } from './subscription.service';
import { PlanService } from '../plans/plans.service';
import { SubscriptionStatus } from '../common/enums';

describe('LimitValidationService', () => {
  let service: LimitValidationService;

  const mockSubscription = {
    albumCount: 5,
    storageUsedGB: 9,
    scanUsage: 900,
    userCount: 2,
    status: SubscriptionStatus.ACTIVE,
    planId: {
      maxAlbums: 5,
      maxPhotosPerAlbum: 50,
      maxVideosPerAlbum: 20,
      storageLimitGB: 10,
      monthlyScanLimit: 1000,
      maxUsers: 2,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LimitValidationService,
        {
          provide: SubscriptionService,
          useValue: {
            assertSubscriptionActive: jest.fn().mockResolvedValue(mockSubscription),
          },
        },
        {
          provide: PlanService,
          useValue: { isUnlimited: (v: number) => v < 0 },
        },
      ],
    }).compile();

    service = module.get(LimitValidationService);
  });

  it('should allow album creation under limit', async () => {
    mockSubscription.albumCount = 4;
    await expect(service.checkAlbumLimit('studio-1')).resolves.toBeUndefined();
  });

  it('should reject album creation at limit', async () => {
    mockSubscription.albumCount = 5;
    await expect(service.checkAlbumLimit('studio-1')).rejects.toThrow(ForbiddenException);
  });

  it('should reject storage over limit', async () => {
    await expect(service.checkStorageLimit('studio-1', 2)).rejects.toThrow(ForbiddenException);
  });

  it('should reject scan over limit', async () => {
    mockSubscription.scanUsage = 1000;
    await expect(service.checkScanLimit('studio-1')).rejects.toThrow(ForbiddenException);
  });
});
