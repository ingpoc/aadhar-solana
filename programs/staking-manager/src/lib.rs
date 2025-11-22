use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub mod state;
pub mod errors;

use state::*;
use errors::*;

declare_id!("FqSMx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhR");

/// Precision for reward calculations
const REWARD_PRECISION: u128 = 1_000_000_000_000; // 1e12

#[program]
pub mod staking_manager {
    use super::*;

    /// Initialize the staking pool
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        min_stake_amount: u64,
        reward_rate_bps: u16,
        unstake_cooldown: i64,
        identity_registry: Pubkey,
        verification_oracle: Pubkey,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        pool.admin = ctx.accounts.admin.key();
        pool.identity_registry = identity_registry;
        pool.verification_oracle = verification_oracle;
        pool.total_staked = 0;
        pool.min_stake_amount = min_stake_amount;
        pool.reward_rate_bps = reward_rate_bps;
        pool.unstake_cooldown = unstake_cooldown;
        pool.last_reward_distribution = clock.unix_timestamp;
        pool.acc_reward_per_share = 0;
        pool.paused = false;
        pool.bump = ctx.bumps.pool;

        msg!("Staking pool initialized with min_stake: {}, reward_rate: {}bps",
            min_stake_amount, reward_rate_bps);

        Ok(())
    }

    /// Stake SOL tokens
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(!pool.paused, StakingError::PoolPaused);
        require!(amount >= pool.min_stake_amount, StakingError::InsufficientStakeAmount);

        // Update pool rewards before staking
        update_pool_rewards(pool, clock.unix_timestamp)?;

        // Calculate pending rewards if already staking
        if stake_account.staked_amount > 0 {
            let pending = calculate_pending_rewards(stake_account, pool)?;
            stake_account.pending_rewards = stake_account.pending_rewards
                .checked_add(pending)
                .ok_or(StakingError::Overflow)?;
        }

        // Transfer SOL from user to pool vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update stake account
        stake_account.owner = ctx.accounts.owner.key();
        stake_account.staked_amount = stake_account.staked_amount
            .checked_add(amount)
            .ok_or(StakingError::Overflow)?;
        stake_account.staked_at = clock.unix_timestamp;
        stake_account.reward_debt = (stake_account.staked_amount as u128)
            .checked_mul(pool.acc_reward_per_share)
            .ok_or(StakingError::Overflow)?
            / REWARD_PRECISION;
        stake_account.bump = ctx.bumps.stake_account;

        // Update pool totals
        pool.total_staked = pool.total_staked
            .checked_add(amount)
            .ok_or(StakingError::Overflow)?;

        msg!("Staked {} lamports for {}", amount, ctx.accounts.owner.key());

        Ok(())
    }

    /// Request to unstake tokens (starts cooldown)
    pub fn request_unstake(ctx: Context<RequestUnstake>, amount: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(!pool.paused, StakingError::PoolPaused);
        require!(stake_account.unstake_requested_at == 0, StakingError::UnstakeAlreadyRequested);
        require!(amount <= stake_account.staked_amount, StakingError::ExcessiveUnstakeAmount);
        require!(amount > 0, StakingError::InsufficientStakedBalance);

        stake_account.unstake_requested_at = clock.unix_timestamp;
        stake_account.unstake_amount = amount;

        msg!("Unstake requested for {} lamports, cooldown until {}",
            amount, clock.unix_timestamp + pool.unstake_cooldown);

        Ok(())
    }

    /// Complete unstake after cooldown period
    pub fn complete_unstake(ctx: Context<CompleteUnstake>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(!pool.paused, StakingError::PoolPaused);
        require!(stake_account.unstake_requested_at > 0, StakingError::NoPendingUnstake);

        let cooldown_end = stake_account.unstake_requested_at
            .checked_add(pool.unstake_cooldown)
            .ok_or(StakingError::Overflow)?;
        require!(clock.unix_timestamp >= cooldown_end, StakingError::CooldownNotElapsed);

        let unstake_amount = stake_account.unstake_amount;

        // Update pool rewards before unstaking
        update_pool_rewards(pool, clock.unix_timestamp)?;

        // Calculate and add pending rewards
        let pending = calculate_pending_rewards(stake_account, pool)?;
        stake_account.pending_rewards = stake_account.pending_rewards
            .checked_add(pending)
            .ok_or(StakingError::Overflow)?;

        // Transfer SOL back to user
        let pool_bump = pool.bump;
        let seeds = &[b"pool".as_ref(), &[pool_bump]];
        let signer_seeds = &[&seeds[..]];

        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? -= unstake_amount;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += unstake_amount;

        // Update stake account
        stake_account.staked_amount = stake_account.staked_amount
            .checked_sub(unstake_amount)
            .ok_or(StakingError::Overflow)?;
        stake_account.unstake_requested_at = 0;
        stake_account.unstake_amount = 0;
        stake_account.reward_debt = (stake_account.staked_amount as u128)
            .checked_mul(pool.acc_reward_per_share)
            .ok_or(StakingError::Overflow)?
            / REWARD_PRECISION;

        // Update pool totals
        pool.total_staked = pool.total_staked
            .checked_sub(unstake_amount)
            .ok_or(StakingError::Overflow)?;

        msg!("Unstaked {} lamports for {}", unstake_amount, ctx.accounts.owner.key());

        Ok(())
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(!pool.paused, StakingError::PoolPaused);

        // Update pool rewards
        update_pool_rewards(pool, clock.unix_timestamp)?;

        // Calculate pending rewards
        let pending = calculate_pending_rewards(stake_account, pool)?;
        let total_rewards = stake_account.pending_rewards
            .checked_add(pending)
            .ok_or(StakingError::Overflow)?;

        require!(total_rewards > 0, StakingError::NoRewardsAvailable);

        // Transfer rewards from vault to user
        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? -= total_rewards;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += total_rewards;

        // Update stake account
        stake_account.pending_rewards = 0;
        stake_account.reward_debt = (stake_account.staked_amount as u128)
            .checked_mul(pool.acc_reward_per_share)
            .ok_or(StakingError::Overflow)?
            / REWARD_PRECISION;
        stake_account.total_rewards_claimed = stake_account.total_rewards_claimed
            .checked_add(total_rewards)
            .ok_or(StakingError::Overflow)?;

        msg!("Claimed {} lamports in rewards for {}", total_rewards, ctx.accounts.owner.key());

        Ok(())
    }

    /// Slash a staker (called by verification oracle for misbehavior)
    pub fn slash(
        ctx: Context<SlashStaker>,
        amount: u64,
        reason: SlashReason,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let stake_account = &mut ctx.accounts.stake_account;
        let slash_record = &mut ctx.accounts.slash_record;
        let clock = Clock::get()?;

        // Verify caller is the verification oracle
        require!(
            ctx.accounts.oracle.key() == pool.verification_oracle,
            StakingError::UnauthorizedSlash
        );

        require!(amount > 0, StakingError::InvalidSlashAmount);
        require!(amount <= stake_account.staked_amount, StakingError::InvalidSlashAmount);

        // Update pool rewards before slashing
        update_pool_rewards(pool, clock.unix_timestamp)?;

        // Reduce staked amount
        stake_account.staked_amount = stake_account.staked_amount
            .checked_sub(amount)
            .ok_or(StakingError::Overflow)?;
        stake_account.slash_count = stake_account.slash_count
            .checked_add(1)
            .ok_or(StakingError::Overflow)?;
        stake_account.reward_debt = (stake_account.staked_amount as u128)
            .checked_mul(pool.acc_reward_per_share)
            .ok_or(StakingError::Overflow)?
            / REWARD_PRECISION;

        // Update pool totals
        pool.total_staked = pool.total_staked
            .checked_sub(amount)
            .ok_or(StakingError::Overflow)?;

        // Record slash
        slash_record.staker = stake_account.owner;
        slash_record.amount = amount;
        slash_record.reason = reason;
        slash_record.timestamp = clock.unix_timestamp;
        slash_record.slashed_by = ctx.accounts.oracle.key();
        slash_record.bump = ctx.bumps.slash_record;

        // Slashed funds go to treasury (pool vault for now)
        // In production, could distribute to other stakers or burn

        msg!("Slashed {} lamports from {} for {:?}",
            amount, stake_account.owner, reason);

        Ok(())
    }

    /// Update pool configuration (admin only)
    pub fn update_pool_config(
        ctx: Context<UpdatePoolConfig>,
        min_stake_amount: Option<u64>,
        reward_rate_bps: Option<u16>,
        unstake_cooldown: Option<i64>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        if let Some(amount) = min_stake_amount {
            pool.min_stake_amount = amount;
        }
        if let Some(rate) = reward_rate_bps {
            pool.reward_rate_bps = rate;
        }
        if let Some(cooldown) = unstake_cooldown {
            pool.unstake_cooldown = cooldown;
        }

        msg!("Pool config updated");

        Ok(())
    }

    /// Pause/unpause the pool (admin only)
    pub fn set_pool_paused(ctx: Context<UpdatePoolConfig>, paused: bool) -> Result<()> {
        ctx.accounts.pool.paused = paused;
        msg!("Pool paused: {}", paused);
        Ok(())
    }

    /// Get stake info (view function helper)
    pub fn get_stake_info(ctx: Context<GetStakeInfo>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let stake_account = &ctx.accounts.stake_account;
        let clock = Clock::get()?;

        let pending = calculate_pending_rewards(stake_account, pool)?;
        let total_rewards = stake_account.pending_rewards
            .checked_add(pending)
            .unwrap_or(0);

        msg!("Stake Info - Amount: {}, Pending Rewards: {}, Slash Count: {}",
            stake_account.staked_amount, total_rewards, stake_account.slash_count);

        Ok(())
    }
}

/// Update accumulated rewards per share
fn update_pool_rewards(pool: &mut StakingPool, current_time: i64) -> Result<()> {
    if pool.total_staked == 0 {
        pool.last_reward_distribution = current_time;
        return Ok(());
    }

    let time_elapsed = current_time
        .checked_sub(pool.last_reward_distribution)
        .ok_or(StakingError::Overflow)?;

    if time_elapsed > 0 {
        // Calculate rewards: (time_elapsed * reward_rate_bps * total_staked) / (365 days * 10000)
        let seconds_per_year: u128 = 365 * 24 * 60 * 60;
        let reward = (time_elapsed as u128)
            .checked_mul(pool.reward_rate_bps as u128)
            .ok_or(StakingError::Overflow)?
            .checked_mul(pool.total_staked as u128)
            .ok_or(StakingError::Overflow)?
            / seconds_per_year
            / 10000;

        let reward_per_share = reward
            .checked_mul(REWARD_PRECISION)
            .ok_or(StakingError::Overflow)?
            / pool.total_staked as u128;

        pool.acc_reward_per_share = pool.acc_reward_per_share
            .checked_add(reward_per_share)
            .ok_or(StakingError::Overflow)?;
        pool.last_reward_distribution = current_time;
    }

    Ok(())
}

/// Calculate pending rewards for a stake account
fn calculate_pending_rewards(stake_account: &StakeAccount, pool: &StakingPool) -> Result<u64> {
    if stake_account.staked_amount == 0 {
        return Ok(0);
    }

    let acc_reward = (stake_account.staked_amount as u128)
        .checked_mul(pool.acc_reward_per_share)
        .ok_or(StakingError::Overflow)?
        / REWARD_PRECISION;

    let pending = acc_reward
        .checked_sub(stake_account.reward_debt)
        .unwrap_or(0) as u64;

    Ok(pending)
}

// ============== Account Contexts ==============

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = admin,
        space = StakingPool::LEN,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    /// CHECK: Pool vault PDA to hold staked SOL
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = owner,
        space = StakeAccount::LEN,
        seeds = [b"stake", owner.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// CHECK: Pool vault to receive staked SOL
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteUnstake<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// CHECK: Pool vault to return SOL from
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// CHECK: Pool vault to pay rewards from
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashStaker<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"stake", stake_account.owner.as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        init,
        payer = oracle,
        space = SlashRecord::LEN,
        seeds = [b"slash", stake_account.owner.as_ref(), &stake_account.slash_count.to_le_bytes()],
        bump
    )]
    pub slash_record: Account<'info, SlashRecord>,

    /// Verification oracle that initiates the slash
    #[account(mut)]
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePoolConfig<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
        has_one = admin
    )]
    pub pool: Account<'info, StakingPool>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetStakeInfo<'info> {
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, StakingPool>,

    #[account(
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub owner: Signer<'info>,
}
