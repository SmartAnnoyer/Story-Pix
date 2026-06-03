import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';
import { Role } from '../common/enums';
import { TENANT_SCOPED_KEY } from '../decorators';

describe('TenantGuard - Studio isolation', () => {
  let guard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TenantGuard(reflector);
  });

  const createContext = (
    user?: { role: Role; studioId?: string; userId: string },
    params?: { id?: string },
  ): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: user
            ? { ...user, sub: user.userId, email: 'test@test.com' }
            : undefined,
          params,
        }),
      }),
    }) as unknown as ExecutionContext;

  it('should bypass tenant check for super admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === TENANT_SCOPED_KEY) return true;
      return undefined;
    });

    expect(
      guard.canActivate(
        createContext({ role: Role.SUPER_ADMIN, userId: '1' }, { id: 'studio-2' }),
      ),
    ).toBe(true);
  });

  it('should deny studio admin accessing another studio', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === TENANT_SCOPED_KEY) return true;
      return undefined;
    });

    expect(() =>
      guard.canActivate(
        createContext(
          { role: Role.STUDIO_ADMIN, studioId: 'studio-1', userId: '2' },
          { id: 'studio-2' },
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should allow studio admin accessing own studio', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === TENANT_SCOPED_KEY) return true;
      return undefined;
    });

    expect(
      guard.canActivate(
        createContext(
          { role: Role.STUDIO_ADMIN, studioId: 'studio-1', userId: '2' },
          { id: 'studio-1' },
        ),
      ),
    ).toBe(true);
  });
});
