import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '../../common/interfaces';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookieName = configService.get<string>(
            'auth.refreshCookieName',
            'storypix_refresh_token',
          );
          return (req?.cookies?.[cookieName] as string | undefined) ?? null;
        },
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      studioId: payload.studioId,
    };
  }
}
