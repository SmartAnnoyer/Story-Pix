import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudiosService } from './studios.service';
import { Studio } from './schemas/studio.schema';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../shared/services/logger.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import { STORAGE_SERVICE } from '../storage/interfaces/storage.interface';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { UsageService } from '../subscriptions/usage.service';
import { StudioStatus, SubscriptionStatus } from '../common/enums';

describe('StudiosService', () => {
  let service: StudiosService;
  let studioModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    countDocuments: jest.Mock;
    create: jest.Mock;
    aggregate: jest.Mock;
    exists: jest.Mock;
  };
  let usersService: jest.Mocked<UsersService>;

  const mockStudioDoc = {
    _id: { toString: () => 'studio-id-1' },
    studioCode: 'STU-ABC123',
    studioName: 'Sunrise Studio',
    ownerName: 'Jane Doe',
    email: 'studio@example.com',
    phone: '1234567890',
    address: '123 Main St',
    logo: null,
    website: 'https://example.com',
    subscriptionId: 'trial_STU-ABC123',
    subscriptionStatus: SubscriptionStatus.TRIAL,
    storageLimitGB: 10,
    storageUsedGB: 2,
    monthlyScanLimit: 1000,
    monthlyScanUsage: 50,
    status: StudioStatus.TRIAL,
    save: jest.fn().mockResolvedValue(true),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    studioModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockStudioDoc]),
            }),
          }),
        }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockStudioDoc) }),
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockStudioDoc) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
      create: jest.fn().mockResolvedValue(mockStudioDoc),
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ totalStorageUsedGB: 2, totalMonthlyScans: 50 }]),
      }),
      exists: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      createStudioAdmin: jest.fn().mockResolvedValue({}),
      findStudioAdminForStudio: jest.fn().mockResolvedValue({
        email: 'admin@new.com',
        temporaryPasswordPlain: 'Aa1!tempPass12',
      }),
    } as unknown as jest.Mocked<UsersService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudiosService,
        { provide: getModelToken(Studio.name), useValue: studioModel },
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const map: Record<string, unknown> = {
                'studio.trialStorageLimitGB': 10,
                'studio.trialMonthlyScanLimit': 1000,
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: { setContext: jest.fn(), log: jest.fn(), warn: jest.fn() },
        },
        {
          provide: STORAGE_SERVICE,
          useValue: {
            getPresignedUploadUrl: jest.fn(),
            deleteObject: jest.fn(),
            getPublicUrl: jest.fn(),
          },
        },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
        {
          provide: SubscriptionService,
          useValue: {
            createTrialSubscription: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: UsageService,
          useValue: {
            getUsageSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(StudiosService);
  });

  it('should return paginated studios', async () => {
    const result = await service.findAll({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.items[0].studioCode).toBe('STU-ABC123');
  });

  it('should throw when studio not found', async () => {
    studioModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('should create studio with admin account', async () => {
    studioModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    studioModel.create.mockResolvedValue(mockStudioDoc);
    studioModel.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockStudioDoc) });

    const result = await service.create({
      studioName: 'New Studio',
      ownerName: 'Owner',
      email: 'studio@new.com',
      adminEmail: 'admin@new.com',
      adminFirstName: 'Admin',
      adminLastName: 'User',
    });

    expect(result.studio.studioName).toBe('Sunrise Studio');
    expect(result.admin.temporaryPassword).toBeDefined();
    expect(usersService.createStudioAdmin).toHaveBeenCalled();
  });

  it('should reject duplicate admin email', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'existing' } as never);

    await expect(
      service.create({
        studioName: 'New Studio',
        ownerName: 'Owner',
        email: 'studio@new.com',
        adminEmail: 'admin@new.com',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should return dashboard stats', async () => {
    studioModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(5) });

    const stats = await service.getDashboardStats();

    expect(stats.totalStudios).toBeDefined();
    expect(stats.subscriptionSummary).toBeDefined();
  });
});
