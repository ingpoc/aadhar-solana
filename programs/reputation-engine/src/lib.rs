use anchor_lang::prelude::*;

pub mod state;
pub mod errors;

use state::*;
use errors::*;

declare_id!("FpRDg4wqEHkzVMQvYtNzCXvXqNqSxqwKLjPzxYpGhSmQ");

#[program]
pub mod reputation_engine {
    use super::*;

    /// Initialize the reputation engine configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        identity_registry: Pubkey,
        base_score: u64,
        max_score: u64,
        min_score: u64,
        decay_rate_bps: u16,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.base_score = base_score;
        config.max_score = max_score;
        config.min_score = min_score;
        config.decay_rate_bps = decay_rate_bps;
        config.last_decay_run = clock.unix_timestamp;
        config.bump = ctx.bumps.config;

        msg!("Reputation engine initialized with base_score: {}", base_score);

        Ok(())
    }

    /// Initialize reputation score for an identity
    pub fn initialize_score(ctx: Context<InitializeScore>) -> Result<()> {
        let config = &ctx.accounts.config;
        let score = &mut ctx.accounts.reputation_score;
        let clock = Clock::get()?;

        score.identity = ctx.accounts.identity.key();
        score.score = config.base_score;
        score.tier = ReputationTier::from_score(config.base_score);
        score.positive_events = 0;
        score.negative_events = 0;
        score.total_points_earned = 0;
        score.total_points_lost = 0;
        score.last_event = clock.unix_timestamp;
        score.created_at = clock.unix_timestamp;
        score.bump = ctx.bumps.reputation_score;

        msg!("Reputation score initialized for {} with base score {}",
            ctx.accounts.identity.key(), config.base_score);

        Ok(())
    }

    /// Record a reputation event
    pub fn record_event(
        ctx: Context<RecordEvent>,
        event_type: EventType,
        custom_points: Option<i32>,
        metadata: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let score = &mut ctx.accounts.reputation_score;
        let event = &mut ctx.accounts.reputation_event;
        let clock = Clock::get()?;

        // Get points (use custom or default)
        let points = custom_points.unwrap_or_else(|| get_default_points(&event_type));

        // Store score before update
        let score_before = score.score;

        // Calculate new score
        let new_score = if points >= 0 {
            let add_points = points as u64;
            score.score.saturating_add(add_points).min(config.max_score)
        } else {
            let sub_points = (-points) as u64;
            score.score.saturating_sub(sub_points).max(config.min_score)
        };

        // Update score
        score.score = new_score;
        score.tier = ReputationTier::from_score(new_score);
        score.last_event = clock.unix_timestamp;

        // Update event counts and totals
        if points >= 0 {
            score.positive_events = score.positive_events
                .checked_add(1)
                .ok_or(ReputationError::Overflow)?;
            score.total_points_earned = score.total_points_earned
                .checked_add(points as i64)
                .ok_or(ReputationError::Overflow)?;
        } else {
            score.negative_events = score.negative_events
                .checked_add(1)
                .ok_or(ReputationError::Overflow)?;
            score.total_points_lost = score.total_points_lost
                .checked_add((-points) as i64)
                .ok_or(ReputationError::Overflow)?;
        }

        // Record event
        event.identity = score.identity;
        event.event_type = event_type;
        event.points = points;
        event.score_before = score_before;
        event.score_after = new_score;
        event.source = ctx.accounts.source.key();
        event.timestamp = clock.unix_timestamp;
        event.metadata = metadata;
        event.bump = ctx.bumps.reputation_event;

        // CPI to identity registry to update reputation
        let cpi_program = ctx.accounts.identity_registry_program.to_account_info();
        let cpi_accounts = identity_registry::cpi::accounts::UpdateReputation {
            identity_account: ctx.accounts.identity.to_account_info(),
            reputation_engine: ctx.accounts.engine_signer.to_account_info(),
            config: ctx.accounts.identity_config.to_account_info(),
        };

        let seeds = &[b"config".as_ref(), &[config.bump]];
        let signer_seeds = &[&seeds[..]];

        identity_registry::cpi::update_reputation(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            new_score,
        )?;

        msg!("Reputation event recorded: {:?} points={} score: {} -> {}",
            event_type, points, score_before, new_score);

        Ok(())
    }

    /// Record a positive event (convenience function)
    pub fn record_positive_event(
        ctx: Context<RecordEvent>,
        event_type: EventType,
        metadata: [u8; 32],
    ) -> Result<()> {
        // Ensure it's a positive event type
        let points = get_default_points(&event_type);
        require!(points > 0, ReputationError::InvalidPoints);

        record_event(ctx, event_type, None, metadata)
    }

    /// Record a negative event (convenience function)
    pub fn record_negative_event(
        ctx: Context<RecordEvent>,
        event_type: EventType,
        metadata: [u8; 32],
    ) -> Result<()> {
        // Ensure it's a negative event type
        let points = get_default_points(&event_type);
        require!(points < 0, ReputationError::InvalidPoints);

        record_event(ctx, event_type, None, metadata)
    }

    /// Apply decay to reputation scores (crank operation)
    pub fn apply_decay(ctx: Context<ApplyDecay>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let score = &mut ctx.accounts.reputation_score;
        let clock = Clock::get()?;

        // Calculate days since last decay
        let seconds_per_day: i64 = 86400;
        let days_elapsed = (clock.unix_timestamp - score.last_event) / seconds_per_day;

        if days_elapsed > 0 {
            // Apply decay: reduce score by decay_rate_bps per day of inactivity
            let decay_per_day = (score.score as u128 * config.decay_rate_bps as u128) / 10000;
            let total_decay = (decay_per_day * days_elapsed as u128) as u64;

            let new_score = score.score.saturating_sub(total_decay).max(config.min_score);
            score.score = new_score;
            score.tier = ReputationTier::from_score(new_score);

            msg!("Applied decay of {} points over {} days", total_decay, days_elapsed);
        }

        config.last_decay_run = clock.unix_timestamp;

        Ok(())
    }

    /// Get reputation tier for a score (view helper)
    pub fn get_tier(ctx: Context<GetTier>) -> Result<()> {
        let score = &ctx.accounts.reputation_score;

        msg!("Identity {} has score {} and tier {:?}",
            score.identity, score.score, score.tier);

        Ok(())
    }

    /// Update configuration (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        base_score: Option<u64>,
        max_score: Option<u64>,
        min_score: Option<u64>,
        decay_rate_bps: Option<u16>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(v) = base_score {
            config.base_score = v;
        }
        if let Some(v) = max_score {
            config.max_score = v;
        }
        if let Some(v) = min_score {
            config.min_score = v;
        }
        if let Some(v) = decay_rate_bps {
            config.decay_rate_bps = v;
        }

        msg!("Reputation config updated");

        Ok(())
    }
}

// ============== Account Contexts ==============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = ReputationConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ReputationConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeScore<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ReputationConfig>,

    #[account(
        init,
        payer = payer,
        space = ReputationScore::LEN,
        seeds = [b"score", identity.key().as_ref()],
        bump
    )]
    pub reputation_score: Account<'info, ReputationScore>,

    /// CHECK: Identity account from identity registry
    pub identity: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordEvent<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ReputationConfig>,

    #[account(
        mut,
        seeds = [b"score", identity.key().as_ref()],
        bump = reputation_score.bump
    )]
    pub reputation_score: Account<'info, ReputationScore>,

    #[account(
        init,
        payer = source,
        space = ReputationEvent::LEN,
        seeds = [
            b"event",
            identity.key().as_ref(),
            &reputation_score.positive_events.to_le_bytes(),
            &reputation_score.negative_events.to_le_bytes()
        ],
        bump
    )]
    pub reputation_event: Account<'info, ReputationEvent>,

    /// CHECK: Identity account to update
    #[account(mut)]
    pub identity: AccountInfo<'info>,

    /// CHECK: Identity registry config
    pub identity_config: AccountInfo<'info>,

    /// CHECK: Engine signer (this program as PDA)
    pub engine_signer: AccountInfo<'info>,

    /// CHECK: Identity registry program for CPI
    pub identity_registry_program: AccountInfo<'info>,

    /// Source of the event (e.g., oracle, credential manager)
    #[account(mut)]
    pub source: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyDecay<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, ReputationConfig>,

    #[account(
        mut,
        seeds = [b"score", reputation_score.identity.as_ref()],
        bump = reputation_score.bump
    )]
    pub reputation_score: Account<'info, ReputationScore>,

    pub cranker: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetTier<'info> {
    #[account(
        seeds = [b"score", reputation_score.identity.as_ref()],
        bump = reputation_score.bump
    )]
    pub reputation_score: Account<'info, ReputationScore>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, ReputationConfig>,

    pub admin: Signer<'info>,
}
