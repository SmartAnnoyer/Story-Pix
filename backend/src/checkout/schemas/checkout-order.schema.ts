import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CheckoutOrderKind, CheckoutOrderStatus } from '../../common/enums';

export type CheckoutOrderDocument = CheckoutOrder & Document;

@Schema({ _id: false })
export class CheckoutCartItem {
  @Prop({ type: Types.ObjectId, required: true })
  packId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;
}

const CheckoutCartItemSchema = SchemaFactory.createForClass(CheckoutCartItem);

@Schema({ timestamps: true, collection: 'checkout_orders' })
export class CheckoutOrder {
  @Prop({ type: String, enum: CheckoutOrderKind, required: true, index: true })
  kind!: CheckoutOrderKind;

  @Prop({
    type: String,
    enum: CheckoutOrderStatus,
    default: CheckoutOrderStatus.PENDING,
    index: true,
  })
  status!: CheckoutOrderStatus;

  @Prop({ type: [CheckoutCartItemSchema], default: [] })
  items!: CheckoutCartItem[];

  @Prop({ type: Number, required: true, min: 0 })
  amountInr!: number;

  /** Cart total before coupon. */
  @Prop({ type: Number, default: null, min: 0 })
  subtotalInr?: number | null;

  @Prop({ type: Number, default: 0, min: 0 })
  discountInr?: number;

  @Prop({ type: String, default: null, uppercase: true, trim: true })
  couponCode?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Coupon', default: null })
  couponId?: Types.ObjectId | null;

  @Prop({ type: String, default: 'INR' })
  currency!: string;

  @Prop({ type: String, required: true, index: true })
  razorpayOrderId!: string;

  @Prop({ type: String, default: null })
  razorpayPaymentId?: string | null;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  email?: string | null;

  /** bcrypt hash — only for signup_pack */
  @Prop({ type: String, select: false, default: null })
  passwordHash?: string | null;

  /** Cleared immediately after fulfill — used only to auto-login once. */
  @Prop({ type: String, select: false, default: null })
  passwordPlain?: string | null;

  @Prop({ type: String, default: null })
  studioName?: string | null;

  @Prop({ type: String, default: null })
  ownerName?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Studio', default: null, index: true })
  studioId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  fulfilledAt?: Date | null;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;
}

export const CheckoutOrderSchema = SchemaFactory.createForClass(CheckoutOrder);

CheckoutOrderSchema.index({ razorpayOrderId: 1 }, { unique: true });
CheckoutOrderSchema.index({ status: 1, createdAt: -1 });
