import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus } from '../../common/enums';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true, index: true })
  subscriptionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  planId!: Types.ObjectId;

  @Prop({ trim: true, index: true })
  razorpayOrderId?: string;

  @Prop({ trim: true, index: true })
  razorpayPaymentId?: string;

  @Prop({ trim: true })
  razorpaySubscriptionId?: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, default: 'INR', trim: true })
  currency!: string;

  @Prop({ trim: true })
  paymentMethod?: string;

  @Prop({ type: String, enum: PaymentStatus, required: true, index: true })
  status!: PaymentStatus;

  @Prop({ type: Date, index: true })
  transactionDate?: Date;

  @Prop({ trim: true, unique: true, sparse: true })
  idempotencyKey?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ studioId: 1, status: 1 });
PaymentSchema.index({ subscriptionId: 1, status: 1 });
PaymentSchema.index({ transactionDate: -1 });
