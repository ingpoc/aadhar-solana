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
    const { publicKey, did, metadataUri, recoveryKeys } = createIdentityDto;

    const identity = await this.db.identity.create({
      data: {
        solanaPublicKey: publicKey,
        did,
        metadataUri,
        user: {
          create: {
            email: createIdentityDto.email,
            phone: createIdentityDto.phone,
          },
        },
      },
      include: {
        user: true,
      },
    });

    const txSignature = await this.solana.createIdentityAccount(
      publicKey,
      did,
      metadataUri,
      recoveryKeys || [],
    );

    return {
      success: true,
      data: {
        identityId: identity.id,
        did: identity.did,
        status: 'pending',
        transactionSignature: txSignature,
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
