use anchor_lang::prelude::*;

#[error_code]
pub enum CredentialError {
    #[msg("Schema name too long")]
    SchemaNameTooLong,

    #[msg("Schema not found")]
    SchemaNotFound,

    #[msg("Schema is not active")]
    SchemaNotActive,

    #[msg("Issuer not registered")]
    IssuerNotRegistered,

    #[msg("Issuer is not active")]
    IssuerNotActive,

    #[msg("Issuer verification level insufficient")]
    InsufficientIssuerVerification,

    #[msg("Credential not found")]
    CredentialNotFound,

    #[msg("Credential is not active")]
    CredentialNotActive,

    #[msg("Credential already revoked")]
    CredentialAlreadyRevoked,

    #[msg("Credential has expired")]
    CredentialExpired,

    #[msg("Credential is not transferable")]
    CredentialNotTransferable,

    #[msg("Credential is not revocable")]
    CredentialNotRevocable,

    #[msg("Holder identity not found")]
    HolderIdentityNotFound,

    #[msg("Unauthorized: Only admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Unauthorized: Only issuer can perform this action")]
    UnauthorizedIssuer,

    #[msg("Unauthorized: Only holder can perform this action")]
    UnauthorizedHolder,

    #[msg("Metadata URI too long")]
    MetadataURITooLong,

    #[msg("Revocation reason too long")]
    RevocationReasonTooLong,

    #[msg("Validity period exceeds maximum")]
    ValidityPeriodTooLong,

    #[msg("Arithmetic overflow")]
    Overflow,
}
