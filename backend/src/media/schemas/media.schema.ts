import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MediaStatus, MediaType } from '../../common/enums';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true, collection: 'media' })
export class Media {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Album', required: true, index: true })
  albumId!: Types.ObjectId;

  @Prop({ type: String, enum: MediaType, required: true, index: true })
  mediaType!: MediaType;

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  originalFileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, min: 0 })
  fileSize!: number;

  @Prop({ type: Number, default: null })
  width?: number | null;

  @Prop({ type: Number, default: null })
  height?: number | null;

  @Prop({ type: Number, default: null })
  duration?: number | null;

  @Prop({ required: true })
  r2ObjectKey!: string;

  @Prop({ type: String, default: null })
  publicUrl?: string | null;

  @Prop({ type: String, default: null })
  thumbnailUrl?: string | null;

  @Prop({ type: String, enum: MediaStatus, default: MediaStatus.UPLOADING, index: true })
  status!: MediaStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ type: String, default: null })
  failureReason?: string | null;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.index({ studioId: 1, albumId: 1, deletedAt: 1 });
MediaSchema.index({ albumId: 1, mediaType: 1, status: 1 });
MediaSchema.index({ studioId: 1, status: 1 });
MediaSchema.index({ createdAt: -1 });
