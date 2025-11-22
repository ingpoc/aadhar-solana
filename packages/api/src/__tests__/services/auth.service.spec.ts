/**
 * AuthService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload, AuthenticatedUser } from '../../modules/auth/auth.service';
import { DatabaseService } from '../../services/database.service';
import { AuditService } from '../../services/audit.service';
import { prismaMock, mockUser, mockIdentity } from '../mocks';
import { createUserFixture, createIdentityFixture } from '../fixtures';
import {
  InvalidCredentialsException,
  TokenExpiredException,
  RefreshTokenRevokedException,
} from '../../common/exceptions/api.exception';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let databaseService: DatabaseService;
  let auditService: AuditService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
    verify: jest.fn().mockReturnValue({ sub: 'test-user-id' }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'jwt.accessTokenExpiry': '15m',
        'jwt.refreshTokenExpiry': '7d',
      };
      return config[key];
    }),
  };

  const mockAuditService = {
    logAuthAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DatabaseService, useValue: prismaMock },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    const mockAuthUser: AuthenticatedUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      did: 'did:aadhaar:test123',
      solanaPublicKey: 'TestPublicKey123',
    };

    it('should generate access and refresh tokens', async () => {
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'refresh-token-id',
        userId: mockAuthUser.id,
        token: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        ipAddress: null,
        createdAt: new Date(),
      });

      const result = await service.generateTokens(mockAuthUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockAuthUser.id,
        email: mockAuthUser.email,
        did: mockAuthUser.did,
        type: 'access',
      });
    });

    it('should include device info when provided', async () => {
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'refresh-token-id',
        userId: mockAuthUser.id,
        token: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        revokedAt: null,
        deviceInfo: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      });

      const result = await service.generateTokens(
        mockAuthUser,
        'Mozilla/5.0',
        '127.0.0.1'
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceInfo: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
        }),
      });
    });
  });

  describe('refreshTokens', () => {
    const validRefreshToken = 'valid-refresh-token';
    const userId = 'test-user-id';

    it('should refresh tokens successfully', async () => {
      const storedToken = {
        id: 'token-id',
        userId,
        token: validRefreshToken,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        isRevoked: false,
        revokedAt: null,
        deviceInfo: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      };

      const user = {
        ...mockUser,
        id: userId,
        identities: [mockIdentity],
      };

      prismaMock.refreshToken.findUnique.mockResolvedValue(storedToken);
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.refreshToken.update.mockResolvedValue({ ...storedToken, isRevoked: true });
      prismaMock.refreshToken.create.mockResolvedValue({
        ...storedToken,
        token: 'new-refresh-token',
      });

      const result = await service.refreshTokens(validRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prismaMock.refreshToken.update).toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsException for non-existent token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        InvalidCredentialsException
      );
    });

    it('should throw RefreshTokenRevokedException for revoked token', async () => {
      const revokedToken = {
        id: 'token-id',
        userId,
        token: validRefreshToken,
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: true,
        revokedAt: new Date(),
        deviceInfo: null,
        ipAddress: null,
        createdAt: new Date(),
      };

      prismaMock.refreshToken.findUnique.mockResolvedValue(revokedToken);

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        RefreshTokenRevokedException
      );
    });

    it('should throw TokenExpiredException for expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId,
        token: validRefreshToken,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        ipAddress: null,
        createdAt: new Date(),
      };

      prismaMock.refreshToken.findUnique.mockResolvedValue(expiredToken);
      prismaMock.refreshToken.update.mockResolvedValue({ ...expiredToken, isRevoked: true });

      await expect(service.refreshTokens(validRefreshToken)).rejects.toThrow(
        TokenExpiredException
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', async () => {
      const token = 'token-to-revoke';
      prismaMock.refreshToken.update.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        token,
        isRevoked: true,
        revokedAt: new Date(),
        expiresAt: new Date(),
        deviceInfo: null,
        ipAddress: null,
        createdAt: new Date(),
      });

      await service.revokeRefreshToken(token);

      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
        where: { token },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 'test-user-id';
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.revokeAllUserTokens(userId);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('validateApiKey', () => {
    it('should return permissions for valid API key', async () => {
      const apiKey = 'ak_valid_test_key';
      const storedKey = {
        id: 'key-id',
        name: 'Test Key',
        keyHash: expect.any(String),
        userId: 'user-id',
        permissions: ['read:identity', 'write:identity'],
        isActive: true,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      };

      prismaMock.apiKey.findUnique.mockResolvedValue(storedKey);
      prismaMock.apiKey.update.mockResolvedValue({ ...storedKey, lastUsedAt: new Date() });

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual({
        userId: 'user-id',
        permissions: ['read:identity', 'write:identity'],
      });
    });

    it('should return null for inactive API key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        name: 'Inactive Key',
        keyHash: 'hash',
        userId: 'user-id',
        permissions: [],
        isActive: false,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      });

      const result = await service.validateApiKey('ak_inactive_key');

      expect(result).toBeNull();
    });

    it('should return null for expired API key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'key-id',
        name: 'Expired Key',
        keyHash: 'hash',
        userId: 'user-id',
        permissions: [],
        isActive: true,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        lastUsedAt: null,
        createdAt: new Date(),
      });

      const result = await service.validateApiKey('ak_expired_key');

      expect(result).toBeNull();
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const userId = 'user-id';
      const name = 'My API Key';
      const permissions = ['read:identity'];

      prismaMock.apiKey.create.mockResolvedValue({
        id: 'new-key-id',
        name,
        keyHash: 'generated-hash',
        userId,
        permissions,
        isActive: true,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createApiKey(userId, name, permissions);

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('keyId', 'new-key-id');
      expect(result.apiKey).toMatch(/^ak_/);
    });

    it('should create API key with expiration', async () => {
      const userId = 'user-id';
      const name = 'Expiring Key';
      const permissions: string[] = [];
      const expiresInDays = 30;

      prismaMock.apiKey.create.mockResolvedValue({
        id: 'expiring-key-id',
        name,
        keyHash: 'hash',
        userId,
        permissions,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastUsedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createApiKey(userId, name, permissions, expiresInDays);

      expect(prismaMock.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('validateUser', () => {
    it('should return authenticated user for valid payload', async () => {
      const payload: JwtPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        type: 'access',
      };

      const user = {
        ...mockUser,
        id: payload.sub,
        identities: [mockIdentity],
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser(payload);

      expect(result).toEqual({
        id: payload.sub,
        email: user.email,
        phone: user.phone,
        did: mockIdentity.did,
        solanaPublicKey: mockIdentity.solanaPublicKey,
      });
    });

    it('should return null for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser({ sub: 'non-existent', type: 'access' });

      expect(result).toBeNull();
    });
  });

  describe('generateAuthNonce', () => {
    it('should generate a valid nonce with message', () => {
      const result = service.generateAuthNonce();

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(result.nonce).toHaveLength(64); // 32 bytes hex
      expect(result.message).toContain('AadhaarChain');
      expect(result.message).toContain(result.nonce);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
