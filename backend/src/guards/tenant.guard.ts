import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../common/enums';
import { TENANT_SCOPED_KEY } from '../decorators';
import { AuthenticatedUser } from '../common/interfaces';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(TENANT_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isTenantScoped) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: { studioId?: string; id?: string };
      body?: { studioId?: string };
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const requestedStudioId =
      request.params?.studioId ?? request.params?.id ?? request.body?.studioId;

    if (requestedStudioId && user.studioId !== requestedStudioId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    if (!user.studioId) {
      throw new ForbiddenException('Studio context required');
    }

    return true;
  }
}
