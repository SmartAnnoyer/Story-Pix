import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { Payment } from '../schemas/payment.schema';
import { PaymentStatus } from '../../common/enums';

describe('PaymentService', () => {
  let service: PaymentService;

  const paymentModel = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getModelToken(Payment.name), useValue: paymentModel },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  it('serializes payment documents', () => {
    const serialized = service.serialize({
      _id: { toString: () => 'pay-1' },
      studioId: { toString: () => 'studio-1' },
      subscriptionId: { toString: () => 'sub-1' },
      planId: { toString: () => 'plan-1' },
      amount: 999,
      currency: 'INR',
      status: PaymentStatus.PAID,
    } as never);

    expect(serialized.id).toBe('pay-1');
    expect(serialized.status).toBe(PaymentStatus.PAID);
  });
});
