import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role, UserStatus } from '../../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, enum: Role, required: true })
  role!: Role;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Prop({ type: Types.ObjectId, ref: 'Studio', index: true, default: null })
  studioId?: Types.ObjectId | null;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: Number, default: 0, select: false })
  failedLoginAttempts!: number;

  @Prop({ type: Date, select: false })
  lockedUntil?: Date;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop({ type: Date, select: false })
  passwordResetExpiresAt?: Date;

  /** Cleared when the user changes or resets their password (Super Admin visibility only). */
  @Prop({ select: false })
  temporaryPasswordPlain?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ studioId: 1, role: 1 });
