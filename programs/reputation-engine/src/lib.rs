use anchor_lang::prelude::*;

declare_id!("27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH");

pub mod state;
pub mod errors;

use state::*;

#[program]
pub mod reputation_engine {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        identity_registry: Pubkey,
        base_score: u64,
        decay_rate: u64,
        verification_bonus: u64,
        credential_bonus: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.base_score = base_score;
        config.decay_rate = decay_rate;
        config.verification_bonus = verification_bonus;
        config.credential_bonus = credential_bonus;
        config.total_scores_calculated = 0;
        Ok(())
    }

    pub fn initialize_reputation(
        ctx: Context<InitializeReputation>,
        identity_pubkey: Pubkey,
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        reputation.identity = identity_pubkey;
        reputation.score = config.base_score;
        reputation.last_updated = clock.unix_timestamp;
        reputation.verification_count = 0;
        reputation.credential_count = 0;
        reputation.activity_count = 0;
        reputation.challenges_received = 0;
        reputation.challenges_won = 0;
        reputation.bump = ctx.bumps.reputation_account;

        emit!(ReputationInitialized {
            identity: identity_pubkey,
            initial_score: config.base_score,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn record_verification(
        ctx: Context<RecordVerification>,
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        apply_time_decay(reputation, &config, clock.unix_timestamp)?;

        reputation.verification_count = reputation.verification_count.checked_add(1).unwrap();
        reputation.score = reputation.score.checked_add(config.verification_bonus).unwrap_or(u64::MAX);
        reputation.last_updated = clock.unix_timestamp;

        emit!(VerificationRecorded {
            identity: reputation.identity,
            new_score: reputation.score,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn record_credential(
        ctx: Context<RecordCredential>,
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        apply_time_decay(reputation, &config, clock.unix_timestamp)?;

        reputation.credential_count = reputation.credential_count.checked_add(1).unwrap();
        reputation.score = reputation.score.checked_add(config.credential_bonus).unwrap_or(u64::MAX);
        reputation.last_updated = clock.unix_timestamp;

        emit!(CredentialRecorded {
            identity: reputation.identity,
            new_score: reputation.score,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn record_activity(
        ctx: Context<RecordActivity>,
        activity_type: u8,
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        apply_time_decay(reputation, &config, clock.unix_timestamp)?;

        reputation.activity_count = reputation.activity_count.checked_add(1).unwrap();

        let activity_bonus = match activity_type {
            0 => 10,  // Login
            1 => 25,  // Profile update
            2 => 50,  // Transaction
            _ => 5,   // Other
        };

        reputation.score = reputation.score.checked_add(activity_bonus).unwrap_or(u64::MAX);
        reputation.last_updated = clock.unix_timestamp;

        emit!(ActivityRecorded {
            identity: reputation.identity,
            activity_type,
            new_score: reputation.score,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn challenge_reputation(
        ctx: Context<ChallengeReputation>,
        reason: String,
        evidence_uri: String,
    ) -> Result<()> {
        require!(reason.len() <= 256, errors::ReputationError::ReasonTooLong);
        require!(evidence_uri.len() <= 256, errors::ReputationError::URITooLong);

        let reputation = &mut ctx.accounts.reputation_account;
        let clock = Clock::get()?;

        reputation.challenges_received = reputation.challenges_received.checked_add(1).unwrap();

        emit!(ReputationChallenged {
            identity: reputation.identity,
            challenger: ctx.accounts.challenger.key(),
            reason,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn resolve_challenge(
        ctx: Context<ResolveChallenge>,
        challenge_won: bool,
        penalty: u64,
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation_account;
        let clock = Clock::get()?;

        if challenge_won {
            reputation.challenges_won = reputation.challenges_won.checked_add(1).unwrap();
        } else {
            reputation.score = reputation.score.saturating_sub(penalty);
        }

        reputation.last_updated = clock.unix_timestamp;

        emit!(ChallengeResolved {
            identity: reputation.identity,
            won: challenge_won,
            new_score: reputation.score,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_identity_reputation(
        ctx: Context<UpdateIdentityReputation>,
    ) -> Result<()> {
        let reputation = &ctx.accounts.reputation_account;
        let config = &mut ctx.accounts.config;

        let cpi_program = ctx.accounts.identity_registry_program.to_account_info();
        let cpi_accounts = identity_registry::cpi::accounts::UpdateReputation {
            identity_account: ctx.accounts.identity_account.to_account_info(),
            reputation_engine: ctx.accounts.engine_authority.to_account_info(),
            config: ctx.accounts.identity_config.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        identity_registry::cpi::update_reputation(cpi_ctx, reputation.score)?;

        config.total_scores_calculated = config.total_scores_calculated.checked_add(1).unwrap();

        Ok(())
    }
}

fn apply_time_decay(reputation: &mut ReputationAccount, config: &ReputationConfig, current_time: i64) -> Result<()> {
    let time_elapsed = current_time - reputation.last_updated;

    if time_elapsed > 0 {
        let decay_periods = (time_elapsed / (30 * 24 * 60 * 60)) as u64; // Monthly decay
        if decay_periods > 0 {
            let decay_amount = config.decay_rate.checked_mul(decay_periods).unwrap_or(reputation.score);
            reputation.score = reputation.score.saturating_sub(decay_amount);
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ReputationConfig::LEN,
        seeds = [b"reputation_config"],
        bump
    )]
    pub config: Account<'info, ReputationConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(identity_pubkey: Pubkey)]
pub struct InitializeReputation<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ReputationAccount::LEN,
        seeds = [b"reputation", identity_pubkey.as_ref()],
        bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    #[account(
        seeds = [b"reputation_config"],
        bump
    )]
    pub config: Account<'info, ReputationConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordVerification<'info> {
    #[account(
        mut,
        seeds = [b"reputation", reputation_account.identity.as_ref()],
        bump = reputation_account.bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    #[account(
        seeds = [b"reputation_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, ReputationConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordCredential<'info> {
    #[account(
        mut,
        seeds = [b"reputation", reputation_account.identity.as_ref()],
        bump = reputation_account.bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    #[account(
        seeds = [b"reputation_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, ReputationConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordActivity<'info> {
    #[account(
        mut,
        seeds = [b"reputation", reputation_account.identity.as_ref()],
        bump = reputation_account.bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    #[account(
        seeds = [b"reputation_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, ReputationConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ChallengeReputation<'info> {
    #[account(
        mut,
        seeds = [b"reputation", reputation_account.identity.as_ref()],
        bump = reputation_account.bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    pub challenger: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    #[account(
        mut,
        seeds = [b"reputation", reputation_account.identity.as_ref()],
        bump = reputation_account.bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    #[account(
        seeds = [b"reputation_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, ReputationConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateIdentityReputation<'info> {
    #[account(
        seeds = [b"reputation", reputation_account.identity.as_ref()],
        bump = reputation_account.bump
    )]
    pub reputation_account: Account<'info, ReputationAccount>,

    #[account(mut)]
    /// CHECK: This is the identity account in the identity_registry program
    pub identity_account: UncheckedAccount<'info>,

    /// CHECK: This is the config account in the identity_registry program
    pub identity_config: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"reputation_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, ReputationConfig>,

    #[account(constraint = engine_authority.key() == config.admin @ errors::ReputationError::UnauthorizedEngine)]
    pub engine_authority: Signer<'info>,

    pub admin: Signer<'info>,

    pub identity_registry_program: Program<'info, identity_registry::program::IdentityRegistry>,
}

#[event]
pub struct ReputationInitialized {
    pub identity: Pubkey,
    pub initial_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct VerificationRecorded {
    pub identity: Pubkey,
    pub new_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct CredentialRecorded {
    pub identity: Pubkey,
    pub new_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct ActivityRecorded {
    pub identity: Pubkey,
    pub activity_type: u8,
    pub new_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct ReputationChallenged {
    pub identity: Pubkey,
    pub challenger: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct ChallengeResolved {
    pub identity: Pubkey,
    pub won: bool,
    pub new_score: u64,
    pub timestamp: i64,
}
