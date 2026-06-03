import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inject } from '@nestjs/common';
import {
  BILLING_PROVIDER,
  IBillingProvider,
} from '../interfaces/billing-provider.interface';
import {
  BillingWebhookEvent,
  BillingWebhookEventDocument,
} from '../schemas/billing-webhook-event.schema';
import { BillingService } from './billing.service';
import { BillingAuditService } from './billing-audit.service';
import { LoggerService } from '../../shared/services/logger.service';

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
        status?: string;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

@Injectable()
export class BillingWebhookService {
  constructor(
    @InjectModel(BillingWebhookEvent.name)
    private readonly webhookEventModel: Model<BillingWebhookEventDocument>,
    @Inject(BILLING_PROVIDER) private readonly billingProvider: IBillingProvider,
    private readonly billingService: BillingService,
    private readonly auditService: BillingAuditService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(BillingWebhookService.name);
  }

  async handleRazorpayWebhook(rawBody: string, signature: string | undefined) {
    if (!signature || !this.billingProvider.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload & { id?: string };
    const eventId = payload.id ?? `${payload.event}_${Date.now()}`;
    const eventType = payload.event ?? 'unknown';

    const existing = await this.webhookEventModel.findOne({ eventId }).exec();
    if (existing?.processed) {
      return { received: true, duplicate: true };
    }

    await this.webhookEventModel.findOneAndUpdate(
      { eventId },
      {
        eventId,
        eventType,
        provider: 'razorpay',
        payload: payload as unknown as Record<string, unknown>,
        processed: false,
      },
      { upsert: true, new: true },
    );

    try {
      await this.dispatchEvent(eventType, payload, eventId);
      await this.webhookEventModel.updateOne({ eventId }, { processed: true }).exec();
    } catch (error) {
      this.logger.error(`Webhook processing failed for ${eventType}: ${String(error)}`);
      throw error;
    }

    await this.auditService.log({
      action: 'webhook.received',
      metadata: { eventType, eventId, provider: 'razorpay' },
    });

    return { received: true, duplicate: false };
  }

  private async dispatchEvent(
    eventType: string,
    payload: RazorpayWebhookPayload,
    eventId: string,
  ) {
    switch (eventType) {
      case 'payment.captured': {
        const entity = payload.payload?.payment?.entity;
        if (!entity?.order_id || !entity.id) return;
        await this.billingService.processPaidWebhook(
          entity.order_id,
          entity.id,
          entity.method,
          eventId,
        );
        break;
      }
      case 'payment.failed': {
        const entity = payload.payload?.payment?.entity;
        if (!entity?.order_id) return;
        await this.billingService.markPaymentFailed(entity.order_id, entity.method);
        break;
      }
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.cancelled':
        this.logger.log(`Razorpay subscription event received: ${eventType}`);
        break;
      default:
        this.logger.log(`Unhandled Razorpay webhook event: ${eventType}`);
    }
  }
}
