use anchor_lang::prelude::*;

declare_id!("FoZKx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhS");

pub mod state;
pub mod errors;

use state::*;

#[program]
pub mod credential_manager {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        identity_registry: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.credential_count = 0;
        config.revocation_count = 0;
        Ok(())
    }

    pub fn register_issuer(
        ctx: Context<RegisterIssuer>,
        issuer_pubkey: Pubkey,
        issuer_name: String,
        issuer_did: String,
    ) -> Result<()> {
        require!(issuer_name.len() <= 64, errors::CredentialError::IssuerNameTooLong);
        require!(issuer_did.len() <= 128, errors::CredentialError::DIDTooLong);

        let issuer = &mut ctx.accounts.issuer_registry;
        let clock = Clock::get()?;

        issuer.pubkey = issuer_pubkey;
        issuer.name = issuer_name.clone();
        issuer.did = issuer_did;
        issuer.registered_at = clock.unix_timestamp;
        issuer.revoked = false;
        issuer.credentials_issued = 0;
        issuer.bump = ctx.bumps.issuer_registry;

        emit!(IssuerRegistered {
            issuer: issuer_pubkey,
            name: issuer_name,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn revoke_issuer(
        ctx: Context<RevokeIssuer>,
    ) -> Result<()> {
        let issuer = &mut ctx.accounts.issuer_registry;
        issuer.revoked = true;

        emit!(IssuerRevoked {
            issuer: issuer.pubkey,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        holder: Pubkey,
        credential_type: String,
        metadata_uri: String,
        proof_uri: String,
        expires_at: i64,
    ) -> Result<()> {
        require!(credential_type.len() <= 32, errors::CredentialError::CredentialTypeTooLong);
        require!(metadata_uri.len() <= 256, errors::CredentialError::URITooLong);
        require!(proof_uri.len() <= 256, errors::CredentialError::URITooLong);

        let clock = Clock::get()?;
        require!(expires_at > clock.unix_timestamp, errors::CredentialError::InvalidExpiryDate);

        let credential = &mut ctx.accounts.credential;
        let issuer = &mut ctx.accounts.issuer_registry;

        require!(!issuer.revoked, errors::CredentialError::IssuerRevoked);

        credential.issuer = issuer.pubkey;
        credential.holder = holder;
        credential.credential_type = credential_type.clone();
        credential.metadata_uri = metadata_uri;
        credential.proof_uri = proof_uri;
        credential.issued_at = clock.unix_timestamp;
        credential.expires_at = expires_at;
        credential.revoked = false;
        credential.revoked_at = 0;
        credential.bump = ctx.bumps.credential;

        issuer.credentials_issued = issuer.credentials_issued.checked_add(1).unwrap();

        let config = &mut ctx.accounts.config;
        config.credential_count = config.credential_count.checked_add(1).unwrap();

        emit!(CredentialIssued {
            credential_account: ctx.accounts.credential.key(),
            issuer: issuer.pubkey,
            holder,
            credential_type,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn revoke_credential(
        ctx: Context<RevokeCredential>,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 256, errors::CredentialError::ReasonTooLong);

        let clock = Clock::get()?;
        let credential_key = ctx.accounts.credential.key();

        let credential = &mut ctx.accounts.credential;
        require!(!credential.revoked, errors::CredentialError::CredentialAlreadyRevoked);

        let issuer = credential.issuer;
        let holder = credential.holder;

        credential.revoked = true;
        credential.revoked_at = clock.unix_timestamp;

        let config = &mut ctx.accounts.config;
        config.revocation_count = config.revocation_count.checked_add(1).unwrap();

        emit!(CredentialRevoked {
            credential_account: credential_key,
            issuer,
            holder,
            reason,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn verify_credential(
        ctx: Context<VerifyCredential>,
    ) -> Result<bool> {
        let credential = &ctx.accounts.credential;
        let issuer = &ctx.accounts.issuer_registry;
        let clock = Clock::get()?;

        require!(!issuer.revoked, errors::CredentialError::IssuerRevoked);

        let is_valid = !credential.revoked
            && clock.unix_timestamp < credential.expires_at;

        emit!(CredentialVerified {
            credential_account: ctx.accounts.credential.key(),
            verifier: ctx.accounts.verifier.key(),
            is_valid,
            timestamp: clock.unix_timestamp,
        });

        Ok(is_valid)
    }

    pub fn update_credential_metadata(
        ctx: Context<UpdateCredentialMetadata>,
        new_metadata_uri: String,
        new_proof_uri: String,
    ) -> Result<()> {
        require!(new_metadata_uri.len() <= 256, errors::CredentialError::URITooLong);
        require!(new_proof_uri.len() <= 256, errors::CredentialError::URITooLong);

        let credential = &mut ctx.accounts.credential;

        require!(!credential.revoked, errors::CredentialError::CredentialAlreadyRevoked);

        credential.metadata_uri = new_metadata_uri;
        credential.proof_uri = new_proof_uri;

        emit!(CredentialMetadataUpdated {
            credential_account: ctx.accounts.credential.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn transfer_credential(
        ctx: Context<TransferCredential>,
        new_holder: Pubkey,
    ) -> Result<()> {
        let credential = &mut ctx.accounts.credential;

        require!(!credential.revoked, errors::CredentialError::CredentialAlreadyRevoked);

        let old_holder = credential.holder;
        credential.holder = new_holder;

        emit!(CredentialTransferred {
            credential_account: ctx.accounts.credential.key(),
            old_holder,
            new_holder,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + CredentialConfig::LEN,
        seeds = [b"credential_config"],
        bump
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(issuer_pubkey: Pubkey)]
pub struct RegisterIssuer<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + IssuerRegistry::LEN,
        seeds = [b"issuer", issuer_pubkey.as_ref()],
        bump
    )]
    pub issuer_registry: Account<'info, IssuerRegistry>,

    #[account(
        seeds = [b"credential_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, CredentialConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeIssuer<'info> {
    #[account(
        mut,
        seeds = [b"issuer", issuer_registry.pubkey.as_ref()],
        bump = issuer_registry.bump
    )]
    pub issuer_registry: Account<'info, IssuerRegistry>,

    #[account(
        seeds = [b"credential_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, CredentialConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(holder: Pubkey, credential_type: String)]
pub struct IssueCredential<'info> {
    #[account(
        init,
        payer = issuer_authority,
        space = 8 + Credential::LEN,
        seeds = [b"credential", holder.as_ref(), credential_type.as_bytes()],
        bump
    )]
    pub credential: Account<'info, Credential>,

    #[account(
        mut,
        seeds = [b"issuer", issuer_registry.pubkey.as_ref()],
        bump = issuer_registry.bump,
        constraint = issuer_authority.key() == issuer_registry.pubkey @ errors::CredentialError::UnauthorizedIssuer
    )]
    pub issuer_registry: Account<'info, IssuerRegistry>,

    #[account(mut)]
    pub issuer_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credential_config"],
        bump
    )]
    pub config: Account<'info, CredentialConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCredential<'info> {
    #[account(
        mut,
        seeds = [b"credential", credential.holder.as_ref(), credential.credential_type.as_bytes()],
        bump = credential.bump,
        constraint = issuer_authority.key() == credential.issuer @ errors::CredentialError::UnauthorizedIssuer
    )]
    pub credential: Account<'info, Credential>,

    pub issuer_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"credential_config"],
        bump
    )]
    pub config: Account<'info, CredentialConfig>,
}

#[derive(Accounts)]
pub struct VerifyCredential<'info> {
    #[account(
        seeds = [b"credential", credential.holder.as_ref(), credential.credential_type.as_bytes()],
        bump = credential.bump
    )]
    pub credential: Account<'info, Credential>,

    #[account(
        seeds = [b"issuer", issuer_registry.pubkey.as_ref()],
        bump = issuer_registry.bump
    )]
    pub issuer_registry: Account<'info, IssuerRegistry>,

    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateCredentialMetadata<'info> {
    #[account(
        mut,
        seeds = [b"credential", credential.holder.as_ref(), credential.credential_type.as_bytes()],
        bump = credential.bump,
        constraint = issuer_authority.key() == credential.issuer @ errors::CredentialError::UnauthorizedIssuer
    )]
    pub credential: Account<'info, Credential>,

    pub issuer_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferCredential<'info> {
    #[account(
        mut,
        seeds = [b"credential", credential.holder.as_ref(), credential.credential_type.as_bytes()],
        bump = credential.bump,
        constraint = current_holder.key() == credential.holder @ errors::CredentialError::UnauthorizedHolder
    )]
    pub credential: Account<'info, Credential>,

    pub current_holder: Signer<'info>,
}

#[event]
pub struct IssuerRegistered {
    pub issuer: Pubkey,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct IssuerRevoked {
    pub issuer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CredentialIssued {
    pub credential_account: Pubkey,
    pub issuer: Pubkey,
    pub holder: Pubkey,
    pub credential_type: String,
    pub timestamp: i64,
}

#[event]
pub struct CredentialRevoked {
    pub credential_account: Pubkey,
    pub issuer: Pubkey,
    pub holder: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct CredentialVerified {
    pub credential_account: Pubkey,
    pub verifier: Pubkey,
    pub is_valid: bool,
    pub timestamp: i64,
}

#[event]
pub struct CredentialMetadataUpdated {
    pub credential_account: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CredentialTransferred {
    pub credential_account: Pubkey,
    pub old_holder: Pubkey,
    pub new_holder: Pubkey,
    pub timestamp: i64,
}
