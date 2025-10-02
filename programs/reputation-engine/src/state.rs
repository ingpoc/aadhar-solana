use anchor_lang::prelude::*;

#[account]
pub struct ReputationConfig {
    pub admin: Pubkey,                  // 32
    pub identity_registry: Pubkey,      // 32
    pub base_score: u64,                // 8
    pub decay_rate: u64,                // 8
    pub verification_bonus: u64,        // 8
    pub credential_bonus: u64,          // 8
    pub total_scores_calculated: u64,  // 8
}

impl ReputationConfig {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct ReputationAccount {
    pub identity: Pubkey,               // 32
    pub score: u64,                     // 8
    pub last_updated: i64,              // 8
    pub verification_count: u64,        // 8
    pub credential_count: u64,          // 8
    pub activity_count: u64,            // 8
    pub challenges_received: u64,       // 8
    pub challenges_won: u64,            // 8
    pub bump: u8,                       // 1
}

impl ReputationAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}
