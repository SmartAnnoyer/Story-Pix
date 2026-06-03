import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { Notification } from '../schemas/notification.schema';
import { NotificationChannel, NotificationStatus, NotificationType } from '../../common/enums';

describe('NotificationService', () => {
  let service: NotificationService;

  const notificationModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getModelToken(Notification.name), useValue: notificationModel },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('creates pending in-app notifications', async () => {
    notificationModel.create.mockResolvedValue({
      _id: { toString: () => 'n1' },
      type: NotificationType.WELCOME,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    });

    await service.create({
      studioId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      type: NotificationType.WELCOME,
      title: 'Welcome',
      message: 'Hello',
      channel: NotificationChannel.IN_APP,
    });

    expect(notificationModel.create).toHaveBeenCalled();
  });
});
