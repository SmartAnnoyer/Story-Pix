import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BillingAuditLogDocument = BillingAuditLog & Document;

@Schema({ timestamps: true, collection: 'billing_audit_logs' })
export class BillingAuditLog {
  @Prop({ required: true, trim: true, index: true })
  action!: string;

  @Prop({ trim: true, index: true })
  studioId?: string;

  @Prop({ trim: true })
  subscriptionId?: string;

  @Prop({ trim: true })
  paymentId?: string;

  @Prop({ trim: true })
  invoiceId?: string;

  @Prop({ trim: true })
  actorId?: string;

  @Prop({ trim: true })
  actorRole?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ trim: true })
  ipHash?: string;
}

export const BillingAuditLogSchema = SchemaFactory.createForClass(BillingAuditLog);

BillingAuditLogSchema.index({ createdAt: -1 });
