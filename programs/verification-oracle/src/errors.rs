use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("Invalid proof hash - must be 64 character hex string")]
    InvalidProofHash,

    #[msg("Metadata URI exceeds maximum length of 256 characters")]
    URITooLong,

    #[msg("Invalid verification type - must be less than 64")]
    InvalidVerificationType,

    #[msg("Unauthorized oracle - signer does not match configured oracle authority")]
    UnauthorizedOracle,

    #[msg("Proof has already been processed")]
    ProofAlreadyProcessed,

    #[msg("Proof has expired")]
    ProofExpired,

    #[msg("Reason exceeds maximum length of 256 characters")]
    ReasonTooLong,

    #[msg("Cannot revoke unverified proof")]
    CannotRevokeUnverifiedProof,

    #[msg("Proof must be verified or revoked before updating identity")]
    ProofNotProcessed,
}
