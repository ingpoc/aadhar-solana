import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { CacheService } from '../../services/cache.service';
import { CreateIdentityDto, UpdateIdentityDto } from './identity.dto';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly solana: SolanaService,
    private readonly cache: CacheService,
  ) {}

  async createIdentity(createIdentityDto: CreateIdentityDto) {
    const { publicKey, metadata } = createIdentityDto;

    // Check if identity already exists
    const existingIdentity = await this.db.identity.findUnique({
      where: { solanaPublicKey: publicKey },
      include: { user: true },
    });

    if (existingIdentity) {
      return {
        success: true,
        data: {
          id: existingIdentity.id,
          did: existingIdentity.did,
          solanaPublicKey: existingIdentity.solanaPublicKey,
          status: 'exists',
          message: 'Identity already exists',
        },
      };
    }

    const did = `did:sol:${publicKey}`;
    const metadataUri = metadata ? `ipfs://metadata/${publicKey}` : undefined;

    // Create blockchain account first
    const txSignature = await this.solana.createIdentityAccount(
      publicKey,
      did,
      metadataUri,
      [],
    );

    // Then create database record
    const identity = await this.db.identity.create({
      data: {
        solanaPublicKey: publicKey,
        did,
        metadataUri,
        user: {
          create: {
            email: metadata?.email,
            phone: metadata?.phone,
          },
        },
      },
      include: {
        user: true,
      },
    });

    return {
      success: true,
      data: {
        id: identity.id,
        did: identity.did,
        solanaPublicKey: identity.solanaPublicKey,
        status: 'created',
        transactionSignature: txSignature,
        createdAt: identity.createdAt.toISOString(),
      },
    };
  }

  async getIdentity(id: string) {
    const cached = await this.cache.get(`identity:${id}`);
    if (cached) {
      return { success: true, data: cached };
    }

    const identity = await this.db.identity.findUnique({
      where: { id },
      include: {
        user: true,
        verificationRequests: {
          where: { status: 'completed' },
          orderBy: { completedAt: 'desc' },
        },
        credentials: {
          where: { revoked: false },
        },
      },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const accountData = await this.solana.getIdentityAccount(identity.solanaPublicKey);

    const response = {
      identityId: identity.id,
      did: identity.did,
      publicKey: identity.solanaPublicKey,
      verificationStatus: this.parseVerificationBitmap(identity.verificationBitmap),
      reputationScore: identity.reputationScore,
      stakedAmount: identity.stakedAmount.toString(),
      createdAt: identity.createdAt.toISOString(),
      lastUpdated: identity.updatedAt.toISOString(),
      onChainData: accountData,
    };

    await this.cache.set(`identity:${id}`, response, 3600);

    return { success: true, data: response };
  }

  async updateIdentity(id: string, updateIdentityDto: UpdateIdentityDto) {
    const identity = await this.db.identity.findUnique({ where: { id } });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const updated = await this.db.identity.update({
      where: { id },
      data: {
        metadataUri: updateIdentityDto.metadataUri,
      },
    });

    await this.cache.del(`identity:${id}`);

    return { success: true, data: updated };
  }

  private parseVerificationBitmap(bitmap: bigint) {
    return {
      aadhaar: (Number(bitmap) & (1 << 0)) !== 0 ? 'verified' : 'pending',
      pan: (Number(bitmap) & (1 << 1)) !== 0 ? 'verified' : 'pending',
      education: (Number(bitmap) & (1 << 2)) !== 0 ? 'verified' : 'pending',
    };
  }
}
