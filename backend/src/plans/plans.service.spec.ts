import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PlanService } from './plans.service';
import { Plan } from './schemas/plan.schema';
import { PlanCode } from '../common/enums';

describe('PlanService', () => {
  let service: PlanService;

  const mockPlan = {
    _id: { toString: () => 'plan-1' },
    name: 'Starter',
    code: PlanCode.STARTER,
    description: 'Starter plan',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    maxAlbums: 5,
    maxPhotosPerAlbum: 50,
    maxVideosPerAlbum: 20,
    storageLimitGB: 10,
    monthlyScanLimit: 1000,
    maxUsers: 2,
    features: ['Basic analytics'],
    isActive: true,
    save: jest.fn(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const planModel = {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([mockPlan]) }) }),
    findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockPlan) }),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockPlan) }),
    create: jest.fn().mockResolvedValue(mockPlan),
    updateOne: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanService, { provide: getModelToken(Plan.name), useValue: planModel }],
    }).compile();

    service = module.get(PlanService);
  });

  it('should list plans', async () => {
    const plans = await service.findAll();
    expect(plans).toHaveLength(1);
    expect(plans[0].code).toBe(PlanCode.STARTER);
  });

  it('should detect unlimited limits', () => {
    expect(service.isUnlimited(-1)).toBe(true);
    expect(service.isUnlimited(10)).toBe(false);
  });
});
