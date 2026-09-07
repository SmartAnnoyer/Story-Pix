import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PackLedgerAction } from '../../common/enums';

export type PackLedgerEntryDocument = PackLedgerEntry & Document;

@Schema({ timestamps: true, collection: 'pack_ledger' })
export class PackLedgerEntry {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AlbumPack', required: true })
  packId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'StudioPackCredit', default: null })
  creditId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Album', default: null })
  albumId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  packCode!: string;

  @Prop({ required: true, trim: true })
  packName!: string;

  @Prop({ type: String, enum: PackLedgerAction, required: true, index: true })
  action!: PackLedgerAction;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number, default: 0 })
  unitPriceInr!: number;

  @Prop({ type: Number, default: 0 })
  totalPriceInr!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  performedBy?: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  notes?: string | null;
}

export const PackLedgerEntrySchema = SchemaFactory.createForClass(PackLedgerEntry);

PackLedgerEntrySchema.index({ studioId: 1, createdAt: -1 });
PackLedgerEntrySchema.index({ createdAt: -1 });
