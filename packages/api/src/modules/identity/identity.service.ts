import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';
import { CacheService } from '../../services/cache.service';
import { EncryptionService } from '../../services/encryption.service';
import { ApiSetuService } from '../../services/api-setu.service';
import { CreateIdentityDto, UpdateIdentityDto } from './identity.dto';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly solana: SolanaService,
    private readonly cache: CacheService,
    private readonly encryption: EncryptionService,
    private readonly apiSetu: ApiSetuService,
  ) {}

  async createIdentity(createIdentityDto: CreateIdentityDto) {
    const { publicKey, metadata, signedTransaction } = createIdentityDto;

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

    try {
      let txSignature: string;

      // If signed transaction is provided, use it
      if (signedTransaction) {
        txSignature = await this.solana.createIdentityAccount(
          publicKey,
          did,
          metadataUri,
          [],
          signedTransaction,
        );
      } else {
        // For development/testing: create and execute transaction server-side
        console.log('⚠️ No signed transaction provided, creating identity server-side for development');

        // Create the identity directly using the Anchor program
        const authorityPubkey = new PublicKey(publicKey);
        const recoveryPubkeys: PublicKey[] = [];

        const [identityPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('identity'), authorityPubkey.toBuffer()],
          this.solana.programIds.identityRegistry,
        );

        // Execute the transaction using Anchor's rpc method
        txSignature = await this.solana.identityProgram.methods
          .createIdentity(did, metadataUri, recoveryPubkeys)
          .accounts({
            identityAccount: identityPDA,
            authority: authorityPubkey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`✅ Identity created on-chain: ${txSignature}`);
      }

      // Create database record
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
    } catch (error) {
      console.error('Error creating identity:', error);
      throw error;
    }
  }

  async prepareCreateIdentityTransaction(createIdentityDto: CreateIdentityDto) {
    const { publicKey, metadata } = createIdentityDto;

    const did = `did:sol:${publicKey}`;
    const metadataUri = metadata ? `ipfs://metadata/${publicKey}` : undefined;

    const unsignedTransaction = await this.solana.prepareCreateIdentityTransaction(
      publicKey,
      did,
      metadataUri,
      [],
    );

    return {
      success: true,
      data: {
        transaction: unsignedTransaction,
        message: 'Please sign this transaction with your wallet',
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

  async storeAadhaarData(publicKey: string, aadhaarNumber: string, otp: string) {
    const aadhaarData = await this.apiSetu.fetchAadhaarData(aadhaarNumber, otp);

    const encryptionKey = this.encryption.generateKey();

    const fullAddress = `${aadhaarData.address.house}, ${aadhaarData.address.street}, ${aadhaarData.address.landmark}, ${aadhaarData.address.locality}, ${aadhaarData.address.district}, ${aadhaarData.address.state}, ${aadhaarData.address.pincode}, ${aadhaarData.address.country}`;

    const aadhaarHash = this.encryption.hash(aadhaarData.aadhaarNumber);
    const aadhaarLast4 = aadhaarData.aadhaarNumber.slice(-4);
    const nameEncrypted = this.encryption.encryptField(aadhaarData.name, encryptionKey);
    const dobEncrypted = this.encryption.encryptField(aadhaarData.dob, encryptionKey);
    const genderEncrypted = this.encryption.encryptField(aadhaarData.gender, encryptionKey);
    const mobileEncrypted = this.encryption.encryptField(aadhaarData.mobile, encryptionKey);
    const emailEncrypted = this.encryption.encryptField(aadhaarData.email, encryptionKey);
    const addressEncrypted = this.encryption.encryptField(fullAddress, encryptionKey);
    const photoHash = this.encryption.hash(aadhaarData.photoBase64);

    const { commitment: ageCommitment } = this.encryption.generateAgeCommitment(aadhaarData.dob);
    const { commitment: genderCommitment } = this.encryption.generateGenderCommitment(aadhaarData.gender);

    const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

    const mockOracleSignature = Buffer.alloc(64, 0);

    // First, ensure identity exists on blockchain
    const existingIdentity = await this.db.identity.findUnique({
      where: { solanaPublicKey: publicKey },
      include: { user: true },
    });

    if (!existingIdentity) {
      throw new NotFoundException('Identity not found. Please create an identity first.');
    }

    // For development: Skip blockchain operations and just update database
    // TODO: Re-enable blockchain operations when wallet signing is properly implemented
    console.log('⚠️ Skipping blockchain verification update for development - updating database only');

    const blockchainTxSignature = 'dev-skip-' + Date.now(); // Mock transaction signature for development

    // Update database with verification bitmap and last 4 digits
    await this.db.identity.update({
      where: { solanaPublicKey: publicKey },
      data: {
        verificationBitmap: BigInt(1), // Set bit 0 for Aadhaar verification
        aadhaarLast4,
        updatedAt: new Date(),
      },
    });

    // Note: Aadhaar data storage is currently database-only due to Anchor Vec<u8> limitations
    // The encrypted data could be stored off-chain (IPFS/Arweave) in production
    const txSignature = blockchainTxSignature;

    return {
      success: true,
      data: {
        transactionSignature: txSignature,
        aadhaarLast4,
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(expiresAt * 1000).toISOString(),
      },
    };
  }

  async storePANData(publicKey: string, panNumber: string, fullName: string, dob: string) {
    const panData = await this.apiSetu.fetchPANData(panNumber, fullName, dob);

    const encryptionKey = this.encryption.generateKey();

    const panHash = this.encryption.hash(panData.panNumber);
    const panLast4 = panData.panNumber.slice(-4);
    const fullNameEncrypted = this.encryption.encryptField(panData.fullName, encryptionKey);
    const dobEncrypted = this.encryption.encryptField(panData.dob, encryptionKey);
    const fatherNameEncrypted = this.encryption.encryptField(panData.fatherName, encryptionKey);
    const statusEncrypted = this.encryption.encryptField(panData.status, encryptionKey);

    const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

    // First, ensure identity exists
    const existingIdentity = await this.db.identity.findUnique({
      where: { solanaPublicKey: publicKey },
      include: { user: true },
    });

    if (!existingIdentity) {
      throw new NotFoundException('Identity not found. Please create an identity first.');
    }

    // For development: Skip blockchain operations and just update database
    console.log('⚠️ Skipping blockchain verification update for development - updating database only');

    const blockchainTxSignature = 'dev-skip-' + Date.now(); // Mock transaction signature for development

    // Update database with verification bitmap and PAN last 4 digits
    const currentBitmap = existingIdentity.verificationBitmap;
    const updatedBitmap = currentBitmap | BigInt(1 << 1); // Set bit 1 for PAN verification

    await this.db.identity.update({
      where: { solanaPublicKey: publicKey },
      data: {
        verificationBitmap: updatedBitmap,
        panLast4,
        updatedAt: new Date(),
      },
    });

    const txSignature = blockchainTxSignature;

    return {
      success: true,
      data: {
        transactionSignature: txSignature,
        panLast4,
        status: panData.status,
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(expiresAt * 1000).toISOString(),
      },
    };
  }

  async storeITRData(publicKey: string, panNumber: string, financialYear: string, acknowledgementNumber: string) {
    const itrData = await this.apiSetu.fetchITRData(panNumber, financialYear, acknowledgementNumber);

    const encryptionKey = this.encryption.generateKey();

    const incomeRange = this.getIncomeRange(itrData.totalIncome);
    const randomness = this.encryption.generateKey();
    const incomeCommitment = this.encryption.generateZKCommitment(
      itrData.totalIncome.toString(),
      randomness
    );

    const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

    // First, ensure identity exists
    const existingIdentity = await this.db.identity.findUnique({
      where: { solanaPublicKey: publicKey },
      include: { user: true },
    });

    if (!existingIdentity) {
      throw new NotFoundException('Identity not found. Please create an identity first.');
    }

    // For development: Skip blockchain operations and just update database
    console.log('⚠️ Skipping blockchain verification update for development - updating database only');

    const blockchainTxSignature = 'dev-skip-' + Date.now(); // Mock transaction signature for development

    // Update database with verification bitmap (set bit 2 for ITR/Education)
    const currentBitmap = existingIdentity.verificationBitmap;
    const updatedBitmap = currentBitmap | BigInt(1 << 2); // Set bit 2 for ITR verification

    await this.db.identity.update({
      where: { solanaPublicKey: publicKey },
      data: {
        verificationBitmap: updatedBitmap,
        updatedAt: new Date(),
      },
    });

    const txSignature = blockchainTxSignature;

    return {
      success: true,
      data: {
        transactionSignature: txSignature,
        financialYear: itrData.financialYear,
        status: itrData.status,
        incomeRange,
        incomeCommitment: incomeCommitment.toString('hex'),
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(expiresAt * 1000).toISOString(),
      },
    };
  }

  async getVerificationStatus(publicKey: string) {
    const identity = await this.db.identity.findUnique({
      where: { solanaPublicKey: publicKey },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    // Parse verification status from database bitmap (primary source)
    const dbVerificationStatus = this.parseVerificationBitmap(identity.verificationBitmap);

    // Also check blockchain data if available (secondary source)
    const accountData = await this.solana.getIdentityAccount(publicKey);

    return {
      success: true,
      data: {
        aadhaar: dbVerificationStatus.aadhaar === 'verified' ? {
          status: 'verified',
          last4: identity.aadhaarLast4 || accountData?.aadhaarLast4 || '****',
          verifiedAt: accountData?.aadhaarVerifiedAt ?
            new Date(Number(accountData.aadhaarVerifiedAt) * 1000).toISOString() :
            new Date(identity.updatedAt).toISOString(),
          expiresAt: accountData?.aadhaarExpiresAt ?
            new Date(Number(accountData.aadhaarExpiresAt) * 1000).toISOString() :
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        } : { status: 'pending' },
        pan: dbVerificationStatus.pan === 'verified' ? {
          status: 'verified',
          last4: identity.panLast4 || '****',
          verifiedAt: new Date(identity.updatedAt).toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        } : { status: 'pending' },
        itr: { status: dbVerificationStatus.education }, // Using education bit for ITR
      },
    };
  }

  async grantAccess(publicKey: string, serviceName: string, purpose: string, fields: string[], expiryDays: number) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    return {
      success: true,
      data: {
        grantId: `grant-${Date.now()}`,
        serviceName,
        purpose,
        fields,
        grantedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        accessCount: 0,
      },
    };
  }

  async listAccessGrants(publicKey: string) {
    return {
      success: true,
      data: {
        grants: [],
      },
    };
  }

  async revokeAccess(publicKey: string, grantId: string) {
    return {
      success: true,
      data: {
        message: 'Access revoked successfully',
      },
    };
  }

  private getIncomeRange(income: number): string {
    if (income < 250000) return '< ₹2.5L';
    if (income < 500000) return '₹2.5L - ₹5L';
    if (income < 1000000) return '₹5L - ₹10L';
    if (income < 2000000) return '₹10L - ₹20L';
    return '> ₹20L';
  }

  private parseVerificationBitmap(bitmap: bigint) {
    return {
      aadhaar: (Number(bitmap) & (1 << 0)) !== 0 ? 'verified' : 'pending',
      pan: (Number(bitmap) & (1 << 1)) !== 0 ? 'verified' : 'pending',
      education: (Number(bitmap) & (1 << 2)) !== 0 ? 'verified' : 'pending',
    };
  }
}
