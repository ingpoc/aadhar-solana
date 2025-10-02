use anchor_lang::prelude::*;

#[account]
pub struct OracleConfig {
    pub admin: Pubkey,                  // 32
    pub identity_registry: Pubkey,      // 32
    pub oracle_authority: Pubkey,       // 32
    pub verification_count: u64,        // 8
}

impl OracleConfig {
    pub const LEN: usize = 32 + 32 + 32 + 8;
}

#[account]
pub struct VerificationProof {
    pub identity: Pubkey,               // 32
    pub verification_type: u8,          // 1
    pub proof_hash: String,             // 4 + 64 (SHA256 hex string)
    pub metadata_uri: String,           // 4 + 256
    pub oracle_authority: Pubkey,       // 32
    pub submitted_at: i64,              // 8
    pub verified_at: i64,               // 8
    pub expires_at: i64,                // 8
    pub status: u8,                     // 1 (ProofStatus enum)
    pub bump: u8,                       // 1
}

impl VerificationProof {
    pub const LEN: usize = 32 + 1 + 68 + 260 + 32 + 8 + 8 + 8 + 1 + 1;
}

#[repr(u8)]
pub enum ProofStatus {
    Pending = 0,
    Verified = 1,
    Rejected = 2,
    Revoked = 3,
}
