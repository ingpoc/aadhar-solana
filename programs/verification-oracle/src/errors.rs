use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("Insufficient stake to register as oracle")]
    InsufficientStake,

    #[msg("Oracle is not active")]
    OracleNotActive,

    #[msg("Oracle already registered")]
    OracleAlreadyRegistered,

    #[msg("Oracle not found")]
    OracleNotFound,

    #[msg("Verification request not found")]
    RequestNotFound,

    #[msg("Verification request has expired")]
    RequestExpired,

    #[msg("Verification request is not pending")]
    RequestNotPending,

    #[msg("Oracle has already responded to this request")]
    AlreadyResponded,

    #[msg("Insufficient fee for verification request")]
    InsufficientFee,

    #[msg("Verification already finalized")]
    AlreadyFinalized,

    #[msg("Not enough confirmations to finalize")]
    InsufficientConfirmations,

    #[msg("Unauthorized: Only admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Invalid verification type")]
    InvalidVerificationType,

    #[msg("Request deadline not yet reached")]
    DeadlineNotReached,

    #[msg("Maximum oracles per request reached")]
    MaxOraclesReached,

    #[msg("Arithmetic overflow")]
    Overflow,
}
