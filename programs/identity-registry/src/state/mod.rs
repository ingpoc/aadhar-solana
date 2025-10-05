use anchor_lang::prelude::*;

pub const MAX_DID_LEN: usize = 128;
pub const MAX_RECOVERY_KEYS: usize = 5;
pub const MAX_ENCRYPTED_NAME: usize = 128;
pub const MAX_ENCRYPTED_DOB: usize = 64;
pub const MAX_ENCRYPTED_GENDER: usize = 32;
pub const MAX_ENCRYPTED_MOBILE: usize = 64;
pub const MAX_ENCRYPTED_EMAIL: usize = 128;
pub const MAX_ENCRYPTED_ADDRESS: usize = 512;

#[account]
pub struct IdentityAccount {
    pub authority: Pubkey,
    pub did: String,

    pub aadhaar_hash: [u8; 32],
    pub aadhaar_last4: String,
    pub name_encrypted: Vec<u8>,
    pub dob_encrypted: Vec<u8>,
    pub gender_encrypted: Vec<u8>,
    pub mobile_encrypted: Vec<u8>,
    pub email_encrypted: Vec<u8>,
    pub address_full_encrypted: Vec<u8>,
    pub photo_hash: [u8; 32],

    pub age_commitment: [u8; 32],
    pub gender_commitment: [u8; 32],

    pub aadhaar_verified_at: i64,
    pub aadhaar_expires_at: i64,
    pub oracle_signature: [u8; 64],

    pub verification_bitmap: u64,
    pub reputation_score: u64,
    pub staked_amount: u64,
    pub created_at: i64,
    pub last_updated: i64,
    pub recovery_keys: Vec<Pubkey>,
    pub bump: u8,
}

impl IdentityAccount {
    pub const LEN: usize = 8 +
        32 +
        4 + MAX_DID_LEN +
        32 +
        4 + 4 +
        4 + MAX_ENCRYPTED_NAME +
        4 + MAX_ENCRYPTED_DOB +
        4 + MAX_ENCRYPTED_GENDER +
        4 + MAX_ENCRYPTED_MOBILE +
        4 + MAX_ENCRYPTED_EMAIL +
        4 + MAX_ENCRYPTED_ADDRESS +
        32 +
        32 +
        32 +
        8 +
        8 +
        64 +
        8 +
        8 +
        8 +
        8 +
        8 +
        4 + (MAX_RECOVERY_KEYS * 32) +
        1;
}

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,               // 32
    pub verification_oracle: Pubkey, // 32
    pub credential_manager: Pubkey,  // 32
    pub reputation_engine: Pubkey,   // 32
    pub staking_manager: Pubkey,     // 32
    pub min_stake_amount: u64,       // 8
    pub verification_fee: u64,       // 8
}

impl GlobalConfig {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 32 + 8 + 8;
}
