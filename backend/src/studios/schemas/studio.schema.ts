import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StudioStatus, SubscriptionStatus } from '../../common/enums';

export type StudioDocument = Studio & Document;

@Schema({ timestamps: true, collection: 'studios' })
export class Studio {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  studioCode!: string;

  @Prop({ required: true, trim: true })
  studioName!: string;

  @Prop({ required: true, trim: true })
  ownerName!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  logo?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ type: Types.ObjectId, ref: 'Plan', index: true })
  planId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', index: true })
  activeSubscriptionId?: Types.ObjectId;

  @Prop({ trim: true })
  subscriptionId?: string;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  subscriptionStatus!: SubscriptionStatus;

  @Prop({ type: Number, default: 10 })
  storageLimitGB!: number;

  @Prop({ type: Number, default: 0 })
  storageUsedGB!: number;

  @Prop({ type: Number, default: 1000 })
  monthlyScanLimit!: number;

  @Prop({ type: Number, default: 0 })
  monthlyScanUsage!: number;

  @Prop({ type: String, enum: StudioStatus, default: StudioStatus.TRIAL })
  status!: StudioStatus;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const StudioSchema = SchemaFactory.createForClass(Studio);

StudioSchema.index({ studioCode: 1 }, { unique: true });
StudioSchema.index({ status: 1 });
StudioSchema.index({ studioName: 'text', ownerName: 'text', email: 'text', studioCode: 'text' });
StudioSchema.index({ deletedAt: 1 });
