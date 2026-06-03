import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillingCycle, SubscriptionStatus } from '../../common/enums';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true, index: true })
  planId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: String, enum: SubscriptionStatus, required: true })
  status!: SubscriptionStatus;

  @Prop({ type: String, enum: BillingCycle, required: true })
  billingCycle!: BillingCycle;

  @Prop({ type: Number, default: 0 })
  storageUsedGB!: number;

  @Prop({ type: Number, default: 0 })
  scanUsage!: number;

  @Prop({ type: Number, default: 0 })
  albumCount!: number;

  @Prop({ type: Number, default: 1 })
  userCount!: number;

  @Prop({ default: true })
  autoRenew!: boolean;

  @Prop({ trim: true })
  externalBillingId?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ studioId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1 });
