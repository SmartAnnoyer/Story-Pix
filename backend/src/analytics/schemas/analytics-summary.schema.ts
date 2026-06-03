import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AnalyticsSummaryPeriod, AnalyticsSummaryScope } from '../../common/enums';

export type AnalyticsSummaryDocument = AnalyticsSummary & Document;

@Schema({ collection: 'analytics_summaries' })
export class AnalyticsSummary {
  @Prop({ type: String, enum: AnalyticsSummaryScope, required: true, index: true })
  scope!: AnalyticsSummaryScope;

  @Prop({ type: Types.ObjectId, ref: 'Studio', default: null, index: true })
  studioId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Album', default: null, index: true })
  albumId?: Types.ObjectId | null;

  @Prop({ type: String, enum: AnalyticsSummaryPeriod, required: true, index: true })
  period!: AnalyticsSummaryPeriod;

  @Prop({ type: Date, required: true, index: true })
  periodStart!: Date;

  @Prop({ type: Number, default: 0 })
  totalViews!: number;

  @Prop({ type: Number, default: 0 })
  uniqueVisitors!: number;

  @Prop({ type: Number, default: 0 })
  totalScans!: number;

  @Prop({ type: Number, default: 0 })
  successfulScans!: number;

  @Prop({ type: Number, default: 0 })
  failedScans!: number;

  @Prop({ type: Number, default: 0 })
  videosPlayed!: number;

  @Prop({ type: Number, default: 0 })
  videosCompleted!: number;

  @Prop({ type: Number, default: 0 })
  albumsCreated!: number;

  @Prop({ type: Number, default: 0 })
  albumsPublished!: number;

  @Prop({ type: Number, default: 0 })
  photosUploaded!: number;

  @Prop({ type: Number, default: 0 })
  videosUploaded!: number;

  @Prop({ type: [{ albumId: String, count: Number }], default: [] })
  topAlbums!: Array<{ albumId: string; count: number }>;

  @Prop({ type: [{ arTargetId: String, count: Number }], default: [] })
  topPhotos!: Array<{ arTargetId: string; count: number }>;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const AnalyticsSummarySchema = SchemaFactory.createForClass(AnalyticsSummary);

AnalyticsSummarySchema.index(
  { scope: 1, studioId: 1, albumId: 1, period: 1, periodStart: 1 },
  { unique: true },
);
AnalyticsSummarySchema.index({ scope: 1, period: 1, periodStart: -1 });
