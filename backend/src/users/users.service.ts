import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Role, UserStatus } from '../common/enums';
import { LoggerService } from '../shared/services/logger.service';
import { User, UserDocument } from './schemas/user.schema';

const BCRYPT_ROUNDS = 12;

export interface CreateStudioAdminInput {
  studioId: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  temporaryPasswordPlain: string;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findByEmailWithSecrets(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +failedLoginAttempts +lockedUntil +refreshTokenHash')
      .exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findByIdWithRefreshToken(id: string) {
    return this.userModel.findById(id).select('+refreshTokenHash').exec();
  }

  async createStudioAdmin(input: CreateStudioAdminInput) {
    return this.userModel.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      temporaryPasswordPlain: input.temporaryPasswordPlain,
      role: Role.STUDIO_ADMIN,
      status: UserStatus.ACTIVE,
      studioId: input.studioId,
    });
  }

  findStudioAdminForStudio(studioId: string) {
    return this.userModel
      .findOne({ studioId, role: Role.STUDIO_ADMIN })
      .select('+temporaryPasswordPlain')
      .exec();
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, BCRYPT_ROUNDS);
  }

  async compareToken(token: string, tokenHash: string): Promise<boolean> {
    return bcrypt.compare(token, tokenHash);
  }

  async updateLastLogin(userId: string) {
    return this.userModel
      .findByIdAndUpdate(userId, {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .exec();
  }

  async recordFailedLogin(userId: string, maxAttempts: number, lockMinutes: number) {
    const user = await this.userModel
      .findById(userId)
      .select('+failedLoginAttempts +lockedUntil')
      .exec();

    if (!user) return;

    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const update: Partial<User> = { failedLoginAttempts: attempts };

    if (attempts >= maxAttempts) {
      update.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
      this.logger.warn(`Account locked for user ${userId} after ${attempts} failed attempts`);
    }

    await this.userModel.findByIdAndUpdate(userId, update).exec();
  }

  async resetFailedLoginAttempts(userId: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { failedLoginAttempts: 0, lockedUntil: null })
      .exec();
  }

  async updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.userModel
      .findByIdAndUpdate(userId, { refreshTokenHash: refreshTokenHash ?? null })
      .exec();
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.userModel
      .findByIdAndUpdate(userId, {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      })
      .exec();
  }

  async findByPasswordResetToken(tokenHash: string) {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash')
      .exec();
  }

  async clearPasswordResetToken(userId: string) {
    return this.userModel
      .findByIdAndUpdate(userId, {
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      })
      .exec();
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.userModel
      .findByIdAndUpdate(userId, {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
        temporaryPasswordPlain: null,
      })
      .exec();
  }

  async resetStudioAdminPassword(studioId: string, passwordHash: string, temporaryPasswordPlain: string) {
    const admin = await this.findStudioAdminForStudio(studioId);

    if (!admin) {
      return null;
    }

    return this.userModel
      .findByIdAndUpdate(admin._id, {
        passwordHash,
        temporaryPasswordPlain,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .select('+temporaryPasswordPlain')
      .exec();
  }

  isAccountLocked(user: UserDocument): boolean {
    return Boolean(user.lockedUntil && user.lockedUntil > new Date());
  }

  sanitizeUser(user: UserDocument) {
    const doc = user as UserDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      studioId: user.studioId?.toString() ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private async seedSuperAdmin() {
    const email = this.configService.get<string>('auth.superAdminEmail')!.toLowerCase();
    const existing = await this.findByEmail(email);

    if (existing) return;

    const password = this.configService.get<string>('auth.superAdminPassword')!;
    const passwordHash = await this.hashPassword(password);

    await this.userModel.create({
      firstName: this.configService.get<string>('auth.superAdminFirstName'),
      lastName: this.configService.get<string>('auth.superAdminLastName'),
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      studioId: null,
    });

    this.logger.warn(`Super Admin seeded with email: ${email}. Change password after first login.`);
  }
}
