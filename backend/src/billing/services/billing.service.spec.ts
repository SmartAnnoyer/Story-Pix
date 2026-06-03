import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { Payment } from '../schemas/payment.schema';
import { Studio } from '../../studios/schemas/studio.schema';
import { Subscription } from '../../subscriptions/schemas/subscription.schema';
import { BILLING_PROVIDER } from '../interfaces/billing-provider.interface';
import { PlanService } from '../../plans/plans.service';
import { SubscriptionService } from '../../subscriptions/subscription.service';
import { UsageService } from '../../subscriptions/usage.service';
import { PaymentService } from './payment.service';
import { InvoiceService } from './invoice.service';
import { BillingAuditService } from './billing-audit.service';
import { BillingNotificationService } from './billing-notification.service';
import { EventBusService } from '../../notifications/services/event-bus.service';
import { BillingCycle, PaymentStatus, PlanCode, SubscriptionStatus } from '../../common/enums';

const STUDIO_ID = '507f1f77bcf86cd799439011';
const SUB_ID = '507f1f77bcf86cd799439012';
const PLAN_ID = '507f1f77bcf86cd799439013';

describe('BillingService', () => {
  let service: BillingService;

  const mockPlan = {
    _id: { toString: () => PLAN_ID },
    code: PlanCode.STARTER,
    isActive: true,
    monthlyPrice: 999,
    yearlyPrice: 9999,
    name: 'Starter',
  };

  const mockSubscription = {
    _id: { toString: () => SUB_ID },
    studioId: { toString: () => STUDIO_ID },
    planId: { toString: () => PLAN_ID },
    status: SubscriptionStatus.TRIAL,
    billingCycle: BillingCycle.MONTHLY,
    save: jest.fn().mockResolvedValue(undefined),
  };

  const paymentModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const billingProvider = {
    createOrder: jest.fn().mockResolvedValue({
      orderId: 'order_test',
      amount: 99900,
      currency: 'INR',
      keyId: 'test_key',
    }),
    verifyPaymentSignature: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(Studio.name), useValue: {} },
        { provide: getModelToken(Subscription.name), useValue: { findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubscription) }) } },
        { provide: BILLING_PROVIDER, useValue: billingProvider },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('INR') },
        },
        {
          provide: PlanService,
          useValue: {
            findDocumentById: jest.fn().mockResolvedValue(mockPlan),
            serialize: jest.fn().mockReturnValue({ id: PLAN_ID }),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            getActiveByStudioId: jest.fn().mockResolvedValue(mockSubscription),
            syncStudioFromSubscription: jest.fn(),
            upgrade: jest.fn(),
            cancel: jest.fn(),
          },
        },
        { provide: UsageService, useValue: { getUsageSummary: jest.fn() } },
        {
          provide: PaymentService,
          useValue: {
            findByOrderId: jest.fn(),
            serialize: jest.fn().mockReturnValue({ id: 'pay-1', status: PaymentStatus.PAID }),
          },
        },
        {
          provide: InvoiceService,
          useValue: {
            createFromPayment: jest.fn().mockResolvedValue({ _id: { toString: () => 'inv-1' } }),
            serialize: jest.fn().mockReturnValue({ id: 'inv-1' }),
          },
        },
        { provide: BillingAuditService, useValue: { log: jest.fn() } },
        { provide: BillingNotificationService, useValue: { emit: jest.fn() } },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  it('creates a payment order', async () => {
    paymentModel.create.mockResolvedValue({ _id: { toString: () => 'pay-1' } });

    const result = await service.createOrder(STUDIO_ID, {
      planId: PLAN_ID,
      billingCycle: BillingCycle.MONTHLY,
    });

    expect(result.orderId).toBe('order_test');
    expect(billingProvider.createOrder).toHaveBeenCalled();
    expect(paymentModel.create).toHaveBeenCalled();
  });
});
