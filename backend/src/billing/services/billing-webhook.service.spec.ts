import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BillingWebhookService } from './billing-webhook.service';
import { BillingWebhookEvent } from '../schemas/billing-webhook-event.schema';
import { BILLING_PROVIDER } from '../interfaces/billing-provider.interface';
import { BillingService } from './billing.service';
import { BillingAuditService } from './billing-audit.service';
import { LoggerService } from '../../shared/services/logger.service';

describe('BillingWebhookService', () => {
  let service: BillingWebhookService;

  const webhookEventModel = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  };

  const billingProvider = {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };

  const billingService = {
    processPaidWebhook: jest.fn(),
    markPaymentFailed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    billingProvider.verifyWebhookSignature.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingWebhookService,
        { provide: getModelToken(BillingWebhookEvent.name), useValue: webhookEventModel },
        { provide: BILLING_PROVIDER, useValue: billingProvider },
        { provide: BillingService, useValue: billingService },
        { provide: BillingAuditService, useValue: { log: jest.fn() } },
        { provide: LoggerService, useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    service = module.get(BillingWebhookService);
  });

  it('rejects invalid webhook signatures', async () => {
    billingProvider.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleRazorpayWebhook('{}', 'bad-signature'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processes payment.captured webhook events', async () => {
    const payload = JSON.stringify({
      id: 'evt_1',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_1',
            order_id: 'order_1',
            method: 'card',
          },
        },
      },
    });

    await service.handleRazorpayWebhook(payload, 'valid-signature');

    expect(billingService.processPaidWebhook).toHaveBeenCalledWith(
      'order_1',
      'pay_1',
      'card',
      'evt_1',
    );
  });
});
