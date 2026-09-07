import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AlbumPackTier } from '../../common/enums';

export type AlbumPackDocument = AlbumPack & Document;

@Schema({ timestamps: true, collection: 'album_packs' })
export class AlbumPack {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, enum: AlbumPackTier, required: true, index: true })
  tier!: AlbumPackTier;

  @Prop({ trim: true })
  description?: string;

  /** Max photo→video mappings allowed on one album created from this pack. */
  @Prop({ type: Number, required: true, min: 1 })
  maxMappings!: number;

  /**
   * Lifetime guest scans allowed **per mapping** (always 1000 in product).
   * Not a marketing lever — trust guarantee for each printed photo.
   */
  @Prop({ type: Number, required: true, min: 1, default: 1000 })
  scanLimit!: number;

  /** How many album credits one purchase/assignment of this pack grants. */
  @Prop({ type: Number, required: true, min: 1, default: 1 })
  albumsIncluded!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPriceInr!: number;

  @Prop({ type: [String], default: [] })
  features!: string[];

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder!: number;
}

export const AlbumPackSchema = SchemaFactory.createForClass(AlbumPack);

AlbumPackSchema.index({ isActive: 1, sortOrder: 1 });
