import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../decorators/auth.decorators';
import { BillingWebhookService } from '../services/billing-webhook.service';

@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  constructor(private readonly webhookService: BillingWebhookService) {}

  @Public()
  @Post()
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    return this.webhookService.handleRazorpayWebhook(rawBody, signature);
  }
}
