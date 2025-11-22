import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuditService } from '../../services/audit.service';
import {
  InvalidCredentialsException,
  TokenExpiredException,
  RefreshTokenRevokedException,
  UnauthorizedException,
} from '../../common/exceptions/api.exception';

export interface JwtPayload {
  sub: string;
  email?: string;
  did?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  phone?: string;
  did?: string;
  solanaPublicKey?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  // ============== Token Generation ==============

  async generateTokens(user: AuthenticatedUser, deviceInfo?: string, ipAddress?: string): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      did: user.did,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, deviceInfo, ipAddress);

    const accessTokenExpiry = this.configService.get<string>('jwt.accessTokenExpiry') || '15m';
    const expiresIn = this.parseExpiryToSeconds(accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private async createRefreshToken(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiryDays = parseInt(this.configService.get('jwt.refreshTokenExpiry')?.replace('d', '') || '7');
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await this.databaseService.refreshToken.create({
      data: {
        userId,
        token,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    return token;
  }

  // ============== Token Refresh ==============

  async refreshTokens(refreshToken: string, ipAddress?: string): Promise<TokenPair> {
    const storedToken = await this.databaseService.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new InvalidCredentialsException();
    }

    if (storedToken.isRevoked) {
      throw new RefreshTokenRevokedException();
    }

    if (new Date() > storedToken.expiresAt) {
      await this.revokeRefreshToken(refreshToken);
      throw new TokenExpiredException();
    }

    // Get user
    const user = await this.databaseService.user.findUnique({
      where: { id: storedToken.userId },
      include: { identities: true },
    });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Revoke old token and create new pair
    await this.revokeRefreshToken(refreshToken);

    const identity = user.identities[0];
    return this.generateTokens(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        did: identity?.did,
        solanaPublicKey: identity?.solanaPublicKey,
      },
      storedToken.deviceInfo,
      ipAddress,
    );
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.databaseService.refreshToken.update({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.databaseService.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  // ============== Wallet Authentication ==============

  async authenticateWithWallet(
    solanaPublicKey: string,
    signature: string,
    message: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    // Verify the signature
    const isValid = await this.verifyWalletSignature(solanaPublicKey, signature, message);
    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    // Find or create user
    let identity = await this.databaseService.identity.findUnique({
      where: { solanaPublicKey },
      include: { user: true },
    });

    if (!identity) {
      // Create new user and identity
      const user = await this.databaseService.user.create({
        data: {
          identities: {
            create: {
              solanaPublicKey,
              did: `did:aadhaar:${solanaPublicKey.slice(0, 20)}`,
            },
          },
        },
        include: { identities: true },
      });
      identity = user.identities[0] as any;
      identity.user = user;

      this.logger.log(`New user created via wallet: ${solanaPublicKey.slice(0, 8)}...`);
    }

    await this.auditService.logAuthAction(
      'login',
      identity.user.id,
      { method: 'wallet', solanaPublicKey },
      { ip: ipAddress },
    );

    return this.generateTokens(
      {
        id: identity.user.id,
        did: identity.did,
        solanaPublicKey: identity.solanaPublicKey,
      },
      deviceInfo,
      ipAddress,
    );
  }

  private async verifyWalletSignature(
    publicKey: string,
    signature: string,
    message: string,
  ): Promise<boolean> {
    try {
      // Import nacl for Ed25519 verification
      const nacl = await import('tweetnacl');
      const bs58 = await import('bs58');

      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.default.decode(signature);
      const publicKeyBytes = bs58.default.decode(publicKey);

      return nacl.default.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  // ============== API Key Authentication ==============

  async validateApiKey(apiKey: string): Promise<{ userId?: string; permissions: string[] } | null> {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const storedKey = await this.databaseService.apiKey.findUnique({
      where: { keyHash },
    });

    if (!storedKey || !storedKey.isActive) {
      return null;
    }

    if (storedKey.expiresAt && new Date() > storedKey.expiresAt) {
      return null;
    }

    // Update last used
    await this.databaseService.apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: storedKey.userId,
      permissions: storedKey.permissions,
    };
  }

  async createApiKey(
    userId: string,
    name: string,
    permissions: string[] = [],
    expiresInDays?: number,
  ): Promise<{ apiKey: string; keyId: string }> {
    const apiKey = `ak_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const stored = await this.databaseService.apiKey.create({
      data: {
        name,
        keyHash,
        userId,
        permissions,
        expiresAt,
      },
    });

    return {
      apiKey,
      keyId: stored.id,
    };
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    await this.databaseService.apiKey.updateMany({
      where: { id: keyId, userId },
      data: { isActive: false },
    });
  }

  // ============== User Validation ==============

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.databaseService.user.findUnique({
      where: { id: payload.sub },
      include: { identities: true },
    });

    if (!user) return null;

    const identity = user.identities[0];
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      did: identity?.did,
      solanaPublicKey: identity?.solanaPublicKey,
    };
  }

  // ============== Nonce for Wallet Auth ==============

  generateAuthNonce(): { nonce: string; message: string; expiresAt: Date } {
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + 5 * 60 * 1000); // 5 minutes

    const message = `Sign this message to authenticate with AadhaarChain.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    return { nonce, message, expiresAt };
  }

  // ============== Utility ==============

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}
