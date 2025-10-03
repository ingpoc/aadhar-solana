use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh");

pub mod state;
pub mod errors;

use state::*;

#[program]
pub mod staking_manager {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        identity_registry: Pubkey,
        min_stake_amount: u64,
        lockup_period: i64,
        slash_percentage: u8,
        reward_rate: u64,
    ) -> Result<()> {
        require!(slash_percentage <= 100, errors::StakingError::InvalidSlashPercentage);

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.min_stake_amount = min_stake_amount;
        config.lockup_period = lockup_period;
        config.slash_percentage = slash_percentage;
        config.reward_rate = reward_rate;
        config.total_staked = 0;
        config.total_rewards_distributed = 0;
        Ok(())
    }

    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = ctx.accounts.admin.key();
        treasury.total_balance = 0;
        treasury.total_withdrawn = 0;
        treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

    pub fn stake_tokens(
        ctx: Context<StakeTokens>,
        amount: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(amount >= config.min_stake_amount, errors::StakingError::BelowMinimumStake);

        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        if stake.staked_amount == 0 {
            stake.owner = ctx.accounts.staker.key();
            stake.staked_amount = amount;
            stake.staked_at = clock.unix_timestamp;
            stake.unlock_at = clock.unix_timestamp + config.lockup_period;
            stake.rewards_earned = 0;
            stake.last_reward_claim = clock.unix_timestamp;
            stake.slashed = false;
            stake.bump = ctx.bumps.stake_account;
        } else {
            stake.staked_amount = stake.staked_amount.checked_add(amount).unwrap();
        }

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.staker.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            amount,
        )?;

        let treasury = &mut ctx.accounts.treasury;
        treasury.total_balance = treasury.total_balance.checked_add(amount).unwrap();

        let config_mut = &mut ctx.accounts.config;
        config_mut.total_staked = config_mut.total_staked.checked_add(amount).unwrap();

        emit!(TokensStaked {
            staker: ctx.accounts.staker.key(),
            amount,
            unlock_at: stake.unlock_at,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn unstake_tokens(
        ctx: Context<UnstakeTokens>,
        amount: u64,
    ) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= stake.unlock_at, errors::StakingError::StakeStillLocked);
        require!(amount <= stake.staked_amount, errors::StakingError::InsufficientStakedAmount);
        require!(!stake.slashed, errors::StakingError::StakeSlashed);

        stake.staked_amount = stake.staked_amount.checked_sub(amount).unwrap();

        let treasury = &mut ctx.accounts.treasury;
        let treasury_seeds = &[
            b"treasury".as_ref(),
            &[treasury.bump],
        ];
        let signer_seeds = &[&treasury_seeds[..]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: treasury.to_account_info(),
                    to: ctx.accounts.staker.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        treasury.total_balance = treasury.total_balance.checked_sub(amount).unwrap();
        treasury.total_withdrawn = treasury.total_withdrawn.checked_add(amount).unwrap();

        let config = &mut ctx.accounts.config;
        config.total_staked = config.total_staked.checked_sub(amount).unwrap();

        emit!(TokensUnstaked {
            staker: ctx.accounts.staker.key(),
            amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
    ) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        require!(!stake.slashed, errors::StakingError::StakeSlashed);

        let time_staked = clock.unix_timestamp - stake.last_reward_claim;
        let reward_amount = calculate_rewards(stake.staked_amount, config.reward_rate, time_staked)?;

        if reward_amount > 0 {
            let treasury = &mut ctx.accounts.treasury;
            let treasury_seeds = &[
                b"treasury".as_ref(),
                &[treasury.bump],
            ];
            let signer_seeds = &[&treasury_seeds[..]];

            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: treasury.to_account_info(),
                        to: ctx.accounts.staker.to_account_info(),
                    },
                    signer_seeds,
                ),
                reward_amount,
            )?;

            stake.rewards_earned = stake.rewards_earned.checked_add(reward_amount).unwrap();
            stake.last_reward_claim = clock.unix_timestamp;

            let config_mut = &mut ctx.accounts.config;
            config_mut.total_rewards_distributed = config_mut.total_rewards_distributed
                .checked_add(reward_amount)
                .unwrap();

            emit!(RewardsClaimed {
                staker: ctx.accounts.staker.key(),
                amount: reward_amount,
                timestamp: clock.unix_timestamp,
            });
        }

        Ok(())
    }

    pub fn slash_stake(
        ctx: Context<SlashStake>,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 256, errors::StakingError::ReasonTooLong);

        let stake = &mut ctx.accounts.stake_account;
        let config = &ctx.accounts.config;

        require!(!stake.slashed, errors::StakingError::StakeAlreadySlashed);

        let slash_amount = stake.staked_amount
            .checked_mul(config.slash_percentage as u64)
            .unwrap()
            .checked_div(100)
            .unwrap();

        stake.staked_amount = stake.staked_amount.checked_sub(slash_amount).unwrap();
        stake.slashed = true;

        let config_mut = &mut ctx.accounts.config;
        config_mut.total_staked = config_mut.total_staked.checked_sub(slash_amount).unwrap();

        emit!(StakeSlashed {
            staker: stake.owner,
            amount: slash_amount,
            reason,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn fund_treasury(
        ctx: Context<FundTreasury>,
        amount: u64,
    ) -> Result<()> {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.funder.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            amount,
        )?;

        let treasury = &mut ctx.accounts.treasury;
        treasury.total_balance = treasury.total_balance.checked_add(amount).unwrap();

        emit!(TreasuryFunded {
            funder: ctx.accounts.funder.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

fn calculate_rewards(staked_amount: u64, reward_rate: u64, time_staked: i64) -> Result<u64> {
    let days_staked = (time_staked / (24 * 60 * 60)) as u64;

    let reward = staked_amount
        .checked_mul(reward_rate)
        .unwrap()
        .checked_mul(days_staked)
        .unwrap()
        .checked_div(36500)
        .unwrap_or(0);

    Ok(reward)
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + StakingConfig::LEN,
        seeds = [b"staking_config"],
        bump
    )]
    pub config: Account<'info, StakingConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Treasury::LEN,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        seeds = [b"staking_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, StakingConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + StakeAccount::LEN,
        seeds = [b"stake", staker.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [b"staking_config"],
        bump
    )]
    pub config: Account<'info, StakingConfig>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"stake", staker.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner @ errors::StakingError::UnauthorizedStaker
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [b"staking_config"],
        bump
    )]
    pub config: Account<'info, StakingConfig>,

    #[account(mut, address = stake_account.owner)]
    pub staker: Signer<'info>,

    /// CHECK: This is a PDA account used to derive the owner check
    pub owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"stake", staker.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner @ errors::StakingError::UnauthorizedStaker
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [b"staking_config"],
        bump
    )]
    pub config: Account<'info, StakingConfig>,

    #[account(mut, address = stake_account.owner)]
    pub staker: Signer<'info>,

    /// CHECK: This is a PDA account used to derive the owner check
    pub owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashStake<'info> {
    #[account(
        mut,
        seeds = [b"stake", stake_account.owner.as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"staking_config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, StakingConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct FundTreasury<'info> {
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct TokensStaked {
    pub staker: Pubkey,
    pub amount: u64,
    pub unlock_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct TokensUnstaked {
    pub staker: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardsClaimed {
    pub staker: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct StakeSlashed {
    pub staker: Pubkey,
    pub amount: u64,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct TreasuryFunded {
    pub funder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
