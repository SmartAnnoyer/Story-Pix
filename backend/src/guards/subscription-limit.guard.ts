import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LimitType } from '../common/enums';
import { CHECK_LIMIT_KEY } from '../decorators';
import { AuthenticatedUser } from '../common/interfaces';
import { LimitValidationService } from '../subscriptions/limit-validation.service';

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limitValidationService: LimitValidationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.getAllAndOverride<LimitType>(CHECK_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!limitType) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; body?: { sizeGB?: number } }>();
    const user = request.user;

    if (!user?.studioId) {
      return true;
    }

    switch (limitType) {
      case LimitType.ALBUM:
        await this.limitValidationService.checkAlbumLimit(user.studioId);
        break;
      case LimitType.STORAGE:
        await this.limitValidationService.checkStorageLimit(user.studioId, request.body?.sizeGB ?? 0);
        break;
      case LimitType.SCAN:
        await this.limitValidationService.checkScanLimit(user.studioId);
        break;
      case LimitType.USER:
        await this.limitValidationService.checkUserLimit(user.studioId);
        break;
    }

    return true;
  }
}
