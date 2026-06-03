import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from '../../common/enums';

export type EmailTemplateDocument = EmailTemplate & Document;

@Schema({ timestamps: true, collection: 'email_templates' })
export class EmailTemplate {
  @Prop({ required: true, trim: true, index: true })
  key!: string;

  @Prop({ type: String, enum: NotificationType, required: true, index: true })
  notificationType!: NotificationType;

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ required: true })
  htmlBody!: string;

  @Prop({ required: true })
  textBody!: string;

  @Prop({ type: [String], default: [] })
  variables!: string[];

  @Prop({ type: Number, required: true, default: 1 })
  version!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);

EmailTemplateSchema.index({ key: 1, version: -1 }, { unique: true });
EmailTemplateSchema.index({ notificationType: 1, isActive: 1 });
