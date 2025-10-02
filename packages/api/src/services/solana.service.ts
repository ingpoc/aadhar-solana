import { Injectable, OnModuleInit } from '@nestjs/common';
import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';

@Injectable()
export class SolanaService implements OnModuleInit {
  private _connection: Connection;
  private provider: AnchorProvider;
  private wallet: Keypair;

  private programIds: {
    identityRegistry: PublicKey;
    verificationOracle: PublicKey;
    credentialManager: PublicKey;
    reputationEngine: PublicKey;
    stakingManager: PublicKey;
  };

  // Program clients
  public identityProgram: Program;
  public verificationProgram: Program;
  public credentialProgram: Program;
  public reputationProgram: Program;
  public stakingProgram: Program;

  constructor() {
    this._connection = new Connection(
      process.env.SOLANA_RPC_URL || 'http://localhost:8899',
      'confirmed',
    );

    this.programIds = {
        identityRegistry: new PublicKey('9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n'),
        verificationOracle: new PublicKey('3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY'),
        credentialManager: new PublicKey('7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP'),
        reputationEngine: new PublicKey('27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH'),
        stakingManager: new PublicKey('GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh'),
      };

    console.log('✅ Solana service initialized');
  }

  async onModuleInit() {
    // Load wallet
    const walletPath = process.env.SOLANA_WALLET_PATH || './keys/admin-keypair.json';
    if (fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    } else {
      // Generate a new wallet for development
      this.wallet = Keypair.generate();
      console.log('⚠️ Using generated wallet for development');
    }

    // Initialize provider
    this.provider = new AnchorProvider(
      this._connection,
      new Wallet(this.wallet),
      { commitment: 'confirmed' }
    );

    // Load IDLs and create program clients
    await this.loadPrograms();

    console.log('✅ Solana programs loaded successfully');
  }

  private async loadPrograms() {
    try {
      // Load IDL files and create program clients
      const idlPaths = {
        identityRegistry: '../../target/idl/identity_registry.json',
        verificationOracle: '../../target/idl/verification_oracle.json',
        credentialManager: '../../target/idl/credential_manager.json',
        reputationEngine: '../../target/idl/reputation_engine.json',
        stakingManager: '../../target/idl/staking_manager.json',
      };

      // Load Identity Registry Program
      const identityIdl = JSON.parse(fs.readFileSync(idlPaths.identityRegistry, 'utf-8'));
      this.identityProgram = new Program(identityIdl, this.programIds.identityRegistry, this.provider);

      // Load Verification Oracle Program
      const verificationIdl = JSON.parse(fs.readFileSync(idlPaths.verificationOracle, 'utf-8'));
      this.verificationProgram = new Program(verificationIdl, this.programIds.verificationOracle, this.provider);

      // Load Credential Manager Program
      const credentialIdl = JSON.parse(fs.readFileSync(idlPaths.credentialManager, 'utf-8'));
      this.credentialProgram = new Program(credentialIdl, this.programIds.credentialManager, this.provider);

      // Load Reputation Engine Program
      const reputationIdl = JSON.parse(fs.readFileSync(idlPaths.reputationEngine, 'utf-8'));
      this.reputationProgram = new Program(reputationIdl, this.programIds.reputationEngine, this.provider);

      // Load Staking Manager Program
      const stakingIdl = JSON.parse(fs.readFileSync(idlPaths.stakingManager, 'utf-8'));
      this.stakingProgram = new Program(stakingIdl, this.programIds.stakingManager, this.provider);

      console.log('✅ All Anchor program clients initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize programs:', error);
      console.log('⚠️ Continuing with basic Solana connection');
    }
  }

  async createIdentityAccount(
    authority: string,
    did: string,
    metadataUri: string,
    recoveryKeys: string[],
  ): Promise<string> {
    try {
      const authorityPubkey = new PublicKey(authority);
      const recoveryPubkeys = recoveryKeys.map(key => new PublicKey(key));

      const [identityPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('identity'), authorityPubkey.toBuffer()],
        this.programIds.identityRegistry,
      );

      console.log(`Creating identity for ${authority}`);
      console.log(`Identity PDA: ${identityPDA.toString()}`);

      // For now, we'll use the admin wallet to sign transactions
      // In production, this would need proper wallet signature from the user
      const signerKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(require('fs').readFileSync('./test-wallet.json', 'utf-8')))
      );

      // Create transaction instruction manually since IDL parsing failed
      // Format: discriminator (8 bytes) + did + metadataUri + recoveryKeys (fixed array of 5 pubkeys)
      const instructionData = Buffer.concat([
        Buffer.from([12, 253, 209, 41, 176, 51, 195, 179]), // discriminator for create_identity
        Buffer.from(new Uint8Array([did.length])),
        Buffer.from(did, 'utf-8'),
        Buffer.from(new Uint8Array([metadataUri.length])),
        Buffer.from(metadataUri, 'utf-8'),
        // Recovery keys as fixed array of 5 pubkeys (32 bytes each)
        ...recoveryPubkeys.map(key => key.toBuffer()),
        // Pad with empty pubkeys if less than 5
        ...Array(Math.max(0, 5 - recoveryPubkeys.length)).fill(Buffer.alloc(32))
      ]);

      const instruction = {
        keys: [
          { pubkey: identityPDA, isSigner: false, isWritable: true },
          { pubkey: signerKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programIds.identityRegistry,
        data: instructionData,
      };

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await this._connection.getRecentBlockhash()).blockhash;
      transaction.feePayer = signerKeypair.publicKey;

      // Sign with the admin keypair
      transaction.sign(signerKeypair);

      // Send transaction
      const tx = await this._connection.sendRawTransaction(transaction.serialize());

      console.log(`✅ Identity created successfully: ${tx}`);
      return tx; // Real transaction signature
    } catch (error) {
      console.error('❌ Error creating identity account:', error);
      throw error;
    }
  }

  async getIdentityAccount(publicKey: string): Promise<any> {
    try {
      const pubkey = new PublicKey(publicKey);
      const [identityPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('identity'), pubkey.toBuffer()],
        this.programIds.identityRegistry,
      );

      // Try to get account from blockchain first
      try {
        const identityAccount = await this.identityProgram.account.identityAccount.fetch(identityPDA);
        return {
          publicKey: identityPDA.toString(),
          authority: identityAccount.authority.toString(),
          did: identityAccount.did,
          verificationBitmap: identityAccount.verificationBitmap,
          reputationScore: identityAccount.reputationScore,
          stakedAmount: identityAccount.stakedAmount,
          createdAt: identityAccount.createdAt,
          lastUpdated: identityAccount.lastUpdated,
          metadataUri: identityAccount.metadataUri,
          recoveryKeys: (identityAccount.recoveryKeys as PublicKey[]).map(key => key.toString()),
          bump: identityAccount.bump,
        };
      } catch (error) {
        // Account doesn't exist on blockchain yet
        return null;
      }
    } catch (error) {
      console.error('Error getting identity account:', error);
      return null;
    }
  }

  async updateVerificationStatus(
    publicKey: string,
    verificationType: number,
    verified: boolean,
  ): Promise<string> {
    try {
      console.log(`Updating verification status for ${publicKey}: type=${verificationType}, verified=${verified}`);

      const authorityPubkey = new PublicKey(publicKey);
      const [identityPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('identity'), authorityPubkey.toBuffer()],
        this.programIds.identityRegistry,
      );

      // ✅ Actually call the Solana program
      const tx = await this.identityProgram.methods
        .updateVerificationStatus(verificationType, verified)
        .accounts({
          identityAccount: identityPDA,
          oracle: this.provider.wallet.publicKey,
          config: PublicKey.findProgramAddressSync([Buffer.from('config')], this.programIds.identityRegistry)[0],
        })
        .rpc();

      console.log(`✅ Verification status updated: ${tx}`);
      return tx; // Real transaction signature
    } catch (error) {
      console.error('❌ Error updating verification status:', error);
      throw error;
    }
  }

  async issueCredential(
    identityId: string,
    credentialType: string,
    claims: any,
  ): Promise<string> {
    try {
      console.log(`Issuing credential for ${identityId}: type=${credentialType}`);

      const recipientPubkey = new PublicKey(identityId);
      const [credentialPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('credential'), recipientPubkey.toBuffer(), Buffer.from(credentialType)],
        this.programIds.credentialManager,
      );

      // ✅ Actually call the Solana program
      const tx = await this.credentialProgram.methods
        .issueCredential(recipientPubkey, credentialType, claims, 'https://metadata.uri')
        .accounts({
          credentialAccount: credentialPDA,
          issuer: this.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Credential issued: ${tx}`);
      return tx; // Real transaction signature
    } catch (error) {
      console.error('❌ Error issuing credential:', error);
      throw error;
    }
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await this._connection.getBalance(pubkey);
      return balance / 1e9;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  // Helper method to check if programs are deployed
  async checkProgramsDeployed(): Promise<boolean> {
    try {
      for (const [name, programId] of Object.entries(this.programIds)) {
        const accountInfo = await this._connection.getAccountInfo(programId);
        if (!accountInfo) {
          console.error(`❌ ${name} program not deployed at ${programId.toString()}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Error checking program deployment:', error);
      return false;
    }
  }

  // Public getter for connection (needed for health checks)
  get connection(): Connection {
    return this._connection;
  }
}
