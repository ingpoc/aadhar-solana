use anchor_lang::prelude::*;

pub const MAX_DID_LEN: usize = 128;
pub const MAX_URI_LEN: usize = 256;
pub const MAX_RECOVERY_KEYS: usize = 5;

#[account]
pub struct IdentityAccount {
    pub authority: Pubkey,           // 32
    pub did: String,                 // 4 + 128
    pub verification_bitmap: u64,    // 8
    pub reputation_score: u64,       // 8
    pub staked_amount: u64,          // 8
    pub created_at: i64,             // 8
    pub last_updated: i64,           // 8
    pub metadata_uri: String,        // 4 + 256
    pub recovery_keys: Vec<Pubkey>,  // 4 + (5 * 32)
    pub bump: u8,                    // 1
}

impl IdentityAccount {
    pub const LEN: usize = 8 +   // discriminator
        32 +                      // authority
        4 + MAX_DID_LEN +         // did (String)
        8 +                       // verification_bitmap
        8 +                       // reputation_score
        8 +                       // staked_amount
        8 +                       // created_at
        8 +                       // last_updated
        4 + MAX_URI_LEN +         // metadata_uri (String)
        4 + (MAX_RECOVERY_KEYS * 32) + // recovery_keys (Vec<Pubkey>)
        1;                        // bump
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
