import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { LoggerService } from '../shared/services/logger.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import { UserStatus, Role } from '../common/enums';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tokenService: jest.Mocked<TokenService>;

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as import('express').Response;

  const mockUser = {
    _id: { toString: () => 'user-id-1' },
    email: 'admin@story-pix.app',
    firstName: 'Super',
    lastName: 'Admin',
    passwordHash: 'hashed-password',
    role: Role.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    studioId: null,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    lastLoginAt: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithSecrets: jest.fn(),
            isAccountLocked: jest.fn(),
            comparePassword: jest.fn(),
            recordFailedLogin: jest.fn(),
            resetFailedLoginAttempts: jest.fn(),
            updateLastLogin: jest.fn(),
            hashToken: jest.fn(),
            updateRefreshTokenHash: jest.fn(),
            sanitizeUser: jest.fn(),
            findByIdWithRefreshToken: jest.fn(),
            compareToken: jest.fn(),
            findByEmail: jest.fn(),
            setPasswordResetToken: jest.fn(),
            findByPasswordResetToken: jest.fn(),
            hashPassword: jest.fn(),
            updatePassword: jest.fn(),
            clearPasswordResetToken: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateTokenPair: jest.fn(),
            setRefreshTokenCookie: jest.fn(),
            clearRefreshTokenCookie: jest.fn(),
            verifyRefreshToken: jest.fn(),
            generatePasswordResetToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'auth.maxFailedAttempts': 5,
                'auth.lockDurationMinutes': 15,
                'auth.passwordResetExpiresMinutes': 60,
                'app.corsOrigin': 'http://localhost:5173',
                'app.nodeEnv': 'test',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    tokenService = module.get(TokenService);
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      usersService.findByEmailWithSecrets.mockResolvedValue(mockUser as never);
      usersService.isAccountLocked.mockReturnValue(false);
      usersService.comparePassword.mockResolvedValue(true);
      usersService.hashToken.mockResolvedValue('refresh-hash');
      tokenService.generateTokenPair.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      usersService.sanitizeUser.mockReturnValue({
        id: 'user-id-1',
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        status: mockUser.status,
        studioId: null,
        lastLoginAt: null,
        createdAt: null,
        updatedAt: null,
      });

      const result = await authService.login(
        { email: mockUser.email, password: 'Admin@123456' },
        mockResponse,
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(tokenService.setRefreshTokenCookie).toHaveBeenCalled();
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalled();
    });

    it('should throw when user is not found', async () => {
      usersService.findByEmailWithSecrets.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'missing@test.com', password: 'password' }, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when account is locked', async () => {
      usersService.findByEmailWithSecrets.mockResolvedValue(mockUser as never);
      usersService.isAccountLocked.mockReturnValue(true);

      await expect(
        authService.login({ email: mockUser.email, password: 'password' }, mockResponse),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should increment failed attempts on invalid password', async () => {
      usersService.findByEmailWithSecrets.mockResolvedValue(mockUser as never);
      usersService.isAccountLocked.mockReturnValue(false);
      usersService.comparePassword.mockResolvedValue(false);

      await expect(
        authService.login({ email: mockUser.email, password: 'wrong-password' }, mockResponse),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.recordFailedLogin).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear refresh token and cookie', async () => {
      const result = await authService.logout('user-id-1', mockResponse);

      expect(result.message).toBe('Logged out successfully');
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith('user-id-1', null);
      expect(tokenService.clearRefreshTokenCookie).toHaveBeenCalled();
    });
  });
});
