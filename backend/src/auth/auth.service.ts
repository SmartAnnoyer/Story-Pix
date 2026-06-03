import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Response } from 'express';
import { UserStatus, DomainEventType } from '../common/enums';
import { LoggerService } from '../shared/services/logger.service';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly eventBus: EventBusService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmailWithSecrets(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (this.usersService.isAccountLocked(user)) {
      throw new ForbiddenException(
        'Account is temporarily locked due to too many failed login attempts. Try again later.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const isPasswordValid = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.usersService.recordFailedLogin(
        user._id.toString(),
        this.configService.get<number>('auth.maxFailedAttempts', 5),
        this.configService.get<number>('auth.lockDurationMinutes', 15),
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.resetFailedLoginAttempts(user._id.toString());
    await this.usersService.updateLastLogin(user._id.toString());

    const tokens = this.tokenService.generateTokenPair(user);
    const refreshTokenHash = await this.usersService.hashToken(tokens.refreshToken);

    await this.usersService.updateRefreshTokenHash(user._id.toString(), refreshTokenHash);
    this.tokenService.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      user: this.usersService.sanitizeUser(user),
      accessToken: tokens.accessToken,
    };
  }

  async refresh(dto: RefreshTokenDto, res: Response, cookieToken?: string) {
    const refreshToken = dto.refreshToken ?? cookieToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: { sub: string };
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const isValidRefresh = await this.usersService.compareToken(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isValidRefresh) {
      await this.usersService.updateRefreshTokenHash(user._id.toString(), null);
      this.logger.warn(`Refresh token reuse detected for user ${user._id.toString()}`);
      throw new UnauthorizedException('Refresh token reuse detected. Please sign in again.');
    }

    const tokens = this.tokenService.generateTokenPair(user);
    const refreshTokenHash = await this.usersService.hashToken(tokens.refreshToken);

    await this.usersService.updateRefreshTokenHash(user._id.toString(), refreshTokenHash);
    this.tokenService.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

  async logout(userId: string, res: Response) {
    await this.usersService.updateRefreshTokenHash(userId, null);
    this.tokenService.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.tokenService.generatePasswordResetToken();
    const tokenHash = createHash('sha256').update(resetToken).digest('hex');
    const expiresMinutes = this.configService.get<number>('auth.passwordResetExpiresMinutes', 60);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.usersService.setPasswordResetToken(user._id.toString(), tokenHash, expiresAt);

    const resetUrl = `${this.configService.get<string>('app.corsOrigin', 'http://localhost:5173')}/reset-password?token=${resetToken}`;

    if (this.configService.get<string>('app.nodeEnv') !== 'production') {
      this.logger.log(`Password reset link for ${user.email}: ${resetUrl}`);
    }

    void this.eventBus.publish({
      eventType: DomainEventType.USER_PASSWORD_RESET,
      userId: user._id.toString(),
      recipientEmail: user.email,
      metadata: {
        firstName: user.firstName,
        resetUrl,
      },
    });

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.usersService.findByPasswordResetToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.usersService.hashPassword(dto.password);
    await this.usersService.updatePassword(user._id.toString(), passwordHash);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const existing = await this.usersService.findById(userId);

    if (!existing) {
      throw new UnauthorizedException('User not found');
    }

    const user = await this.usersService.findByEmailWithSecrets(existing.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentValid = await this.usersService.comparePassword(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await this.usersService.hashPassword(dto.newPassword);
    await this.usersService.updatePassword(user._id.toString(), passwordHash);

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.sanitizeUser(user);
  }
}
