import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../common/enums';
import { roleHasAnyPermission } from '../common/constants/permissions.constants';
import { PERMISSIONS_KEY } from '../decorators';
import { AuthenticatedUser } from '../common/interfaces';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const role = user.role as Role;

    if (role === Role.SUPER_ADMIN) {
      return true;
    }

    if (!roleHasAnyPermission(role, requiredPermissions)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
