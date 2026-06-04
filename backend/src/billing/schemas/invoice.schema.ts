import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillingCycle, InvoiceStatus } from '../../common/enums';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true })
  subscriptionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  invoiceNumber!: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  taxAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, enum: BillingCycle, required: true })
  billingCycle!: BillingCycle;

  @Prop({ type: Date, required: true })
  issuedDate!: Date;

  @Prop({ type: Date })
  paidDate?: Date;

  @Prop({ type: String, enum: InvoiceStatus, required: true, index: true })
  status!: InvoiceStatus;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ studioId: 1, status: 1 });
InvoiceSchema.index({ subscriptionId: 1 });
InvoiceSchema.index({ issuedDate: -1 });
