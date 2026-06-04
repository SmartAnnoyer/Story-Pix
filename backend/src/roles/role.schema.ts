import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../common/enums';

export type RoleDocument = RoleDefinition & Document;

@Schema({ timestamps: true, collection: 'roles' })
export class RoleDefinition {
  @Prop({ type: String, enum: Role, required: true, unique: true })
  name!: Role;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ default: true })
  isActive!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(RoleDefinition);
