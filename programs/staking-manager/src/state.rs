use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    /// Admin authority
    pub admin: Pubkey,
    /// Identity registry program for CPI
    pub identity_registry: Pubkey,
    /// Verification oracle program (can slash)
    pub verification_oracle: Pubkey,
    /// Total SOL staked in the pool
    pub total_staked: u64,
    /// Minimum stake amount (in lamports)
    pub min_stake_amount: u64,
    /// Annual reward rate in basis points (100 = 1%)
    pub reward_rate_bps: u16,
    /// Unstaking cooldown period in seconds
    pub unstake_cooldown: i64,
    /// Last time rewards were distributed
    pub last_reward_distribution: i64,
    /// Accumulated rewards per share (scaled by 1e12)
    pub acc_reward_per_share: u128,
    /// Pool is paused
    pub paused: bool,
    /// Bump seed
    pub bump: u8,
}

impl StakingPool {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // identity_registry
        32 + // verification_oracle
        8 +  // total_staked
        8 +  // min_stake_amount
        2 +  // reward_rate_bps
        8 +  // unstake_cooldown
        8 +  // last_reward_distribution
        16 + // acc_reward_per_share
        1 +  // paused
        1;   // bump
}

#[account]
pub struct StakeAccount {
    /// Owner of the stake
    pub owner: Pubkey,
    /// Amount staked (in lamports)
    pub staked_amount: u64,
    /// Timestamp when stake was created
    pub staked_at: i64,
    /// Pending rewards to claim
    pub pending_rewards: u64,
    /// Reward debt for reward calculation
    pub reward_debt: u128,
    /// Timestamp when unstake was requested (0 if not requested)
    pub unstake_requested_at: i64,
    /// Amount requested to unstake
    pub unstake_amount: u64,
    /// Total rewards claimed
    pub total_rewards_claimed: u64,
    /// Times slashed
    pub slash_count: u8,
    /// Bump seed
    pub bump: u8,
}

impl StakeAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        8 +  // staked_amount
        8 +  // staked_at
        8 +  // pending_rewards
        16 + // reward_debt
        8 +  // unstake_requested_at
        8 +  // unstake_amount
        8 +  // total_rewards_claimed
        1 +  // slash_count
        1;   // bump
}

#[account]
pub struct SlashRecord {
    /// Staker who was slashed
    pub staker: Pubkey,
    /// Amount slashed (in lamports)
    pub amount: u64,
    /// Reason code for slashing
    pub reason: SlashReason,
    /// Timestamp of slash
    pub timestamp: i64,
    /// Who initiated the slash
    pub slashed_by: Pubkey,
    /// Bump seed
    pub bump: u8,
}

impl SlashRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // staker
        8 +  // amount
        1 +  // reason
        8 +  // timestamp
        32 + // slashed_by
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SlashReason {
    InvalidVerification,
    MaliciousBehavior,
    Timeout,
    ConsensusViolation,
}

impl Default for SlashReason {
    fn default() -> Self {
        SlashReason::InvalidVerification
    }
}
