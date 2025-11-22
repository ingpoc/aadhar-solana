use anchor_lang::prelude::*;

pub mod state;
pub mod errors;

use state::*;
use errors::*;

declare_id!("FoZKx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhS");

#[program]
pub mod credential_manager {
    use super::*;

    /// Initialize the credential manager configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        identity_registry: Pubkey,
        default_validity_period: i64,
        max_validity_period: i64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.default_validity_period = default_validity_period;
        config.max_validity_period = max_validity_period;
        config.total_schemas = 0;
        config.total_credentials = 0;
        config.bump = ctx.bumps.config;

        msg!("Credential manager initialized");

        Ok(())
    }

    /// Create a new credential schema
    pub fn create_schema(
        ctx: Context<CreateSchema>,
        schema_id: [u8; 32],
        name: String,
        version: u16,
        required_issuer_verification: u8,
        transferable: bool,
        revocable: bool,
    ) -> Result<()> {
        require!(name.len() <= CredentialSchema::MAX_NAME_LEN, CredentialError::SchemaNameTooLong);

        let config = &mut ctx.accounts.config;
        let schema = &mut ctx.accounts.schema;
        let clock = Clock::get()?;

        schema.schema_id = schema_id;
        schema.name = name.clone();
        schema.version = version;
        schema.creator = ctx.accounts.creator.key();
        schema.required_issuer_verification = required_issuer_verification;
        schema.transferable = transferable;
        schema.revocable = revocable;
        schema.active = true;
        schema.created_at = clock.unix_timestamp;
        schema.bump = ctx.bumps.schema;

        config.total_schemas = config.total_schemas
            .checked_add(1)
            .ok_or(CredentialError::Overflow)?;

        msg!("Schema created: {} v{}", name, version);

        Ok(())
    }

    /// Register a credential issuer
    pub fn register_issuer(
        ctx: Context<RegisterIssuer>,
        name: String,
        verification_level: u8,
    ) -> Result<()> {
        require!(name.len() <= CredentialIssuer::MAX_NAME_LEN, CredentialError::SchemaNameTooLong);

        let issuer = &mut ctx.accounts.issuer;
        let clock = Clock::get()?;

        issuer.authority = ctx.accounts.authority.key();
        issuer.identity = ctx.accounts.identity.key();
        issuer.name = name.clone();
        issuer.verification_level = verification_level;
        issuer.credentials_issued = 0;
        issuer.credentials_revoked = 0;
        issuer.active = true;
        issuer.registered_at = clock.unix_timestamp;
        issuer.bump = ctx.bumps.issuer;

        msg!("Issuer registered: {}", name);

        Ok(())
    }

    /// Issue a credential to a holder
    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_id: [u8; 32],
        claims_hash: [u8; 32],
        validity_period: Option<i64>,
        metadata_uri: String,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let schema = &ctx.accounts.schema;
        let issuer = &mut ctx.accounts.issuer;
        let credential = &mut ctx.accounts.credential;
        let clock = Clock::get()?;

        // Validate
        require!(schema.active, CredentialError::SchemaNotActive);
        require!(issuer.active, CredentialError::IssuerNotActive);
        require!(
            issuer.verification_level >= schema.required_issuer_verification,
            CredentialError::InsufficientIssuerVerification
        );
        require!(
            metadata_uri.len() <= Credential::MAX_URI_LEN,
            CredentialError::MetadataURITooLong
        );

        // Calculate expiration
        let validity = validity_period.unwrap_or(config.default_validity_period);
        require!(validity <= config.max_validity_period, CredentialError::ValidityPeriodTooLong);

        let expires_at = if validity > 0 {
            clock.unix_timestamp.checked_add(validity).ok_or(CredentialError::Overflow)?
        } else {
            0 // Never expires
        };

        // Initialize credential
        credential.credential_id = credential_id;
        credential.schema = schema.key();
        credential.holder = ctx.accounts.holder.key();
        credential.issuer = issuer.authority;
        credential.claims_hash = claims_hash;
        credential.status = CredentialStatus::Active;
        credential.issued_at = clock.unix_timestamp;
        credential.expires_at = expires_at;
        credential.revoked_at = 0;
        credential.revocation_reason = None;
        credential.metadata_uri = metadata_uri;
        credential.bump = ctx.bumps.credential;

        // Update issuer stats
        issuer.credentials_issued = issuer.credentials_issued
            .checked_add(1)
            .ok_or(CredentialError::Overflow)?;

        // Update config stats
        let config = &mut ctx.accounts.config;
        config.total_credentials = config.total_credentials
            .checked_add(1)
            .ok_or(CredentialError::Overflow)?;

        msg!("Credential issued: {:?} to {}", credential_id, ctx.accounts.holder.key());

        Ok(())
    }

    /// Revoke a credential
    pub fn revoke_credential(
        ctx: Context<RevokeCredential>,
        reason: String,
    ) -> Result<()> {
        let schema = &ctx.accounts.schema;
        let issuer = &mut ctx.accounts.issuer;
        let credential = &mut ctx.accounts.credential;
        let clock = Clock::get()?;

        require!(schema.revocable, CredentialError::CredentialNotRevocable);
        require!(
            credential.status != CredentialStatus::Revoked,
            CredentialError::CredentialAlreadyRevoked
        );
        require!(
            reason.len() <= Credential::MAX_REASON_LEN,
            CredentialError::RevocationReasonTooLong
        );

        credential.status = CredentialStatus::Revoked;
        credential.revoked_at = clock.unix_timestamp;
        credential.revocation_reason = Some(reason.clone());

        issuer.credentials_revoked = issuer.credentials_revoked
            .checked_add(1)
            .ok_or(CredentialError::Overflow)?;

        msg!("Credential revoked: {:?} reason: {}", credential.credential_id, reason);

        Ok(())
    }

    /// Suspend a credential temporarily
    pub fn suspend_credential(ctx: Context<SuspendCredential>) -> Result<()> {
        let credential = &mut ctx.accounts.credential;

        require!(
            credential.status == CredentialStatus::Active,
            CredentialError::CredentialNotActive
        );

        credential.status = CredentialStatus::Suspended;

        msg!("Credential suspended: {:?}", credential.credential_id);

        Ok(())
    }

    /// Reactivate a suspended credential
    pub fn reactivate_credential(ctx: Context<ReactivateCredential>) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        let clock = Clock::get()?;

        require!(
            credential.status == CredentialStatus::Suspended,
            CredentialError::CredentialNotActive
        );

        // Check if expired while suspended
        if credential.expires_at > 0 && clock.unix_timestamp > credential.expires_at {
            credential.status = CredentialStatus::Expired;
            msg!("Credential has expired and cannot be reactivated");
            return Err(CredentialError::CredentialExpired.into());
        }

        credential.status = CredentialStatus::Active;

        msg!("Credential reactivated: {:?}", credential.credential_id);

        Ok(())
    }

    /// Transfer a credential to a new holder
    pub fn transfer_credential(ctx: Context<TransferCredential>) -> Result<()> {
        let schema = &ctx.accounts.schema;
        let credential = &mut ctx.accounts.credential;

        require!(schema.transferable, CredentialError::CredentialNotTransferable);
        require!(
            credential.status == CredentialStatus::Active,
            CredentialError::CredentialNotActive
        );

        let old_holder = credential.holder;
        credential.holder = ctx.accounts.new_holder.key();

        msg!("Credential transferred from {} to {}",
            old_holder, ctx.accounts.new_holder.key());

        Ok(())
    }

    /// Verify a credential is valid
    pub fn verify_credential(ctx: Context<VerifyCredential>) -> Result<()> {
        let credential = &ctx.accounts.credential;
        let clock = Clock::get()?;

        // Check status
        let is_valid = match credential.status {
            CredentialStatus::Active => {
                // Check expiration
                if credential.expires_at > 0 && clock.unix_timestamp > credential.expires_at {
                    false
                } else {
                    true
                }
            }
            _ => false,
        };

        msg!("Credential verification: valid={} status={:?} holder={}",
            is_valid, credential.status, credential.holder);

        Ok(())
    }

    /// Deactivate a schema (admin only)
    pub fn deactivate_schema(ctx: Context<DeactivateSchema>) -> Result<()> {
        ctx.accounts.schema.active = false;
        msg!("Schema deactivated: {}", ctx.accounts.schema.name);
        Ok(())
    }

    /// Deactivate an issuer (admin only)
    pub fn deactivate_issuer(ctx: Context<DeactivateIssuer>) -> Result<()> {
        ctx.accounts.issuer.active = false;
        msg!("Issuer deactivated: {}", ctx.accounts.issuer.name);
        Ok(())
    }

    /// Update configuration (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        default_validity_period: Option<i64>,
        max_validity_period: Option<i64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(v) = default_validity_period {
            config.default_validity_period = v;
        }
        if let Some(v) = max_validity_period {
            config.max_validity_period = v;
        }

        msg!("Credential config updated");

        Ok(())
    }
}

// ============== Account Contexts ==============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = CredentialConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(schema_id: [u8; 32])]
pub struct CreateSchema<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(
        init,
        payer = creator,
        space = CredentialSchema::LEN,
        seeds = [b"schema", schema_id.as_ref()],
        bump
    )]
    pub schema: Account<'info, CredentialSchema>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterIssuer<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, CredentialConfig>,

    #[account(
        init,
        payer = authority,
        space = CredentialIssuer::LEN,
        seeds = [b"issuer", authority.key().as_ref()],
        bump
    )]
    pub issuer: Account<'info, CredentialIssuer>,

    /// CHECK: Identity account of the issuer
    pub identity: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_id: [u8; 32])]
pub struct IssueCredential<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(
        seeds = [b"schema", schema.schema_id.as_ref()],
        bump = schema.bump
    )]
    pub schema: Account<'info, CredentialSchema>,

    #[account(
        mut,
        seeds = [b"issuer", authority.key().as_ref()],
        bump = issuer.bump,
        has_one = authority
    )]
    pub issuer: Account<'info, CredentialIssuer>,

    #[account(
        init,
        payer = authority,
        space = Credential::LEN,
        seeds = [b"credential", credential_id.as_ref()],
        bump
    )]
    pub credential: Account<'info, Credential>,

    /// CHECK: Holder's identity account
    pub holder: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCredential<'info> {
    #[account(
        seeds = [b"schema", schema.schema_id.as_ref()],
        bump = schema.bump
    )]
    pub schema: Account<'info, CredentialSchema>,

    #[account(
        mut,
        seeds = [b"issuer", authority.key().as_ref()],
        bump = issuer.bump,
        has_one = authority
    )]
    pub issuer: Account<'info, CredentialIssuer>,

    #[account(
        mut,
        seeds = [b"credential", credential.credential_id.as_ref()],
        bump = credential.bump,
        constraint = credential.issuer == issuer.authority
    )]
    pub credential: Account<'info, Credential>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SuspendCredential<'info> {
    #[account(
        seeds = [b"issuer", authority.key().as_ref()],
        bump = issuer.bump,
        has_one = authority
    )]
    pub issuer: Account<'info, CredentialIssuer>,

    #[account(
        mut,
        seeds = [b"credential", credential.credential_id.as_ref()],
        bump = credential.bump,
        constraint = credential.issuer == issuer.authority
    )]
    pub credential: Account<'info, Credential>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReactivateCredential<'info> {
    #[account(
        seeds = [b"issuer", authority.key().as_ref()],
        bump = issuer.bump,
        has_one = authority
    )]
    pub issuer: Account<'info, CredentialIssuer>,

    #[account(
        mut,
        seeds = [b"credential", credential.credential_id.as_ref()],
        bump = credential.bump,
        constraint = credential.issuer == issuer.authority
    )]
    pub credential: Account<'info, Credential>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferCredential<'info> {
    #[account(
        seeds = [b"schema", schema.schema_id.as_ref()],
        bump = schema.bump
    )]
    pub schema: Account<'info, CredentialSchema>,

    #[account(
        mut,
        seeds = [b"credential", credential.credential_id.as_ref()],
        bump = credential.bump,
        constraint = credential.holder == holder.key()
    )]
    pub credential: Account<'info, Credential>,

    /// Current holder must sign
    pub holder: Signer<'info>,

    /// CHECK: New holder's identity
    pub new_holder: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct VerifyCredential<'info> {
    #[account(
        seeds = [b"credential", credential.credential_id.as_ref()],
        bump = credential.bump
    )]
    pub credential: Account<'info, Credential>,

    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateSchema<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(
        mut,
        seeds = [b"schema", schema.schema_id.as_ref()],
        bump = schema.bump
    )]
    pub schema: Account<'info, CredentialSchema>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateIssuer<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(
        mut,
        seeds = [b"issuer", issuer.authority.as_ref()],
        bump = issuer.bump
    )]
    pub issuer: Account<'info, CredentialIssuer>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, CredentialConfig>,

    pub admin: Signer<'info>,
}
