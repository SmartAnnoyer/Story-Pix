import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Role } from '../common/enums';
import { PERMISSIONS_KEY } from '../decorators';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createContext = (user?: { role: Role; userId: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: user ? { ...user, sub: user.userId, email: 'test@test.com' } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow when no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('should allow super admin regardless of permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return ['platform:studios:write'];
      return undefined;
    });

    expect(
      guard.canActivate(createContext({ role: Role.SUPER_ADMIN, userId: '1' })),
    ).toBe(true);
  });

  it('should allow studio admin with matching permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return ['studio:read'];
      return undefined;
    });

    expect(
      guard.canActivate(createContext({ role: Role.STUDIO_ADMIN, userId: '2' })),
    ).toBe(true);
  });

  it('should deny studio admin without permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return ['platform:studios:write'];
      return undefined;
    });

    expect(() =>
      guard.canActivate(createContext({ role: Role.STUDIO_ADMIN, userId: '2' })),
    ).toThrow(ForbiddenException);
  });
});
