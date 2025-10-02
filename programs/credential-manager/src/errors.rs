use anchor_lang::prelude::*;

#[error_code]
pub enum CredentialError {
    #[msg("Issuer name exceeds maximum length of 64 characters")]
    IssuerNameTooLong,

    #[msg("DID exceeds maximum length of 128 characters")]
    DIDTooLong,

    #[msg("Credential type exceeds maximum length of 32 characters")]
    CredentialTypeTooLong,

    #[msg("URI exceeds maximum length of 256 characters")]
    URITooLong,

    #[msg("Invalid expiry date - must be in the future")]
    InvalidExpiryDate,

    #[msg("Issuer has been revoked")]
    IssuerRevoked,

    #[msg("Unauthorized issuer - signer does not match credential issuer")]
    UnauthorizedIssuer,

    #[msg("Credential has already been revoked")]
    CredentialAlreadyRevoked,

    #[msg("Reason exceeds maximum length of 256 characters")]
    ReasonTooLong,

    #[msg("Unauthorized holder - signer does not match credential holder")]
    UnauthorizedHolder,
}
