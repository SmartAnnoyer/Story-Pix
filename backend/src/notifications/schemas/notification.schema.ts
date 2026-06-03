import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationChannel, NotificationStatus, NotificationType } from '../../common/enums';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Studio', index: true })
  studioId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true, index: true })
  type!: NotificationType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({ type: String, enum: NotificationChannel, required: true })
  channel!: NotificationChannel;

  @Prop({ type: String, enum: NotificationStatus, required: true, index: true })
  status!: NotificationStatus;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ studioId: 1, userId: 1, status: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
