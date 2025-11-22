use anchor_lang::prelude::*;

/// Global configuration for the credential manager
#[account]
pub struct CredentialConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Identity registry program for verification
    pub identity_registry: Pubkey,
    /// Default credential validity period (in seconds)
    pub default_validity_period: i64,
    /// Maximum credential validity period (in seconds)
    pub max_validity_period: i64,
    /// Total schemas created
    pub total_schemas: u64,
    /// Total credentials issued
    pub total_credentials: u64,
    /// Bump seed
    pub bump: u8,
}

impl CredentialConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // identity_registry
        8 +  // default_validity_period
        8 +  // max_validity_period
        8 +  // total_schemas
        8 +  // total_credentials
        1;   // bump
}

/// Credential schema definition
#[account]
pub struct CredentialSchema {
    /// Unique schema ID
    pub schema_id: [u8; 32],
    /// Schema name (e.g., "AadhaarVerification", "EducationalDegree")
    pub name: String,
    /// Schema version
    pub version: u16,
    /// Issuer who created the schema
    pub creator: Pubkey,
    /// Required verification level for issuers
    pub required_issuer_verification: u8,
    /// Whether credentials of this type are transferable
    pub transferable: bool,
    /// Whether credentials of this type can be revoked
    pub revocable: bool,
    /// Schema is active
    pub active: bool,
    /// Created timestamp
    pub created_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl CredentialSchema {
    pub const MAX_NAME_LEN: usize = 64;
    pub const LEN: usize = 8 + // discriminator
        32 + // schema_id
        4 + Self::MAX_NAME_LEN + // name (String)
        2 +  // version
        32 + // creator
        1 +  // required_issuer_verification
        1 +  // transferable
        1 +  // revocable
        1 +  // active
        8 +  // created_at
        1;   // bump
}

/// Registered credential issuer
#[account]
pub struct CredentialIssuer {
    /// Issuer's authority
    pub authority: Pubkey,
    /// Issuer's identity account
    pub identity: Pubkey,
    /// Issuer name/organization
    pub name: String,
    /// Issuer verification level (higher = more trusted)
    pub verification_level: u8,
    /// Total credentials issued
    pub credentials_issued: u64,
    /// Total credentials revoked
    pub credentials_revoked: u64,
    /// Issuer is active
    pub active: bool,
    /// Registered timestamp
    pub registered_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl CredentialIssuer {
    pub const MAX_NAME_LEN: usize = 64;
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // identity
        4 + Self::MAX_NAME_LEN + // name
        1 +  // verification_level
        8 +  // credentials_issued
        8 +  // credentials_revoked
        1 +  // active
        8 +  // registered_at
        1;   // bump
}

/// Verifiable credential
#[account]
pub struct Credential {
    /// Unique credential ID
    pub credential_id: [u8; 32],
    /// Schema this credential follows
    pub schema: Pubkey,
    /// Holder's identity
    pub holder: Pubkey,
    /// Issuer who issued the credential
    pub issuer: Pubkey,
    /// Hash of the claims data (stored off-chain)
    pub claims_hash: [u8; 32],
    /// Credential status
    pub status: CredentialStatus,
    /// Issued timestamp
    pub issued_at: i64,
    /// Expiration timestamp (0 = never expires)
    pub expires_at: i64,
    /// Revoked timestamp (0 = not revoked)
    pub revoked_at: i64,
    /// Revocation reason (if revoked)
    pub revocation_reason: Option<String>,
    /// Metadata URI for off-chain data
    pub metadata_uri: String,
    /// Bump seed
    pub bump: u8,
}

impl Credential {
    pub const MAX_URI_LEN: usize = 256;
    pub const MAX_REASON_LEN: usize = 128;
    pub const LEN: usize = 8 + // discriminator
        32 + // credential_id
        32 + // schema
        32 + // holder
        32 + // issuer
        32 + // claims_hash
        1 +  // status
        8 +  // issued_at
        8 +  // expires_at
        8 +  // revoked_at
        1 + 4 + Self::MAX_REASON_LEN + // revocation_reason (Option<String>)
        4 + Self::MAX_URI_LEN + // metadata_uri
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CredentialStatus {
    Active,
    Suspended,
    Revoked,
    Expired,
}

impl Default for CredentialStatus {
    fn default() -> Self {
        CredentialStatus::Active
    }
}

/// Credential type constants
pub mod credential_types {
    pub const AADHAAR_VERIFICATION: &str = "AadhaarVerification";
    pub const PAN_VERIFICATION: &str = "PANVerification";
    pub const EDUCATIONAL_DEGREE: &str = "EducationalDegree";
    pub const EMPLOYMENT_PROOF: &str = "EmploymentProof";
    pub const BANK_ACCOUNT: &str = "BankAccountVerification";
    pub const ADDRESS_PROOF: &str = "AddressProof";
}
