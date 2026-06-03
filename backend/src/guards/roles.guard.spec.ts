import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../common/enums';
import { ROLES_KEY } from '../decorators';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createContext = (user?: { role: Role; userId: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: user ? { ...user, sub: user.userId, email: 'test@test.com' } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('should allow super admin for any required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return [Role.STUDIO_ADMIN];
      return undefined;
    });

    expect(
      guard.canActivate(createContext({ role: Role.SUPER_ADMIN, userId: '1' })),
    ).toBe(true);
  });

  it('should deny when role does not match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return [Role.SUPER_ADMIN];
      return undefined;
    });

    expect(() =>
      guard.canActivate(createContext({ role: Role.STUDIO_ADMIN, userId: '2' })),
    ).toThrow(ForbiddenException);
  });
});
