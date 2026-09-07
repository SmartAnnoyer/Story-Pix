import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudioPackCreditDocument = StudioPackCredit & Document;

/** Batch of album credits granted to a studio from one pack assignment. */
@Schema({ timestamps: true, collection: 'studio_pack_credits' })
export class StudioPackCredit {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AlbumPack', required: true, index: true })
  packId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  packCode!: string;

  @Prop({ required: true, trim: true })
  packName!: string;

  @Prop({ type: Number, required: true, min: 1 })
  maxMappings!: number;

  /** Scans allowed per mapping (product constant: 1000). */
  @Prop({ type: Number, required: true, min: 1 })
  scanLimit!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalCredits!: number;

  @Prop({ type: Number, required: true, min: 0 })
  remainingCredits!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPriceInr!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalPriceInr!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy!: Types.ObjectId;

  @Prop({ type: String, default: null })
  notes?: string | null;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const StudioPackCreditSchema = SchemaFactory.createForClass(StudioPackCredit);

StudioPackCreditSchema.index({ studioId: 1, remainingCredits: 1, isActive: 1 });
