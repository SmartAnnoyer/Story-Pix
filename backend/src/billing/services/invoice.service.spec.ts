import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InvoiceService } from './invoice.service';
import { Invoice } from '../schemas/invoice.schema';
import { BillingCycle, InvoiceStatus } from '../../common/enums';

describe('InvoiceService', () => {
  let service: InvoiceService;

  const invoiceModel = {
    create: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getModelToken(Invoice.name), useValue: invoiceModel },
      ],
    }).compile();

    service = module.get(InvoiceService);
  });

  it('generates invoice numbers with monthly prefix', async () => {
    const payment = {
      _id: { toString: () => 'pay-1' },
      studioId: 'studio-1',
      subscriptionId: 'sub-1',
      amount: 999,
    };

    invoiceModel.create.mockImplementation(async (data: Record<string, unknown>) => data);

    const invoice = await service.createFromPayment(
      payment as never,
      { name: 'Starter', _id: { toString: () => 'plan-1' } } as never,
      { _id: { toString: () => 'sub-1' } } as never,
      BillingCycle.MONTHLY,
    );

    expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{5}$/);
    expect(invoice.status).toBe(InvoiceStatus.PAID);
    expect(invoice.taxAmount).toBe(0);
  });
});
