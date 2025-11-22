import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import * as bs58 from 'bs58';
import {
  SolanaTransactionFailedException,
  SolanaAccountNotFoundException,
} from '../common/exceptions/api.exception';

// Program account structures
export interface IdentityAccount {
  authority: PublicKey;
  did: string;
  verificationBitmap: BN;
  reputationScore: BN;
  stakedAmount: BN;
  metadataUri: string;
  recoveryKeys: PublicKey[];
  createdAt: BN;
  lastUpdated: BN;
  bump: number;
}

export interface StakeAccount {
  owner: PublicKey;
  identity: PublicKey;
  stakedAmount: BN;
  lockedUntil: BN;
  pendingRewards: BN;
  lastClaimTime: BN;
  unstakeRequested: boolean;
  unstakeRequestTime: BN;
  bump: number;
}

export interface CredentialAccount {
  credentialId: number[];
  schema: PublicKey;
  holder: PublicKey;
  issuer: PublicKey;
  claimsHash: number[];
  status: number;
  issuedAt: BN;
  expiresAt: BN;
  revokedAt: BN;
  revocationReason: string | null;
  metadataUri: string;
  bump: number;
}

export const VerificationTypes = {
  AADHAAR: 0,
  PAN: 1,
  VOTER_ID: 2,
  DRIVING_LICENSE: 3,
  PASSPORT: 4,
  BANK_ACCOUNT: 5,
  ADDRESS: 6,
  EDUCATION: 7,
  EMPLOYMENT: 8,
} as const;

@Injectable()
export class SolanaService implements OnModuleInit {
  private readonly logger = new Logger(SolanaService.name);
  private connection: Connection;
  private oracleKeypair: Keypair | null = null;
  private commitment: Commitment;

  private programIds: {
    identityRegistry: PublicKey;
    verificationOracle: PublicKey;
    credentialManager: PublicKey;
    reputationEngine: PublicKey;
    stakingManager: PublicKey;
  };

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('solana.rpcUrl') || 'https://api.devnet.solana.com';
    this.commitment = (this.configService.get<string>('solana.commitment') || 'confirmed') as Commitment;
    this.connection = new Connection(rpcUrl, this.commitment);

    const programs = this.configService.get('solana.programs') || {};
    this.programIds = {
      identityRegistry: new PublicKey(programs.identityRegistry || '8GFqPTjNGmxSb5d5RFaKqaTVwFENvdZfBHEXPNYnpump'),
      verificationOracle: new PublicKey(programs.verificationOracle || '4p85NmxNmAYm7HnKVvJSoSMz8CqBBLSTRvxcJNbfpump'),
      credentialManager: new PublicKey(programs.credentialManager || 'FoZKx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhS'),
      reputationEngine: new PublicKey(programs.reputationEngine || 'CpXfT4v2z1x8qQPnxhYa7Lm3KjNdEwRsYtUvWxYzAbCd'),
      stakingManager: new PublicKey(programs.stakingManager || 'StKEaNzPqbgJSTRVm5KxQm7CzNkPrWRFfBuYnXmjpump'),
    };
  }

  async onModuleInit() {
    const oraclePrivateKey = this.configService.get<string>('solana.oracle.privateKey');
    if (oraclePrivateKey) {
      try {
        const secretKey = bs58.decode(oraclePrivateKey);
        this.oracleKeypair = Keypair.fromSecretKey(secretKey);
        this.logger.log(`Oracle wallet loaded: ${this.oracleKeypair.publicKey.toString()}`);
      } catch (error) {
        this.logger.warn('Failed to load oracle keypair');
      }
    }

    this.logger.log(`Solana service initialized - RPC: ${this.connection.rpcEndpoint}`);
  }

  // ============== PDA Derivation ==============

  deriveIdentityPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('identity'), authority.toBuffer()],
      this.programIds.identityRegistry,
    );
  }

  deriveStakePDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), owner.toBuffer()],
      this.programIds.stakingManager,
    );
  }

  deriveStakingPoolPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('staking_pool')],
      this.programIds.stakingManager,
    );
  }

  deriveCredentialPDA(credentialId: Buffer): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('credential'), credentialId],
      this.programIds.credentialManager,
    );
  }

  // ============== Identity Operations ==============

  async getIdentityAccount(publicKey: string): Promise<IdentityAccount | null> {
    try {
      const authority = new PublicKey(publicKey);
      const [identityPDA] = this.deriveIdentityPDA(authority);
      const accountInfo = await this.connection.getAccountInfo(identityPDA);

      if (!accountInfo) return null;
      return this.deserializeIdentityAccount(accountInfo.data);
    } catch (error) {
      this.logger.error(`Error getting identity: ${error.message}`);
      return null;
    }
  }

  async buildCreateIdentityTransaction(
    authority: PublicKey,
    did: string,
    metadataUri: string,
    recoveryKeys: PublicKey[] = [],
  ): Promise<{ transaction: Transaction; identityPDA: PublicKey }> {
    const [identityPDA] = this.deriveIdentityPDA(authority);

    // Anchor instruction discriminator for create_identity
    const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
    const didBytes = Buffer.from(did);
    const metadataBytes = Buffer.from(metadataUri);

    // Build instruction data
    const data = Buffer.alloc(
      8 + 4 + didBytes.length + 4 + metadataBytes.length + 4 + recoveryKeys.length * 32
    );
    let offset = 0;

    discriminator.copy(data, offset); offset += 8;
    data.writeUInt32LE(didBytes.length, offset); offset += 4;
    didBytes.copy(data, offset); offset += didBytes.length;
    data.writeUInt32LE(metadataBytes.length, offset); offset += 4;
    metadataBytes.copy(data, offset); offset += metadataBytes.length;
    data.writeUInt32LE(recoveryKeys.length, offset); offset += 4;
    for (const key of recoveryKeys) {
      key.toBuffer().copy(data, offset); offset += 32;
    }

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: identityPDA, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programIds.identityRegistry,
      data,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = authority;
    transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

    return { transaction, identityPDA };
  }

  async createIdentityAccount(
    authority: string,
    did: string,
    metadataUri: string,
    recoveryKeys: string[],
  ): Promise<string> {
    const authorityPubkey = new PublicKey(authority);
    const recoveryPubkeys = recoveryKeys.map(k => new PublicKey(k));

    const { transaction, identityPDA } = await this.buildCreateIdentityTransaction(
      authorityPubkey,
      did,
      metadataUri,
      recoveryPubkeys,
    );

    this.logger.log(`Identity PDA: ${identityPDA.toString()}`);

    // Return serialized transaction for client signing
    return transaction.serialize({ requireAllSignatures: false }).toString('base64');
  }

  // ============== Staking Operations ==============

  async getStakeAccount(owner: string): Promise<StakeAccount | null> {
    try {
      const ownerPubkey = new PublicKey(owner);
      const [stakePDA] = this.deriveStakePDA(ownerPubkey);
      const accountInfo = await this.connection.getAccountInfo(stakePDA);

      if (!accountInfo) return null;
      return this.deserializeStakeAccount(accountInfo.data);
    } catch (error) {
      this.logger.error(`Error getting stake: ${error.message}`);
      return null;
    }
  }

  async buildStakeTransaction(
    owner: PublicKey,
    amount: BN,
    lockPeriod: BN,
  ): Promise<{ transaction: Transaction; stakePDA: PublicKey }> {
    const [stakePDA] = this.deriveStakePDA(owner);
    const [identityPDA] = this.deriveIdentityPDA(owner);
    const [poolPDA] = this.deriveStakingPoolPDA();

    const discriminator = Buffer.from([206, 176, 202, 18, 200, 209, 179, 108]);
    const data = Buffer.alloc(24);
    discriminator.copy(data, 0);
    amount.toArrayLike(Buffer, 'le', 8).copy(data, 8);
    lockPeriod.toArrayLike(Buffer, 'le', 8).copy(data, 16);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: stakePDA, isSigner: false, isWritable: true },
        { pubkey: identityPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programIds.stakingManager,
      data,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = owner;
    transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

    return { transaction, stakePDA };
  }

  async buildUnstakeTransaction(owner: PublicKey): Promise<{ transaction: Transaction }> {
    const [stakePDA] = this.deriveStakePDA(owner);
    const [poolPDA] = this.deriveStakingPoolPDA();

    const discriminator = Buffer.from([90, 95, 107, 42, 205, 124, 50, 225]);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolPDA, isSigner: false, isWritable: false },
        { pubkey: stakePDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: this.programIds.stakingManager,
      data: discriminator,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = owner;
    transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

    return { transaction };
  }

  // ============== Verification Operations ==============

  async updateVerificationStatus(
    publicKey: string,
    verificationType: number,
    verified: boolean,
  ): Promise<string> {
    if (!this.oracleKeypair) {
      throw new Error('Oracle keypair not configured');
    }

    const authority = new PublicKey(publicKey);
    const [identityPDA] = this.deriveIdentityPDA(authority);
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      this.programIds.identityRegistry,
    );

    const discriminator = Buffer.from([102, 214, 55, 71, 251, 113, 156, 100]);
    const data = Buffer.alloc(10);
    discriminator.copy(data, 0);
    data.writeUInt8(verificationType, 8);
    data.writeUInt8(verified ? 1 : 0, 9);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: identityPDA, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: false },
        { pubkey: this.oracleKeypair.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programIds.identityRegistry,
      data,
    });

    const transaction = new Transaction().add(instruction);

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.oracleKeypair],
        { commitment: this.commitment },
      );
      return signature;
    } catch (error) {
      throw new SolanaTransactionFailedException(undefined, error.message);
    }
  }

  // ============== Credential Operations ==============

  async issueCredential(
    identityId: string,
    credentialType: string,
    claims: any,
  ): Promise<string> {
    const credentialId = Buffer.alloc(32);
    const timestamp = Date.now();
    Buffer.from(credentialType.slice(0, 16)).copy(credentialId, 0);
    credentialId.writeBigUInt64LE(BigInt(timestamp), 16);

    const claimsHash = Buffer.alloc(32);
    const claimsStr = JSON.stringify(claims);
    for (let i = 0; i < Math.min(claimsStr.length, 32); i++) {
      claimsHash[i] = claimsStr.charCodeAt(i);
    }

    this.logger.log(`Credential prepared: ${credentialId.toString('hex')} for ${identityId}`);

    // Return credential ID - actual issuance requires issuer signature
    return credentialId.toString('hex');
  }

  async getCredential(credentialId: string): Promise<CredentialAccount | null> {
    try {
      const credentialIdBuffer = Buffer.from(credentialId, 'hex');
      const [credentialPDA] = this.deriveCredentialPDA(credentialIdBuffer);
      const accountInfo = await this.connection.getAccountInfo(credentialPDA);

      if (!accountInfo) return null;
      return this.deserializeCredentialAccount(accountInfo.data);
    } catch (error) {
      this.logger.error(`Error getting credential: ${error.message}`);
      return null;
    }
  }

  // ============== Utility Methods ==============

  async getBalance(publicKey: string): Promise<number> {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      this.logger.error(`Error getting balance: ${error.message}`);
      return 0;
    }
  }

  async sendTransaction(transaction: Transaction, signers: Keypair[]): Promise<string> {
    try {
      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        signers,
        { commitment: this.commitment },
      );
    } catch (error) {
      throw new SolanaTransactionFailedException(undefined, error.message);
    }
  }

  async airdropSol(publicKey: string, amount: number = 1): Promise<string> {
    const pubkey = new PublicKey(publicKey);
    const signature = await this.connection.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  isVerified(bitmap: BN, verificationType: keyof typeof VerificationTypes): boolean {
    const position = VerificationTypes[verificationType];
    return bitmap.and(new BN(1).shln(position)).gt(new BN(0));
  }

  getVerifiedTypes(bitmap: BN): string[] {
    const verified: string[] = [];
    for (const [type, position] of Object.entries(VerificationTypes)) {
      if (bitmap.and(new BN(1).shln(position as number)).gt(new BN(0))) {
        verified.push(type);
      }
    }
    return verified;
  }

  getProgramIds() {
    return Object.fromEntries(
      Object.entries(this.programIds).map(([k, v]) => [k, v.toString()])
    );
  }

  // ============== Deserialization ==============

  private deserializeIdentityAccount(data: Buffer): IdentityAccount {
    let offset = 8;

    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const didLen = data.readUInt32LE(offset);
    offset += 4;
    const did = data.slice(offset, offset + didLen).toString('utf8');
    offset += didLen;

    const verificationBitmap = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;

    const reputationScore = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;

    const stakedAmount = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;

    const metadataUriLen = data.readUInt32LE(offset);
    offset += 4;
    const metadataUri = data.slice(offset, offset + metadataUriLen).toString('utf8');
    offset += metadataUriLen;

    const recoveryKeysLen = data.readUInt32LE(offset);
    offset += 4;
    const recoveryKeys: PublicKey[] = [];
    for (let i = 0; i < recoveryKeysLen; i++) {
      recoveryKeys.push(new PublicKey(data.slice(offset, offset + 32)));
      offset += 32;
    }

    const createdAt = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;

    const lastUpdated = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;

    const bump = data.readUInt8(offset);

    return {
      authority, did, verificationBitmap, reputationScore, stakedAmount,
      metadataUri, recoveryKeys, createdAt, lastUpdated, bump,
    };
  }

  private deserializeStakeAccount(data: Buffer): StakeAccount {
    let offset = 8;

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const identity = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const stakedAmount = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const lockedUntil = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const pendingRewards = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const lastClaimTime = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const unstakeRequested = data.readUInt8(offset) === 1;
    offset += 1;
    const unstakeRequestTime = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const bump = data.readUInt8(offset);

    return {
      owner, identity, stakedAmount, lockedUntil, pendingRewards,
      lastClaimTime, unstakeRequested, unstakeRequestTime, bump,
    };
  }

  private deserializeCredentialAccount(data: Buffer): CredentialAccount {
    let offset = 8;

    const credentialId = Array.from(data.slice(offset, offset + 32));
    offset += 32;
    const schema = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const holder = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const issuer = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const claimsHash = Array.from(data.slice(offset, offset + 32));
    offset += 32;
    const status = data.readUInt8(offset);
    offset += 1;
    const issuedAt = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const expiresAt = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    const revokedAt = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;

    const hasReason = data.readUInt8(offset) === 1;
    offset += 1;
    let revocationReason: string | null = null;
    if (hasReason) {
      const reasonLen = data.readUInt32LE(offset);
      offset += 4;
      revocationReason = data.slice(offset, offset + reasonLen).toString('utf8');
      offset += reasonLen;
    }

    const metadataUriLen = data.readUInt32LE(offset);
    offset += 4;
    const metadataUri = data.slice(offset, offset + metadataUriLen).toString('utf8');
    offset += metadataUriLen;
    const bump = data.readUInt8(offset);

    return {
      credentialId, schema, holder, issuer, claimsHash, status,
      issuedAt, expiresAt, revokedAt, revocationReason, metadataUri, bump,
    };
  }
}
