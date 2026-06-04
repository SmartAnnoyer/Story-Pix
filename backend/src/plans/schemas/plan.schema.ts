import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PlanCode } from '../../common/enums';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true, collection: 'plans' })
export class Plan {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, enum: PlanCode, required: true, unique: true, lowercase: true })
  code!: PlanCode;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number, required: true, min: 0 })
  monthlyPrice!: number;

  @Prop({ type: Number, required: true, min: 0 })
  yearlyPrice!: number;

  @Prop({ type: Number, required: true })
  maxAlbums!: number;

  @Prop({ type: Number, required: true })
  maxPhotosPerAlbum!: number;

  @Prop({ type: Number, required: true })
  maxVideosPerAlbum!: number;

  @Prop({ type: Number, required: true })
  storageLimitGB!: number;

  @Prop({ type: Number, required: true })
  monthlyScanLimit!: number;

  @Prop({ type: Number, required: true })
  maxUsers!: number;

  @Prop({ type: [String], default: [] })
  features!: string[];

  @Prop({ default: true })
  isActive!: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.index({ isActive: 1 });
