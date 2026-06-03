import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AnalyticsEventType } from '../../common/enums';

export type ScanLogDocument = ScanLog & Document;

@Schema({ collection: 'scan_logs' })
export class ScanLog {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Album', default: null, index: true })
  albumId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'ArTarget', default: null, index: true })
  arTargetId?: Types.ObjectId | null;

  @Prop({ type: String, enum: AnalyticsEventType, required: true, index: true })
  eventType!: AnalyticsEventType;

  @Prop({ type: String, default: null })
  userAgent?: string | null;

  @Prop({ type: String, default: null })
  browser?: string | null;

  @Prop({ type: String, default: null })
  deviceType?: string | null;

  @Prop({ type: String, default: null })
  operatingSystem?: string | null;

  @Prop({ type: String, default: null })
  country?: string | null;

  @Prop({ type: String, default: null })
  city?: string | null;

  @Prop({ type: String, default: null, index: true })
  ipHash?: string | null;

  @Prop({ type: String, default: null, index: true })
  sessionId?: string | null;

  @Prop({ type: String, default: null })
  albumSlug?: string | null;

  @Prop({ type: Number, default: null })
  targetIndex?: number | null;

  @Prop({ type: Object, default: null })
  metadata?: Record<string, unknown> | null;

  @Prop({ type: Date, required: true, index: true })
  timestamp!: Date;
}

export const ScanLogSchema = SchemaFactory.createForClass(ScanLog);

ScanLogSchema.index({ studioId: 1, timestamp: -1 });
ScanLogSchema.index({ studioId: 1, eventType: 1, timestamp: -1 });
ScanLogSchema.index({ albumId: 1, timestamp: -1 });
ScanLogSchema.index({ albumId: 1, eventType: 1, timestamp: -1 });
ScanLogSchema.index({ arTargetId: 1, timestamp: -1 });
ScanLogSchema.index({ timestamp: -1, eventType: 1 });
