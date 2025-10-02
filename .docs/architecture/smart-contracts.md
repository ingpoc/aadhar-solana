# Smart Contract Architecture

## Contract Overview

AadhaarChain consists of five main Solana programs that work together to provide self-sovereign identity functionality:

1. **Identity Registry Program** - Core identity management
2. **Verification Oracle Program** - External data integration
3. **Credential Manager Program** - Verifiable credentials
4. **Reputation Engine Program** - Reputation and scoring
5. **Staking Manager Program** - Economic incentives

## Identity Registry Program

### Purpose
Central registry for managing decentralized identities and their associated metadata.

### Account Structure
```rust
#[account]
pub struct IdentityAccount {
    pub authority: Pubkey,              // Owner of the identity
    pub did: String,                    // W3C DID standard identifier
    pub verification_bitmap: u64,       // Bit flags for verification status
    pub reputation_score: u64,          // Current reputation score
    pub staked_amount: u64,            // SOL staked for this identity
    pub created_at: i64,               // Unix timestamp of creation
    pub last_updated: i64,             // Last modification timestamp
    pub metadata_uri: String,          // IPFS URI for additional metadata
    pub recovery_keys: Vec<Pubkey>,    // Social recovery public keys
    pub bump: u8,                      // PDA bump seed
}

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,                 // Program admin
    pub verification_oracle: Pubkey,   // Oracle program address
    pub credential_manager: Pubkey,    // Credential program address
    pub reputation_engine: Pubkey,     // Reputation program address
    pub staking_manager: Pubkey,       // Staking program address
    pub min_stake_amount: u64,         // Minimum SOL to stake
    pub verification_fee: u64,         // Fee for verification
}
```

### Instructions
```rust
#[program]
pub mod identity_registry {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        verification_oracle: Pubkey,
        credential_manager: Pubkey,
        reputation_engine: Pubkey,
        staking_manager: Pubkey,
    ) -> Result<()>;

    pub fn create_identity(
        ctx: Context<CreateIdentity>,
        did: String,
        metadata_uri: String,
        recovery_keys: Vec<Pubkey>,
    ) -> Result<()>;

    pub fn update_verification_status(
        ctx: Context<UpdateVerificationStatus>,
        verification_type: u8,
        verified: bool,
    ) -> Result<()>;

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        new_score: u64,
    ) -> Result<()>;

    pub fn add_recovery_key(
        ctx: Context<AddRecoveryKey>,
        recovery_key: Pubkey,
    ) -> Result<()>;

    pub fn recover_identity(
        ctx: Context<RecoverIdentity>,
        new_authority: Pubkey,
    ) -> Result<()>;
}
```

### PDA Seeds
```rust
// Identity Account PDA
["identity", authority.key().as_ref()]

// Global Config PDA
["config"]
```

## Verification Oracle Program

### Purpose
Secure bridge between external verification services (API Setu) and the blockchain.

### Account Structure
```rust
#[account]
pub struct VerificationRequest {
    pub requestor: Pubkey,             // Who requested verification
    pub identity_account: Pubkey,      // Target identity account
    pub verification_type: u8,         // Type of verification
    pub request_data_hash: [u8; 32],   // Hash of request data
    pub status: u8,                   // Pending/Completed/Failed
    pub created_at: i64,              // Request timestamp
    pub completed_at: Option<i64>,    // Completion timestamp
    pub proof_hash: Option<[u8; 32]>, // Verification proof hash
}

#[account]
pub struct OracleConfig {
    pub admin: Pubkey,                // Oracle admin
    pub oracle_authority: Pubkey,     // Authorized oracle signer
    pub identity_registry: Pubkey,    // Identity registry program
    pub verification_fee: u64,        // Fee for verification
    pub api_setu_endpoint: String,    // API Setu base URL
}
```

### Instructions
```rust
#[program]
pub mod verification_oracle {
    use super::*;

    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        oracle_authority: Pubkey,
        identity_registry: Pubkey,
        api_setu_endpoint: String,
    ) -> Result<()>;

    pub fn request_verification(
        ctx: Context<RequestVerification>,
        verification_type: u8,
        request_data_hash: [u8; 32],
    ) -> Result<()>;

    pub fn submit_verification_result(
        ctx: Context<SubmitVerificationResult>,
        verified: bool,
        proof_hash: [u8; 32],
    ) -> Result<()>;

    pub fn update_oracle_authority(
        ctx: Context<UpdateOracleAuthority>,
        new_authority: Pubkey,
    ) -> Result<()>;
}
```

## Credential Manager Program

### Purpose
Manages the lifecycle of verifiable credentials including issuance, verification, and revocation.

### Account Structure
```rust
#[account]
pub struct CredentialDefinition {
    pub issuer: Pubkey,               // Credential issuer
    pub credential_type: String,       // Type identifier
    pub schema_uri: String,           // JSON schema URI
    pub revocation_registry: Option<Pubkey>, // Revocation registry
    pub created_at: i64,              // Creation timestamp
    pub active: bool,                 // Whether definition is active
}

#[account]
pub struct Credential {
    pub credential_id: String,        // Unique identifier
    pub definition: Pubkey,           // Credential definition account
    pub subject: Pubkey,              // Credential subject
    pub issuer: Pubkey,               // Credential issuer
    pub issued_at: i64,               // Issuance timestamp
    pub expires_at: Option<i64>,      // Optional expiration
    pub revoked: bool,                // Revocation status
    pub proof_hash: [u8; 32],         // ZK proof hash
    pub metadata_uri: String,         // Additional metadata URI
}

#[account]
pub struct RevocationRegistry {
    pub issuer: Pubkey,               // Registry owner
    pub credential_definition: Pubkey, // Associated definition
    pub revoked_credentials: Vec<String>, // List of revoked IDs
    pub created_at: i64,              // Creation timestamp
}
```

### Instructions
```rust
#[program]
pub mod credential_manager {
    use super::*;

    pub fn create_credential_definition(
        ctx: Context<CreateCredentialDefinition>,
        credential_type: String,
        schema_uri: String,
    ) -> Result<()>;

    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_id: String,
        subject: Pubkey,
        expires_at: Option<i64>,
        proof_hash: [u8; 32],
        metadata_uri: String,
    ) -> Result<()>;

    pub fn verify_credential(
        ctx: Context<VerifyCredential>,
        credential_id: String,
    ) -> Result<bool>;

    pub fn revoke_credential(
        ctx: Context<RevokeCredential>,
        credential_id: String,
    ) -> Result<()>;

    pub fn create_revocation_registry(
        ctx: Context<CreateRevocationRegistry>,
        credential_definition: Pubkey,
    ) -> Result<()>;
}
```

## Reputation Engine Program

### Purpose
Calculates and manages reputation scores based on verified credentials and on-chain behavior.

### Account Structure
```rust
#[account]
pub struct ReputationAccount {
    pub identity: Pubkey,             // Associated identity
    pub base_score: u64,              // Base reputation score
    pub verification_bonus: u64,      // Bonus from verifications
    pub activity_score: u64,          // Score from platform activity
    pub penalty_score: u64,           // Penalties applied
    pub last_calculated: i64,         // Last calculation timestamp
    pub calculation_history: Vec<ReputationEvent>, // Score history
}

#[account]
pub struct ReputationConfig {
    pub admin: Pubkey,                // Program admin
    pub base_score_weight: u64,       // Weight for base score
    pub verification_weight: u64,     // Weight for verifications
    pub activity_weight: u64,         // Weight for activity
    pub penalty_weight: u64,          // Weight for penalties
    pub decay_rate: u64,              // Score decay over time
}

pub struct ReputationEvent {
    pub event_type: u8,               // Type of event
    pub score_delta: i64,             // Score change
    pub timestamp: i64,               // Event timestamp
    pub metadata: String,             // Additional context
}
```

### Instructions
```rust
#[program]
pub mod reputation_engine {
    use super::*;

    pub fn initialize_reputation(
        ctx: Context<InitializeReputation>,
        identity: Pubkey,
    ) -> Result<()>;

    pub fn update_verification_score(
        ctx: Context<UpdateVerificationScore>,
        verification_type: u8,
        score_delta: i64,
    ) -> Result<()>;

    pub fn record_activity(
        ctx: Context<RecordActivity>,
        activity_type: u8,
        score_delta: i64,
    ) -> Result<()>;

    pub fn apply_penalty(
        ctx: Context<ApplyPenalty>,
        penalty_type: u8,
        score_penalty: u64,
    ) -> Result<()>;

    pub fn calculate_reputation(
        ctx: Context<CalculateReputation>,
    ) -> Result<u64>;
}
```

## Staking Manager Program

### Purpose
Manages economic incentives through identity staking and slashing mechanisms.

### Account Structure
```rust
#[account]
pub struct StakeAccount {
    pub staker: Pubkey,               // Staker's address
    pub identity: Pubkey,             // Staked identity
    pub amount: u64,                  // Staked SOL amount
    pub staked_at: i64,               // Staking timestamp
    pub unlock_time: Option<i64>,     // Unlock timestamp
    pub slash_history: Vec<SlashEvent>, // Slashing history
}

#[account]
pub struct StakingConfig {
    pub admin: Pubkey,                // Program admin
    pub min_stake: u64,               // Minimum stake amount
    pub lock_period: i64,             // Lock period in seconds
    pub slash_percentage: u64,        // Slash percentage (basis points)
    pub reward_pool: Pubkey,          // Reward pool account
}

pub struct SlashEvent {
    pub reason: String,               // Slashing reason
    pub amount: u64,                  // Slashed amount
    pub timestamp: i64,               // Slash timestamp
}
```

### Instructions
```rust
#[program]
pub mod staking_manager {
    use super::*;

    pub fn stake_identity(
        ctx: Context<StakeIdentity>,
        amount: u64,
        lock_period: Option<i64>,
    ) -> Result<()>;

    pub fn unstake_identity(
        ctx: Context<UnstakeIdentity>,
        amount: u64,
    ) -> Result<()>;

    pub fn slash_stake(
        ctx: Context<SlashStake>,
        amount: u64,
        reason: String,
    ) -> Result<()>;

    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
    ) -> Result<()>;

    pub fn emergency_withdraw(
        ctx: Context<EmergencyWithdraw>,
    ) -> Result<()>;
}
```

## Cross-Program Invocation (CPI) Architecture

### Program Interactions
```rust
// Identity Registry calls Reputation Engine
pub fn update_identity_reputation(
    ctx: Context<UpdateIdentityReputation>,
    new_score: u64,
) -> Result<()> {
    let cpi_program = ctx.accounts.reputation_engine.to_account_info();
    let cpi_accounts = UpdateReputation {
        reputation_account: ctx.accounts.reputation_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    reputation_engine::cpi::update_verification_score(
        cpi_ctx,
        VerificationType::Identity as u8,
        new_score as i64,
    )
}
```

### Program Addresses
```rust
// Program IDs (to be deployed)
pub const IDENTITY_REGISTRY_ID: Pubkey = pubkey!("...");
pub const VERIFICATION_ORACLE_ID: Pubkey = pubkey!("...");
pub const CREDENTIAL_MANAGER_ID: Pubkey = pubkey!("...");
pub const REPUTATION_ENGINE_ID: Pubkey = pubkey!("...");
pub const STAKING_MANAGER_ID: Pubkey = pubkey!("...");
```

## Security Considerations

### Access Controls
- Only authorized oracles can submit verification results
- Identity owners control their identity updates
- Admin functions require multi-signature approval
- Time-locked operations for security-critical functions

### Economic Security
- Staking requirements for identity registration
- Slashing for malicious behavior
- Economic incentives for honest participation
- Fee mechanisms to prevent spam

### Upgrade Strategy
- Upgradeable programs with governance controls
- Migration procedures for account structures
- Backward compatibility considerations
- Emergency pause mechanisms