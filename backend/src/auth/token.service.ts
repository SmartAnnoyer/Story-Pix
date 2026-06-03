import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response, CookieOptions } from 'express';
import { randomBytes } from 'crypto';
import { Role } from '../common/enums';
import { JwtPayload } from '../common/interfaces';
import { UserDocument } from '../users/schemas/user.schema';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateTokenPair(user: UserDocument): TokenPair {
    const payload = this.buildPayload(user);

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.accessExpiresIn') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.refreshExpiresIn') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    return { accessToken, refreshToken };
  }

  verifyRefreshToken(refreshToken: string): JwtPayload {
    return this.jwtService.verify(refreshToken, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
    });
  }

  generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(
      this.configService.get<string>('auth.refreshCookieName', 'storypix_refresh_token'),
      refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  clearRefreshTokenCookie(res: Response) {
    res.clearCookie(
      this.configService.get<string>('auth.refreshCookieName', 'storypix_refresh_token'),
      this.getRefreshCookieOptions(),
    );
  }

  getRefreshCookieOptions(): CookieOptions {
    const maxAgeMs = this.parseDurationToMs(
      this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
    );

    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('auth.cookieSecure', false),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('auth.cookieSameSite', 'lax'),
      maxAge: maxAgeMs,
      path: '/',
    };
  }

  private buildPayload(user: UserDocument): JwtPayload {
    return {
      sub: user._id.toString(),
      email: user.email,
      role: user.role as Role,
      studioId: user.studioId?.toString(),
    };
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
