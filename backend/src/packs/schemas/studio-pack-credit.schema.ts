import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudioPackCreditDocument = StudioPackCredit & Document;

/** Batch of mapping slots granted to a studio from one pack assignment/purchase. */
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

  /**
   * Pack “size” label (e.g. 10 for Mini). Slot math uses totalCredits as
   * mapping slots: maxMappings × albumsIncluded × quantity at grant time.
   */
  @Prop({ type: Number, required: true, min: 1 })
  maxMappings!: number;

  /** Scans allowed per mapping (product constant: 1000). */
  @Prop({ type: Number, required: true, min: 1 })
  scanLimit!: number;

  /** Total photo-mapping slots granted by this credit row. */
  @Prop({ type: Number, required: true, min: 0 })
  totalCredits!: number;

  /**
   * Legacy field — kept for admin UI. Live remaining capacity is computed as
   * sum(totalCredits) − studio active mappings.
   */
  @Prop({ type: Number, required: true, min: 0 })
  remainingCredits!: number;

  /**
   * `album` = legacy album-slot credits (pre pooled mappings).
   * `mapping` = totalCredits / remainingCredits are photo-mapping slots.
   */
  @Prop({ type: String, enum: ['album', 'mapping'], default: 'mapping' })
  creditUnit!: 'album' | 'mapping';

  @Prop({ type: Number, required: true, min: 0 })
  unitPriceInr!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalPriceInr!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedBy?: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  notes?: string | null;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const StudioPackCreditSchema = SchemaFactory.createForClass(StudioPackCredit);

StudioPackCreditSchema.index({ studioId: 1, remainingCredits: 1, isActive: 1 });
