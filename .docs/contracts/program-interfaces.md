# Solana Program Interfaces

## Program Interface Definitions

### Identity Registry Interface

```typescript
export interface IdentityRegistryInterface {
  // Initialize global configuration
  initializeConfig(
    verificationOracle: PublicKey,
    credentialManager: PublicKey,
    reputationEngine: PublicKey,
    stakingManager: PublicKey
  ): Promise<TransactionSignature>;

  // Create a new identity
  createIdentity(
    authority: PublicKey,
    did: string,
    metadataUri: string,
    recoveryKeys: PublicKey[]
  ): Promise<{
    identityAccount: PublicKey;
    signature: TransactionSignature;
  }>;

  // Update verification status
  updateVerificationStatus(
    identityAccount: PublicKey,
    verificationType: VerificationType,
    verified: boolean
  ): Promise<TransactionSignature>;

  // Update reputation score
  updateReputation(
    identityAccount: PublicKey,
    newScore: BN
  ): Promise<TransactionSignature>;

  // Add recovery key
  addRecoveryKey(
    identityAccount: PublicKey,
    recoveryKey: PublicKey
  ): Promise<TransactionSignature>;

  // Recover identity with new authority
  recoverIdentity(
    identityAccount: PublicKey,
    newAuthority: PublicKey,
    recoverySignatures: Buffer[]
  ): Promise<TransactionSignature>;
}
```

### Verification Oracle Interface

```typescript
export interface VerificationOracleInterface {
  // Initialize oracle configuration
  initializeOracle(
    oracleAuthority: PublicKey,
    identityRegistry: PublicKey,
    apiSetuEndpoint: string
  ): Promise<TransactionSignature>;

  // Request external verification
  requestVerification(
    identityAccount: PublicKey,
    verificationType: VerificationType,
    requestDataHash: Buffer
  ): Promise<{
    verificationRequest: PublicKey;
    signature: TransactionSignature;
  }>;

  // Submit verification result (oracle only)
  submitVerificationResult(
    verificationRequest: PublicKey,
    verified: boolean,
    proofHash: Buffer
  ): Promise<TransactionSignature>;

  // Update oracle authority
  updateOracleAuthority(
    newAuthority: PublicKey
  ): Promise<TransactionSignature>;
}
```

### Credential Manager Interface

```typescript
export interface CredentialManagerInterface {
  // Create credential definition
  createCredentialDefinition(
    issuer: PublicKey,
    credentialType: string,
    schemaUri: string
  ): Promise<{
    credentialDefinition: PublicKey;
    signature: TransactionSignature;
  }>;

  // Issue verifiable credential
  issueCredential(
    credentialDefinition: PublicKey,
    credentialId: string,
    subject: PublicKey,
    expiresAt: BN | null,
    proofHash: Buffer,
    metadataUri: string
  ): Promise<{
    credential: PublicKey;
    signature: TransactionSignature;
  }>;

  // Verify credential validity
  verifyCredential(
    credential: PublicKey
  ): Promise<{
    valid: boolean;
    revoked: boolean;
    expired: boolean;
  }>;

  // Revoke credential
  revokeCredential(
    credential: PublicKey,
    reason: string
  ): Promise<TransactionSignature>;

  // Create revocation registry
  createRevocationRegistry(
    credentialDefinition: PublicKey
  ): Promise<{
    revocationRegistry: PublicKey;
    signature: TransactionSignature;
  }>;
}
```

### Reputation Engine Interface

```typescript
export interface ReputationEngineInterface {
  // Initialize reputation account
  initializeReputation(
    identity: PublicKey
  ): Promise<{
    reputationAccount: PublicKey;
    signature: TransactionSignature;
  }>;

  // Update verification-based score
  updateVerificationScore(
    reputationAccount: PublicKey,
    verificationType: VerificationType,
    scoreDelta: BN
  ): Promise<TransactionSignature>;

  // Record platform activity
  recordActivity(
    reputationAccount: PublicKey,
    activityType: ActivityType,
    scoreDelta: BN
  ): Promise<TransactionSignature>;

  // Apply reputation penalty
  applyPenalty(
    reputationAccount: PublicKey,
    penaltyType: PenaltyType,
    scorePenalty: BN
  ): Promise<TransactionSignature>;

  // Calculate current reputation
  calculateReputation(
    reputationAccount: PublicKey
  ): Promise<BN>;

  // Get reputation history
  getReputationHistory(
    reputationAccount: PublicKey
  ): Promise<ReputationEvent[]>;
}
```

### Staking Manager Interface

```typescript
export interface StakingManagerInterface {
  // Stake SOL for identity
  stakeIdentity(
    identity: PublicKey,
    amount: BN,
    lockPeriod: BN | null
  ): Promise<{
    stakeAccount: PublicKey;
    signature: TransactionSignature;
  }>;

  // Unstake SOL from identity
  unstakeIdentity(
    stakeAccount: PublicKey,
    amount: BN
  ): Promise<TransactionSignature>;

  // Slash stake for malicious behavior
  slashStake(
    stakeAccount: PublicKey,
    amount: BN,
    reason: string
  ): Promise<TransactionSignature>;

  // Claim staking rewards
  claimRewards(
    stakeAccount: PublicKey
  ): Promise<TransactionSignature>;

  // Emergency withdraw (with penalties)
  emergencyWithdraw(
    stakeAccount: PublicKey
  ): Promise<TransactionSignature>;
}
```

## Type Definitions

### Enums

```typescript
export enum VerificationType {
  Aadhaar = 0,
  PAN = 1,
  Education = 2,
  Employment = 3,
  Banking = 4,
  Medical = 5,
}

export enum ActivityType {
  Login = 0,
  ProfileUpdate = 1,
  CredentialShared = 2,
  Verification = 3,
  Staking = 4,
  Social = 5,
}

export enum PenaltyType {
  FraudulentActivity = 0,
  SpamBehavior = 1,
  PolicyViolation = 2,
  SecurityBreach = 3,
  FalseInformation = 4,
}

export enum CredentialStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
  Suspended = 3,
}
```

### Structs

```typescript
export interface IdentityAccount {
  authority: PublicKey;
  did: string;
  verificationBitmap: BN;
  reputationScore: BN;
  stakedAmount: BN;
  createdAt: BN;
  lastUpdated: BN;
  metadataUri: string;
  recoveryKeys: PublicKey[];
  bump: number;
}

export interface VerificationRequest {
  requestor: PublicKey;
  identityAccount: PublicKey;
  verificationType: VerificationType;
  requestDataHash: Buffer;
  status: number;
  createdAt: BN;
  completedAt: BN | null;
  proofHash: Buffer | null;
}

export interface Credential {
  credentialId: string;
  definition: PublicKey;
  subject: PublicKey;
  issuer: PublicKey;
  issuedAt: BN;
  expiresAt: BN | null;
  revoked: boolean;
  proofHash: Buffer;
  metadataUri: string;
}

export interface ReputationAccount {
  identity: PublicKey;
  baseScore: BN;
  verificationBonus: BN;
  activityScore: BN;
  penaltyScore: BN;
  lastCalculated: BN;
  calculationHistory: ReputationEvent[];
}

export interface ReputationEvent {
  eventType: number;
  scoreDelta: BN;
  timestamp: BN;
  metadata: string;
}

export interface StakeAccount {
  staker: PublicKey;
  identity: PublicKey;
  amount: BN;
  stakedAt: BN;
  unlockTime: BN | null;
  slashHistory: SlashEvent[];
}

export interface SlashEvent {
  reason: string;
  amount: BN;
  timestamp: BN;
}
```

## Program Interaction Examples

### Creating an Identity

```typescript
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { IdentityRegistry } from '../target/types/identity_registry';

const program = anchor.workspace.IdentityRegistry as Program<IdentityRegistry>;

async function createIdentity(
  authority: web3.Keypair,
  did: string,
  metadataUri: string,
  recoveryKeys: web3.PublicKey[]
) {
  const [identityAccount] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), authority.publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .createIdentity(did, metadataUri, recoveryKeys)
    .accounts({
      identity: identityAccount,
      authority: authority.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return { identityAccount, signature: tx };
}
```

### Requesting Verification

```typescript
async function requestVerification(
  identityAccount: web3.PublicKey,
  verificationType: VerificationType,
  requestData: Buffer
) {
  const requestDataHash = crypto.createHash('sha256')
    .update(requestData)
    .digest();

  const [verificationRequest] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("verification"),
      identityAccount.toBuffer(),
      Buffer.from([verificationType])
    ],
    verificationOracleProgram.programId
  );

  const tx = await verificationOracleProgram.methods
    .requestVerification(verificationType, Array.from(requestDataHash))
    .accounts({
      verificationRequest,
      identityAccount,
      requestor: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return { verificationRequest, signature: tx };
}
```

### Issuing a Credential

```typescript
async function issueCredential(
  issuer: web3.Keypair,
  subject: web3.PublicKey,
  credentialType: string,
  claims: any,
  expiresAt?: Date
) {
  // Create credential definition if it doesn't exist
  const [credentialDefinition] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("definition"), issuer.publicKey.toBuffer(), Buffer.from(credentialType)],
    credentialManagerProgram.programId
  );

  // Generate credential ID
  const credentialId = crypto.randomUUID();

  // Create zero-knowledge proof
  const proof = await generateCredentialProof(claims);
  const proofHash = crypto.createHash('sha256').update(proof).digest();

  const [credential] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), Buffer.from(credentialId)],
    credentialManagerProgram.programId
  );

  const tx = await credentialManagerProgram.methods
    .issueCredential(
      credentialId,
      subject,
      expiresAt ? new anchor.BN(expiresAt.getTime() / 1000) : null,
      Array.from(proofHash),
      "ipfs://metadata-uri"
    )
    .accounts({
      credential,
      credentialDefinition,
      subject,
      issuer: issuer.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([issuer])
    .rpc();

  return { credential, credentialId, signature: tx };
}
```

### Staking for Identity

```typescript
async function stakeForIdentity(
  staker: web3.Keypair,
  identityAccount: web3.PublicKey,
  amount: number,
  lockPeriod?: number
) {
  const [stakeAccount] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), staker.publicKey.toBuffer(), identityAccount.toBuffer()],
    stakingManagerProgram.programId
  );

  const tx = await stakingManagerProgram.methods
    .stakeIdentity(
      new anchor.BN(amount * web3.LAMPORTS_PER_SOL),
      lockPeriod ? new anchor.BN(lockPeriod) : null
    )
    .accounts({
      stakeAccount,
      identity: identityAccount,
      staker: staker.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([staker])
    .rpc();

  return { stakeAccount, signature: tx };
}
```

## Error Handling

### Custom Program Errors

```typescript
export enum AadhaarChainError {
  InvalidAuthority = 6000,
  InvalidRecoveryKey = 6001,
  InsufficientStake = 6002,
  VerificationFailed = 6003,
  CredentialExpired = 6004,
  CredentialRevoked = 6005,
  InsufficientReputation = 6006,
  UnauthorizedOperation = 6007,
  InvalidProof = 6008,
  StakeLocked = 6009,
  InvalidVerificationType = 6010,
  DuplicateVerification = 6011,
  InvalidCredentialType = 6012,
  ExceedsMaxRecoveryKeys = 6013,
  InvalidTimestamp = 6014,
  AccountAlreadyExists = 6015,
}
```

### Error Handling Example

```typescript
try {
  const result = await createIdentity(authority, did, metadataUri, recoveryKeys);
  console.log('Identity created:', result);
} catch (error) {
  if (error.code === 6015) { // AccountAlreadyExists
    console.log('Identity already exists for this authority');
  } else if (error.code === 6000) { // InvalidAuthority
    console.log('Invalid authority provided');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Integration Utilities

### PDA Helper Functions

```typescript
export class PDAUtils {
  static getIdentityPDA(authority: web3.PublicKey, programId: web3.PublicKey) {
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("identity"), authority.toBuffer()],
      programId
    );
  }

  static getVerificationRequestPDA(
    identityAccount: web3.PublicKey,
    verificationType: VerificationType,
    programId: web3.PublicKey
  ) {
    return web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("verification"),
        identityAccount.toBuffer(),
        Buffer.from([verificationType])
      ],
      programId
    );
  }

  static getCredentialPDA(credentialId: string, programId: web3.PublicKey) {
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(credentialId)],
      programId
    );
  }
}
```

### Transaction Builder

```typescript
export class TransactionBuilder {
  private instructions: web3.TransactionInstruction[] = [];

  addCreateIdentity(
    program: Program<IdentityRegistry>,
    authority: web3.PublicKey,
    did: string,
    metadataUri: string,
    recoveryKeys: web3.PublicKey[]
  ) {
    const [identityAccount] = PDAUtils.getIdentityPDA(authority, program.programId);

    const ix = program.instruction.createIdentity(did, metadataUri, recoveryKeys, {
      accounts: {
        identity: identityAccount,
        authority,
        systemProgram: web3.SystemProgram.programId,
      },
    });

    this.instructions.push(ix);
    return this;
  }

  async build(payer: web3.PublicKey): Promise<web3.Transaction> {
    const tx = new web3.Transaction();
    tx.add(...this.instructions);
    tx.feePayer = payer;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    return tx;
  }
}
```