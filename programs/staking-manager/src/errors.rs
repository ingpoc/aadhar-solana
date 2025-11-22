use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Stake amount is below minimum required")]
    InsufficientStakeAmount,

    #[msg("Insufficient staked balance for this operation")]
    InsufficientStakedBalance,

    #[msg("Unstake cooldown period has not elapsed")]
    CooldownNotElapsed,

    #[msg("No pending unstake request found")]
    NoPendingUnstake,

    #[msg("Unstake already requested")]
    UnstakeAlreadyRequested,

    #[msg("No rewards available to claim")]
    NoRewardsAvailable,

    #[msg("Pool is currently paused")]
    PoolPaused,

    #[msg("Unauthorized: Only admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Unauthorized: Only oracle can slash")]
    UnauthorizedSlash,

    #[msg("Invalid slash amount")]
    InvalidSlashAmount,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Stake account already exists")]
    StakeAccountExists,

    #[msg("Cannot unstake more than staked amount")]
    ExcessiveUnstakeAmount,
}
