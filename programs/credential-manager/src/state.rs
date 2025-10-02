use anchor_lang::prelude::*;

#[account]
pub struct CredentialConfig {
    pub admin: Pubkey,                  // 32
    pub identity_registry: Pubkey,      // 32
    pub credential_count: u64,          // 8
    pub revocation_count: u64,          // 8
}

impl CredentialConfig {
    pub const LEN: usize = 32 + 32 + 8 + 8;
}

#[account]
pub struct IssuerRegistry {
    pub pubkey: Pubkey,                 // 32
    pub name: String,                   // 4 + 64
    pub did: String,                    // 4 + 128
    pub registered_at: i64,             // 8
    pub revoked: bool,                  // 1
    pub credentials_issued: u64,        // 8
    pub bump: u8,                       // 1
}

impl IssuerRegistry {
    pub const LEN: usize = 32 + 68 + 132 + 8 + 1 + 8 + 1;
}

#[account]
pub struct Credential {
    pub issuer: Pubkey,                 // 32
    pub holder: Pubkey,                 // 32
    pub credential_type: String,        // 4 + 32
    pub metadata_uri: String,           // 4 + 256
    pub proof_uri: String,              // 4 + 256
    pub issued_at: i64,                 // 8
    pub expires_at: i64,                // 8
    pub revoked: bool,                  // 1
    pub revoked_at: i64,                // 8
    pub bump: u8,                       // 1
}

impl Credential {
    pub const LEN: usize = 32 + 32 + 36 + 260 + 260 + 8 + 8 + 1 + 8 + 1;
}
