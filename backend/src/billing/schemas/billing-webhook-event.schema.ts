import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BillingWebhookEventDocument = BillingWebhookEvent & Document;

@Schema({ timestamps: true, collection: 'billing_webhook_events' })
export class BillingWebhookEvent {
  @Prop({ required: true, unique: true, trim: true })
  eventId!: string;

  @Prop({ required: true, trim: true })
  eventType!: string;

  @Prop({ type: String, default: 'razorpay', trim: true })
  provider!: string;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;

  @Prop({ default: false })
  processed!: boolean;
}

export const BillingWebhookEventSchema = SchemaFactory.createForClass(BillingWebhookEvent);
