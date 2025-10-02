use anchor_lang::prelude::*;

declare_id!("FJzG8XuVKmNdHpHqkdg7tMxUNNHZLLqaWBNgWz6bPsxZ");

pub mod state;
pub mod errors;

use state::*;

#[program]
pub mod verification_oracle {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        identity_registry: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.verification_count = 0;
        config.oracle_authority = ctx.accounts.admin.key();
        Ok(())
    }

    pub fn update_oracle_authority(
        ctx: Context<UpdateOracleAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.oracle_authority = new_authority;
        Ok(())
    }

    pub fn submit_verification_proof(
        ctx: Context<SubmitVerificationProof>,
        identity_pubkey: Pubkey,
        verification_type: u8,
        proof_hash: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(proof_hash.len() == 64, errors::OracleError::InvalidProofHash);
        require!(metadata_uri.len() <= 256, errors::OracleError::URITooLong);
        require!(verification_type < 64, errors::OracleError::InvalidVerificationType);

        let proof = &mut ctx.accounts.verification_proof;
        let clock = Clock::get()?;

        proof.identity = identity_pubkey;
        proof.verification_type = verification_type;
        proof.proof_hash = proof_hash;
        proof.metadata_uri = metadata_uri;
        proof.oracle_authority = ctx.accounts.oracle_authority.key();
        proof.submitted_at = clock.unix_timestamp;
        proof.verified_at = 0;
        proof.expires_at = clock.unix_timestamp + (365 * 24 * 60 * 60); // 1 year
        proof.status = ProofStatus::Pending as u8;
        proof.bump = ctx.bumps.verification_proof;

        let config = &mut ctx.accounts.config;
        config.verification_count = config.verification_count.checked_add(1).unwrap();

        emit!(VerificationProofSubmitted {
            proof_account: ctx.accounts.verification_proof.key(),
            identity: identity_pubkey,
            verification_type,
            oracle: ctx.accounts.oracle_authority.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn verify_proof(
        ctx: Context<VerifyProof>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let proof_account = ctx.accounts.verification_proof.key();

        let proof = &mut ctx.accounts.verification_proof;

        require!(
            proof.status == ProofStatus::Pending as u8,
            errors::OracleError::ProofAlreadyProcessed
        );
        require!(
            clock.unix_timestamp < proof.expires_at,
            errors::OracleError::ProofExpired
        );

        let identity = proof.identity;
        let verification_type = proof.verification_type;

        proof.status = ProofStatus::Verified as u8;
        proof.verified_at = clock.unix_timestamp;

        emit!(VerificationProofVerified {
            proof_account,
            identity,
            verification_type,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn reject_proof(
        ctx: Context<RejectProof>,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 256, errors::OracleError::ReasonTooLong);

        let clock = Clock::get()?;
        let proof_account = ctx.accounts.verification_proof.key();

        let proof = &mut ctx.accounts.verification_proof;

        require!(
            proof.status == ProofStatus::Pending as u8,
            errors::OracleError::ProofAlreadyProcessed
        );

        let identity = proof.identity;
        let verification_type = proof.verification_type;

        proof.status = ProofStatus::Rejected as u8;
        proof.verified_at = clock.unix_timestamp;

        emit!(VerificationProofRejected {
            proof_account,
            identity,
            verification_type,
            reason,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn revoke_verification(
        ctx: Context<RevokeVerification>,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 256, errors::OracleError::ReasonTooLong);

        let clock = Clock::get()?;
        let proof_account = ctx.accounts.verification_proof.key();

        let proof = &mut ctx.accounts.verification_proof;

        require!(
            proof.status == ProofStatus::Verified as u8,
            errors::OracleError::CannotRevokeUnverifiedProof
        );

        let identity = proof.identity;
        let verification_type = proof.verification_type;

        proof.status = ProofStatus::Revoked as u8;

        emit!(VerificationRevoked {
            proof_account,
            identity,
            verification_type,
            reason,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_identity_verification(
        ctx: Context<UpdateIdentityVerification>,
        verified: bool,
    ) -> Result<()> {
        let proof = &ctx.accounts.verification_proof;

        require!(
            proof.status == ProofStatus::Verified as u8 || proof.status == ProofStatus::Revoked as u8,
            errors::OracleError::ProofNotProcessed
        );

        let cpi_program = ctx.accounts.identity_registry_program.to_account_info();
        let cpi_accounts = identity_registry::cpi::accounts::UpdateVerificationStatus {
            identity_account: ctx.accounts.identity_account.to_account_info(),
            oracle: ctx.accounts.oracle_authority.to_account_info(),
            config: ctx.accounts.identity_config.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        identity_registry::cpi::update_verification_status(
            cpi_ctx,
            proof.verification_type,
            verified,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + OracleConfig::LEN,
        seeds = [b"oracle_config"],
        bump
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateOracleAuthority<'info> {
    #[account(
        mut,
        seeds = [b"oracle_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, OracleConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(identity_pubkey: Pubkey, verification_type: u8)]
pub struct SubmitVerificationProof<'info> {
    #[account(
        init,
        payer = oracle_authority,
        space = 8 + VerificationProof::LEN,
        seeds = [b"verification_proof", identity_pubkey.as_ref(), &[verification_type]],
        bump
    )]
    pub verification_proof: Account<'info, VerificationProof>,

    #[account(
        mut,
        seeds = [b"oracle_config"],
        bump,
        constraint = oracle_authority.key() == config.oracle_authority @ errors::OracleError::UnauthorizedOracle
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(mut)]
    pub oracle_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyProof<'info> {
    #[account(
        mut,
        seeds = [b"verification_proof", verification_proof.identity.as_ref(), &[verification_proof.verification_type]],
        bump = verification_proof.bump
    )]
    pub verification_proof: Account<'info, VerificationProof>,

    #[account(
        seeds = [b"oracle_config"],
        bump,
        constraint = oracle_authority.key() == config.oracle_authority @ errors::OracleError::UnauthorizedOracle
    )]
    pub config: Account<'info, OracleConfig>,

    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RejectProof<'info> {
    #[account(
        mut,
        seeds = [b"verification_proof", verification_proof.identity.as_ref(), &[verification_proof.verification_type]],
        bump = verification_proof.bump
    )]
    pub verification_proof: Account<'info, VerificationProof>,

    #[account(
        seeds = [b"oracle_config"],
        bump,
        constraint = oracle_authority.key() == config.oracle_authority @ errors::OracleError::UnauthorizedOracle
    )]
    pub config: Account<'info, OracleConfig>,

    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeVerification<'info> {
    #[account(
        mut,
        seeds = [b"verification_proof", verification_proof.identity.as_ref(), &[verification_proof.verification_type]],
        bump = verification_proof.bump
    )]
    pub verification_proof: Account<'info, VerificationProof>,

    #[account(
        seeds = [b"oracle_config"],
        bump,
        constraint = oracle_authority.key() == config.oracle_authority @ errors::OracleError::UnauthorizedOracle
    )]
    pub config: Account<'info, OracleConfig>,

    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateIdentityVerification<'info> {
    #[account(
        seeds = [b"verification_proof", verification_proof.identity.as_ref(), &[verification_proof.verification_type]],
        bump = verification_proof.bump
    )]
    pub verification_proof: Account<'info, VerificationProof>,

    #[account(mut)]
    /// CHECK: This is the identity account in the identity_registry program
    pub identity_account: UncheckedAccount<'info>,

    /// CHECK: This is the config account in the identity_registry program
    pub identity_config: UncheckedAccount<'info>,

    #[account(
        seeds = [b"oracle_config"],
        bump,
        constraint = oracle_authority.key() == config.oracle_authority @ errors::OracleError::UnauthorizedOracle
    )]
    pub config: Account<'info, OracleConfig>,

    pub oracle_authority: Signer<'info>,

    pub identity_registry_program: Program<'info, identity_registry::program::IdentityRegistry>,
}

#[event]
pub struct VerificationProofSubmitted {
    pub proof_account: Pubkey,
    pub identity: Pubkey,
    pub verification_type: u8,
    pub oracle: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VerificationProofVerified {
    pub proof_account: Pubkey,
    pub identity: Pubkey,
    pub verification_type: u8,
    pub timestamp: i64,
}

#[event]
pub struct VerificationProofRejected {
    pub proof_account: Pubkey,
    pub identity: Pubkey,
    pub verification_type: u8,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct VerificationRevoked {
    pub proof_account: Pubkey,
    pub identity: Pubkey,
    pub verification_type: u8,
    pub reason: String,
    pub timestamp: i64,
}
