use anchor_lang::prelude::*;

#[error_code]
pub enum ReputationError {
    #[msg("Reason exceeds maximum length of 256 characters")]
    ReasonTooLong,

    #[msg("URI exceeds maximum length of 256 characters")]
    URITooLong,

    #[msg("Unauthorized reputation engine - signer does not match configured engine authority")]
    UnauthorizedEngine,
}
