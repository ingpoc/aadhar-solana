use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Invalid slash percentage - must be between 0 and 100")]
    InvalidSlashPercentage,

    #[msg("Stake amount is below minimum required")]
    BelowMinimumStake,

    #[msg("Stake is still locked - cannot unstake yet")]
    StakeStillLocked,

    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,

    #[msg("Stake has been slashed - cannot perform this action")]
    StakeSlashed,

    #[msg("Stake has already been slashed")]
    StakeAlreadySlashed,

    #[msg("Unauthorized staker - signer does not match stake owner")]
    UnauthorizedStaker,

    #[msg("Reason exceeds maximum length of 256 characters")]
    ReasonTooLong,
}
