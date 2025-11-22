use anchor_lang::prelude::*;

/// Global configuration for the oracle network
#[account]
pub struct OracleConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Identity registry program for CPI
    pub identity_registry: Pubkey,
    /// Staking manager program for slashing
    pub staking_manager: Pubkey,
    /// Minimum stake required to be an oracle (in lamports)
    pub min_oracle_stake: u64,
    /// Fee for verification requests (in lamports)
    pub verification_fee: u64,
    /// Number of oracle confirmations required
    pub required_confirmations: u8,
    /// Timeout for verification requests (in seconds)
    pub verification_timeout: i64,
    /// Slash percentage for misbehavior (basis points, 100 = 1%)
    pub slash_percentage_bps: u16,
    /// Total active oracles
    pub active_oracle_count: u32,
    /// Total verifications processed
    pub total_verifications: u64,
    /// Bump seed
    pub bump: u8,
}

impl OracleConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // identity_registry
        32 + // staking_manager
        8 +  // min_oracle_stake
        8 +  // verification_fee
        1 +  // required_confirmations
        8 +  // verification_timeout
        2 +  // slash_percentage_bps
        4 +  // active_oracle_count
        8 +  // total_verifications
        1;   // bump
}

/// Registered oracle node
#[account]
pub struct OracleNode {
    /// Oracle's authority (wallet that controls the node)
    pub authority: Pubkey,
    /// Associated stake account in staking manager
    pub stake_account: Pubkey,
    /// Current status
    pub status: OracleStatus,
    /// Total verifications submitted
    pub verifications_submitted: u64,
    /// Successful verifications (agreed with consensus)
    pub successful_verifications: u64,
    /// Failed verifications (disagreed with consensus)
    pub failed_verifications: u64,
    /// Times slashed
    pub slash_count: u8,
    /// Registration timestamp
    pub registered_at: i64,
    /// Last activity timestamp
    pub last_active: i64,
    /// Bump seed
    pub bump: u8,
}

impl OracleNode {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // stake_account
        1 +  // status
        8 +  // verifications_submitted
        8 +  // successful_verifications
        8 +  // failed_verifications
        1 +  // slash_count
        8 +  // registered_at
        8 +  // last_active
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OracleStatus {
    Active,
    Inactive,
    Slashed,
}

impl Default for OracleStatus {
    fn default() -> Self {
        OracleStatus::Inactive
    }
}

/// Verification request submitted by a user
#[account]
pub struct VerificationRequest {
    /// Identity being verified
    pub identity: Pubkey,
    /// Type of verification (matches identity registry bitmap)
    pub verification_type: u8,
    /// Verification hash (hash of data being verified, e.g., Aadhaar hash)
    pub verification_hash: [u8; 32],
    /// Current status
    pub status: VerificationStatus,
    /// Fee paid
    pub fee_paid: u64,
    /// Request timestamp
    pub created_at: i64,
    /// Deadline for responses
    pub deadline: i64,
    /// Number of confirmations received
    pub confirmations: u8,
    /// Number of rejections received
    pub rejections: u8,
    /// Oracles that have responded (for tracking)
    pub responded_oracles: Vec<Pubkey>,
    /// Final result (after consensus)
    pub result: Option<bool>,
    /// Bump seed
    pub bump: u8,
}

impl VerificationRequest {
    pub const MAX_ORACLES: usize = 10;
    pub const LEN: usize = 8 + // discriminator
        32 + // identity
        1 +  // verification_type
        32 + // verification_hash
        1 +  // status
        8 +  // fee_paid
        8 +  // created_at
        8 +  // deadline
        1 +  // confirmations
        1 +  // rejections
        4 + (32 * Self::MAX_ORACLES) + // responded_oracles (vec)
        2 +  // result (Option<bool>)
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VerificationStatus {
    Pending,
    InProgress,
    Verified,
    Rejected,
    Expired,
}

impl Default for VerificationStatus {
    fn default() -> Self {
        VerificationStatus::Pending
    }
}

/// Oracle response to a verification request
#[account]
pub struct OracleResponse {
    /// Verification request being responded to
    pub request: Pubkey,
    /// Oracle that submitted the response
    pub oracle: Pubkey,
    /// The response (true = verified, false = rejected)
    pub verified: bool,
    /// Timestamp of response
    pub responded_at: i64,
    /// Optional metadata hash (for audit trail)
    pub metadata_hash: [u8; 32],
    /// Bump seed
    pub bump: u8,
}

impl OracleResponse {
    pub const LEN: usize = 8 + // discriminator
        32 + // request
        32 + // oracle
        1 +  // verified
        8 +  // responded_at
        32 + // metadata_hash
        1;   // bump
}

/// Verification type constants matching identity registry bitmap
pub mod verification_types {
    pub const AADHAAR: u8 = 0;
    pub const PAN: u8 = 1;
    pub const EMAIL: u8 = 2;
    pub const PHONE: u8 = 3;
    pub const BANK_ACCOUNT: u8 = 4;
    pub const EDUCATIONAL: u8 = 5;
    pub const DRIVING_LICENSE: u8 = 6;
    pub const PASSPORT: u8 = 7;
}
