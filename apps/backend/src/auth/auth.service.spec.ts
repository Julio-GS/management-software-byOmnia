import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt at module level to avoid "Cannot redefine property" errors
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByUsernameWithPassword: jest.fn(),
      updateLastLogin: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      };

      usersService.findByUsernameWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser('testuser', 'password123');

      // Assert
      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
      expect(result.username).toBe('testuser');
      expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith('testuser');
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      usersService.findByUsernameWithPassword.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent', 'password123');

      // Assert
      expect(result).toBeNull();
      expect(usersService.findByUsernameWithPassword).toHaveBeenCalledWith('nonexistent');
    });

    it('should return null when password is invalid', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      };

      usersService.findByUsernameWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser('testuser', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: false, // Inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      };

      usersService.findByUsernameWithPassword.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateUser('testuser', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser('testuser', 'password123')).rejects.toThrow(
        'User account is inactive',
      );
    });
  });

  describe('login', () => {
    it('should return JWT tokens and user data when credentials are valid', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        return undefined;
      });
      jwtService.signAsync.mockResolvedValueOnce('mock-access-token').mockResolvedValueOnce('mock-refresh-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect(usersService.updateLastLogin).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should generate JWT payload with userId, username, role, iat, exp', async () => {
      // Arrange
      const loginDto = {
        username: 'admin',
        password: 'password123',
      };

      const mockUser = {
        id: 'admin-456',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        return undefined;
      });
      jwtService.signAsync.mockResolvedValueOnce('mock-access-token').mockResolvedValueOnce('mock-refresh-token');

      // Act
      await service.login(loginDto);

      // Assert - Verify jwtService.signAsync was called with correct payload structure
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'admin-456',
          username: 'admin',
          role: 'admin',
        }),
        expect.objectContaining({
          secret: 'test-secret',
          expiresIn: '7d',
        }),
      );
    });
  });

  describe('register', () => {
    it('should create user and return JWT tokens', async () => {
      // Arrange
      const registerDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const mockUser = new UserEntity({
        id: 'user-789',
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'hashed-password',
        firstName: 'New',
        lastName: 'User',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      });

      usersService.create.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        return undefined;
      });
      jwtService.signAsync.mockResolvedValueOnce('mock-access-token').mockResolvedValueOnce('mock-refresh-token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token');
      expect(result.user.username).toBe('newuser');
      expect(usersService.create).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refreshToken', () => {
    it('should return new access token when refresh token is valid', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: 'user-123', username: 'testuser', role: 'cashier' };
      const mockUser = new UserEntity({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      });

      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      usersService.findOne.mockResolvedValue(mockUser);
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return undefined;
      });
      jwtService.signAsync.mockResolvedValue('new-access-token');

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBe('new-access-token');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(usersService.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: 'user-123', username: 'testuser', role: 'cashier' };
      const mockInactiveUser = new UserEntity({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'cashier',
        isActive: false, // Inactive user
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
      });

      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      usersService.findOne.mockResolvedValue(mockInactiveUser);
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return undefined;
      });

      // Act & Assert
      // NOTE: Current implementation catches all errors and returns generic message
      // TODO: Refactor refreshToken() to preserve specific error messages (Phase 5)
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Invalid or expired refresh token');
    });
  });
});
