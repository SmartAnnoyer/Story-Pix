import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  const createMockContext = (isPublic = false): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow public routes without JWT validation', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext(true);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should delegate to passport for protected routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      return undefined;
    });

    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    const context = createMockContext(false);
    guard.canActivate(context);

    expect(superCanActivate).toHaveBeenCalledWith(context);
  });
});
