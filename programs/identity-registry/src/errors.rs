use anchor_lang::prelude::*;

#[error_code]
pub enum IdentityError {
    #[msg("DID exceeds maximum length of 128 characters")]
    DIDTooLong,

    #[msg("Metadata URI exceeds maximum length of 256 characters")]
    URITooLong,

    #[msg("Too many recovery keys (maximum 5)")]
    TooManyRecoveryKeys,

    #[msg("Invalid verification type")]
    InvalidVerificationType,

    #[msg("Unauthorized recovery attempt")]
    UnauthorizedRecovery,

    #[msg("Insufficient stake amount")]
    InsufficientStake,

    #[msg("Account not found")]
    AccountNotFound,

    #[msg("Unauthorized: Only verification oracle can update verification status")]
    UnauthorizedOracle,

    #[msg("Unauthorized: Only reputation engine can update reputation")]
    UnauthorizedReputationEngine,

    #[msg("Unauthorized: Only staking manager can update staked amount")]
    UnauthorizedStakingManager,
}
