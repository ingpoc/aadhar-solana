use anchor_lang::prelude::*;

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
    pub const LEN: usize = 32 + 132 + 8 + 8 + 8 + 8 + 8 + 260 + 164 + 1;
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
