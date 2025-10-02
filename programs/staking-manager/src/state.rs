use anchor_lang::prelude::*;

#[account]
pub struct StakingConfig {
    pub admin: Pubkey,                  // 32
    pub identity_registry: Pubkey,      // 32
    pub min_stake_amount: u64,          // 8
    pub lockup_period: i64,             // 8 (seconds)
    pub slash_percentage: u8,           // 1
    pub reward_rate: u64,               // 8 (basis points per year)
    pub total_staked: u64,              // 8
    pub total_rewards_distributed: u64, // 8
}

impl StakingConfig {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + 8 + 8 + 8;
}

#[account]
pub struct Treasury {
    pub authority: Pubkey,              // 32
    pub total_balance: u64,             // 8
    pub total_withdrawn: u64,           // 8
    pub bump: u8,                       // 1
}

impl Treasury {
    pub const LEN: usize = 32 + 8 + 8 + 1;
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,                  // 32
    pub staked_amount: u64,             // 8
    pub staked_at: i64,                 // 8
    pub unlock_at: i64,                 // 8
    pub rewards_earned: u64,            // 8
    pub last_reward_claim: i64,         // 8
    pub slashed: bool,                  // 1
    pub bump: u8,                       // 1
}

impl StakeAccount {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}
