use anchor_lang::prelude::*;

pub mod state;
pub mod errors;

use state::*;
use errors::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod identity_registry {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        verification_oracle: Pubkey,
        credential_manager: Pubkey,
        reputation_engine: Pubkey,
        staking_manager: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.verification_oracle = verification_oracle;
        config.credential_manager = credential_manager;
        config.reputation_engine = reputation_engine;
        config.staking_manager = staking_manager;
        config.min_stake_amount = 1_000_000_000; // 1 SOL
        config.verification_fee = 10_000_000; // 0.01 SOL
        Ok(())
    }

    pub fn create_identity(
        ctx: Context<CreateIdentity>,
        did: String,
        metadata_uri: String,
        recovery_keys: Vec<Pubkey>,
    ) -> Result<()> {
        require!(did.len() <= 128, errors::IdentityError::DIDTooLong);
        require!(metadata_uri.len() <= 256, errors::IdentityError::URITooLong);
        require!(recovery_keys.len() <= 5, errors::IdentityError::TooManyRecoveryKeys);

        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        identity.authority = ctx.accounts.authority.key();
        identity.did = did;
        identity.verification_bitmap = 0;
        identity.reputation_score = 500; // Base score
        identity.staked_amount = 0;
        identity.created_at = clock.unix_timestamp;
        identity.last_updated = clock.unix_timestamp;
        identity.metadata_uri = metadata_uri;
        identity.recovery_keys = recovery_keys;
        identity.bump = ctx.bumps.identity_account;

        Ok(())
    }

    pub fn update_verification_status(
        ctx: Context<UpdateVerificationStatus>,
        verification_type: u8,
        verified: bool,
    ) -> Result<()> {
        // Verify caller is the authorized oracle
        require!(
            ctx.accounts.oracle.key() == ctx.accounts.config.verification_oracle,
            errors::IdentityError::UnauthorizedOracle
        );
        require!(verification_type < 64, errors::IdentityError::InvalidVerificationType);

        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        if verified {
            identity.verification_bitmap |= 1 << verification_type;
        } else {
            identity.verification_bitmap &= !(1 << verification_type);
        }

        identity.last_updated = clock.unix_timestamp;

        msg!("Verification status updated: type={}, verified={}", verification_type, verified);

        Ok(())
    }

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        new_score: u64,
    ) -> Result<()> {
        // Verify caller is the authorized reputation engine
        require!(
            ctx.accounts.reputation_engine.key() == ctx.accounts.config.reputation_engine,
            errors::IdentityError::UnauthorizedReputationEngine
        );

        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        identity.reputation_score = new_score;
        identity.last_updated = clock.unix_timestamp;

        msg!("Reputation updated to {} for {}", new_score, identity.authority);

        Ok(())
    }

    /// Update staked amount (called by staking manager via CPI)
    pub fn update_staked_amount(
        ctx: Context<UpdateStakedAmount>,
        new_amount: u64,
    ) -> Result<()> {
        // Verify caller is the authorized staking manager
        require!(
            ctx.accounts.staking_manager.key() == ctx.accounts.config.staking_manager,
            errors::IdentityError::UnauthorizedStakingManager
        );

        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        identity.staked_amount = new_amount;
        identity.last_updated = clock.unix_timestamp;

        msg!("Staked amount updated to {} for {}", new_amount, identity.authority);

        Ok(())
    }

    pub fn add_recovery_key(
        ctx: Context<AddRecoveryKey>,
        recovery_key: Pubkey,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity_account;
        require!(
            identity.recovery_keys.len() < 5,
            errors::IdentityError::TooManyRecoveryKeys
        );

        identity.recovery_keys.push(recovery_key);
        identity.last_updated = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn recover_identity(
        ctx: Context<RecoverIdentity>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity_account;

        require!(
            identity.recovery_keys.contains(&ctx.accounts.recovery_signer.key()),
            errors::IdentityError::UnauthorizedRecovery
        );

        identity.authority = new_authority;
        identity.last_updated = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + GlobalConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateIdentity<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + IdentityAccount::LEN,
        seeds = [b"identity", authority.key().as_ref()],
        bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVerificationStatus<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity_account.authority.as_ref()],
        bump = identity_account.bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub oracle: Signer<'info>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity_account.authority.as_ref()],
        bump = identity_account.bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub reputation_engine: Signer<'info>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
pub struct AddRecoveryKey<'info> {
    #[account(
        mut,
        seeds = [b"identity", authority.key().as_ref()],
        bump = identity_account.bump,
        has_one = authority
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecoverIdentity<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity_account.authority.as_ref()],
        bump = identity_account.bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub recovery_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateStakedAmount<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity_account.authority.as_ref()],
        bump = identity_account.bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub staking_manager: Signer<'info>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, GlobalConfig>,
}
