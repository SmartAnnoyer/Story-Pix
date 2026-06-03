import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AlbumStatus, EventType } from '../../common/enums';

export type AlbumDocument = Album & Document;

@Schema({ timestamps: true, collection: 'albums' })
export class Album {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  albumCode!: string;

  @Prop({ required: true, index: true })
  albumName!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: String, enum: EventType, required: true, index: true })
  eventType!: EventType;

  @Prop({ required: true, index: true })
  customerName!: string;

  @Prop({ type: String, default: null })
  customerPhone?: string | null;

  @Prop({ type: String, default: null })
  customerEmail?: string | null;

  @Prop({ type: Date, required: true, index: true })
  eventDate!: Date;

  @Prop({ type: String, default: null })
  coverImage?: string | null;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: String, enum: AlbumStatus, default: AlbumStatus.DRAFT, index: true })
  status!: AlbumStatus;

  @Prop({ default: false })
  isPublished!: boolean;

  @Prop({ type: Date, default: null })
  publishedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const AlbumSchema = SchemaFactory.createForClass(Album);

AlbumSchema.index({ studioId: 1, deletedAt: 1 });
AlbumSchema.index({ studioId: 1, status: 1 });
AlbumSchema.index({ studioId: 1, eventType: 1 });
AlbumSchema.index({ studioId: 1, eventDate: -1 });
AlbumSchema.index({ studioId: 1, createdAt: -1 });
AlbumSchema.index({ albumName: 'text', customerName: 'text' });
