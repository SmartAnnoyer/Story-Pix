import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
  @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({ type: Number, required: true, min: 1, max: 100 })
  discountPercent!: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  usedCount!: number;

  /** null = unlimited */
  @Prop({ type: Number, default: null, min: 1 })
  maxUses?: number | null;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({ type: String, default: null })
  note?: string | null;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
