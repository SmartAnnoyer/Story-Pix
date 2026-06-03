import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './schemas/subscription.schema';
import { Studio } from '../studios/schemas/studio.schema';
import { PlanService } from '../plans/plans.service';
import { BILLING_PROVIDER } from '../billing/interfaces/billing-provider.interface';
import { PlanCode, SubscriptionStatus } from '../common/enums';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';

const STUDIO_ID = '507f1f77bcf86cd799439011';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockPlan = {
    _id: { toString: () => 'plan-1' },
    code: PlanCode.STARTER,
    isActive: true,
    storageLimitGB: 10,
    monthlyScanLimit: 1000,
  };

  const subscriptionModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
  };

  const studioModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: STUDIO_ID, email: 'test@test.com', deletedAt: null }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getModelToken(Subscription.name), useValue: subscriptionModel },
        { provide: getModelToken(Studio.name), useValue: studioModel },
        {
          provide: PlanService,
          useValue: {
            findByCode: jest.fn().mockResolvedValue(mockPlan),
            findDocumentById: jest.fn().mockResolvedValue(mockPlan),
            serialize: jest.fn().mockReturnValue({ id: 'plan-1', code: PlanCode.STARTER }),
          },
        },
        {
          provide: BILLING_PROVIDER,
          useValue: {
            createSubscription: jest.fn().mockResolvedValue({ externalBillingId: 'manual_1', status: 'created' }),
            cancelSubscription: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(14) },
        },
        { provide: AnalyticsIngestionService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  it('should create trial subscription', async () => {
    const createdDoc = {
      _id: { toString: () => 'sub-1' },
      studioId: { toString: () => STUDIO_ID },
      planId: mockPlan,
      status: SubscriptionStatus.TRIAL,
      billingCycle: 'monthly',
      startDate: new Date(),
      endDate: new Date(),
      storageUsedGB: 0,
      scanUsage: 0,
      albumCount: 0,
      userCount: 1,
      autoRenew: false,
      externalBillingId: 'manual_1',
      populate: jest.fn().mockResolvedValue(undefined),
    };

    subscriptionModel.create.mockResolvedValue(createdDoc);
    createdDoc.populate.mockResolvedValue(createdDoc);

    jest.spyOn(service, 'syncStudioFromSubscription').mockResolvedValue(undefined);
    jest.spyOn(service, 'serialize').mockReturnValue({
      id: 'sub-1',
      studioId: STUDIO_ID,
      studio: null,
      planId: 'plan-1',
      plan: null,
      startDate: new Date(),
      endDate: new Date(),
      status: SubscriptionStatus.TRIAL,
      billingCycle: 'monthly',
      storageUsedGB: 0,
      scanUsage: 0,
      albumCount: 0,
      userCount: 1,
      autoRenew: false,
      externalBillingId: 'manual_1',
      createdAt: null,
      updatedAt: null,
    } as never);

    const result = await service.createTrialSubscription(STUDIO_ID, 'test@test.com');
    expect(subscriptionModel.create).toHaveBeenCalled();
    expect(result.id).toBe('sub-1');
  });
});
