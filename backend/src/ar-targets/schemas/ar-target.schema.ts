import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ArTargetStatus } from '../../common/enums';

export type ArTargetDocument = ArTarget & Document;

@Schema({ timestamps: true, collection: 'ar_targets' })
export class ArTarget {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Album', required: true, index: true })
  albumId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Media', required: true })
  photoMediaId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Media', required: true })
  videoMediaId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  targetName!: string;

  @Prop({ type: Number, default: null })
  targetIndex?: number | null;

  @Prop({ type: String, enum: ArTargetStatus, default: ArTargetStatus.DRAFT, index: true })
  status!: ArTargetStatus;

  @Prop({ type: String, default: null })
  mindFileUrl?: string | null;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const ArTargetSchema = SchemaFactory.createForClass(ArTarget);

ArTargetSchema.index({ albumId: 1, status: 1, deletedAt: 1 });
ArTargetSchema.index({ studioId: 1, status: 1 });
ArTargetSchema.index({ albumId: 1, photoMediaId: 1, deletedAt: 1 });
ArTargetSchema.index({ albumId: 1, videoMediaId: 1, deletedAt: 1 });
ArTargetSchema.index({ albumId: 1, targetIndex: 1 });
