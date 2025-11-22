use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub mod state;
pub mod errors;

use state::*;
use errors::*;

declare_id!("FJzG8XuVKmNdHpHqkdg7tMxUNNHZLLqaWBNgWz6bPsxZ");

#[program]
pub mod verification_oracle {
    use super::*;

    /// Initialize the oracle configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        identity_registry: Pubkey,
        staking_manager: Pubkey,
        min_oracle_stake: u64,
        verification_fee: u64,
        required_confirmations: u8,
        verification_timeout: i64,
        slash_percentage_bps: u16,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.admin = ctx.accounts.admin.key();
        config.identity_registry = identity_registry;
        config.staking_manager = staking_manager;
        config.min_oracle_stake = min_oracle_stake;
        config.verification_fee = verification_fee;
        config.required_confirmations = required_confirmations;
        config.verification_timeout = verification_timeout;
        config.slash_percentage_bps = slash_percentage_bps;
        config.active_oracle_count = 0;
        config.total_verifications = 0;
        config.bump = ctx.bumps.config;

        msg!("Oracle config initialized with {} required confirmations", required_confirmations);

        Ok(())
    }

    /// Register a new oracle node
    pub fn register_oracle(ctx: Context<RegisterOracle>) -> Result<()> {
        let config = &ctx.accounts.config;
        let oracle_node = &mut ctx.accounts.oracle_node;
        let clock = Clock::get()?;

        // Verify the stake account has sufficient stake
        // In production, this would verify via CPI to staking manager
        // For now, we trust that the stake_account is valid

        oracle_node.authority = ctx.accounts.authority.key();
        oracle_node.stake_account = ctx.accounts.stake_account.key();
        oracle_node.status = OracleStatus::Active;
        oracle_node.verifications_submitted = 0;
        oracle_node.successful_verifications = 0;
        oracle_node.failed_verifications = 0;
        oracle_node.slash_count = 0;
        oracle_node.registered_at = clock.unix_timestamp;
        oracle_node.last_active = clock.unix_timestamp;
        oracle_node.bump = ctx.bumps.oracle_node;

        // Update config
        let config = &mut ctx.accounts.config;
        config.active_oracle_count = config.active_oracle_count
            .checked_add(1)
            .ok_or(OracleError::Overflow)?;

        msg!("Oracle registered: {}", ctx.accounts.authority.key());

        Ok(())
    }

    /// Deregister an oracle node
    pub fn deregister_oracle(ctx: Context<DeregisterOracle>) -> Result<()> {
        let oracle_node = &mut ctx.accounts.oracle_node;
        let config = &mut ctx.accounts.config;

        oracle_node.status = OracleStatus::Inactive;

        config.active_oracle_count = config.active_oracle_count
            .checked_sub(1)
            .ok_or(OracleError::Overflow)?;

        msg!("Oracle deregistered: {}", oracle_node.authority);

        Ok(())
    }

    /// Request a verification
    pub fn request_verification(
        ctx: Context<RequestVerification>,
        verification_type: u8,
        verification_hash: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let request = &mut ctx.accounts.verification_request;
        let clock = Clock::get()?;

        require!(verification_type < 64, OracleError::InvalidVerificationType);

        // Transfer verification fee from requester
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.requester.to_account_info(),
                    to: ctx.accounts.fee_vault.to_account_info(),
                },
            ),
            config.verification_fee,
        )?;

        // Initialize request
        request.identity = ctx.accounts.identity.key();
        request.verification_type = verification_type;
        request.verification_hash = verification_hash;
        request.status = VerificationStatus::Pending;
        request.fee_paid = config.verification_fee;
        request.created_at = clock.unix_timestamp;
        request.deadline = clock.unix_timestamp + config.verification_timeout;
        request.confirmations = 0;
        request.rejections = 0;
        request.responded_oracles = Vec::new();
        request.result = None;
        request.bump = ctx.bumps.verification_request;

        // Update config stats
        let config = &mut ctx.accounts.config;
        config.total_verifications = config.total_verifications
            .checked_add(1)
            .ok_or(OracleError::Overflow)?;

        msg!("Verification requested for identity {} type {}",
            ctx.accounts.identity.key(), verification_type);

        Ok(())
    }

    /// Submit oracle verification response
    pub fn submit_verification(
        ctx: Context<SubmitVerification>,
        verified: bool,
        metadata_hash: [u8; 32],
    ) -> Result<()> {
        let oracle_node = &mut ctx.accounts.oracle_node;
        let request = &mut ctx.accounts.verification_request;
        let response = &mut ctx.accounts.oracle_response;
        let clock = Clock::get()?;

        // Verify oracle is active
        require!(oracle_node.status == OracleStatus::Active, OracleError::OracleNotActive);

        // Verify request is still pending/in progress
        require!(
            request.status == VerificationStatus::Pending ||
            request.status == VerificationStatus::InProgress,
            OracleError::RequestNotPending
        );

        // Verify request hasn't expired
        require!(clock.unix_timestamp <= request.deadline, OracleError::RequestExpired);

        // Verify oracle hasn't already responded
        require!(
            !request.responded_oracles.contains(&oracle_node.authority),
            OracleError::AlreadyResponded
        );

        // Verify we haven't hit max oracles
        require!(
            request.responded_oracles.len() < VerificationRequest::MAX_ORACLES,
            OracleError::MaxOraclesReached
        );

        // Record the response
        response.request = request.key();
        response.oracle = oracle_node.authority;
        response.verified = verified;
        response.responded_at = clock.unix_timestamp;
        response.metadata_hash = metadata_hash;
        response.bump = ctx.bumps.oracle_response;

        // Update request
        if verified {
            request.confirmations = request.confirmations
                .checked_add(1)
                .ok_or(OracleError::Overflow)?;
        } else {
            request.rejections = request.rejections
                .checked_add(1)
                .ok_or(OracleError::Overflow)?;
        }
        request.responded_oracles.push(oracle_node.authority);

        if request.status == VerificationStatus::Pending {
            request.status = VerificationStatus::InProgress;
        }

        // Update oracle stats
        oracle_node.verifications_submitted = oracle_node.verifications_submitted
            .checked_add(1)
            .ok_or(OracleError::Overflow)?;
        oracle_node.last_active = clock.unix_timestamp;

        msg!("Oracle {} submitted verification: {}", oracle_node.authority, verified);

        Ok(())
    }

    /// Finalize verification after enough confirmations
    pub fn finalize_verification(ctx: Context<FinalizeVerification>) -> Result<()> {
        let config = &ctx.accounts.config;
        let request = &mut ctx.accounts.verification_request;

        // Verify request is in progress
        require!(
            request.status == VerificationStatus::InProgress,
            OracleError::RequestNotPending
        );

        // Check if we have enough responses
        let total_responses = request.confirmations + request.rejections;
        require!(
            total_responses >= config.required_confirmations,
            OracleError::InsufficientConfirmations
        );

        // Determine result based on majority
        let verified = request.confirmations > request.rejections;
        request.result = Some(verified);

        if verified {
            request.status = VerificationStatus::Verified;

            // CPI to identity registry to update verification status
            let cpi_program = ctx.accounts.identity_registry_program.to_account_info();
            let cpi_accounts = identity_registry::cpi::accounts::UpdateVerificationStatus {
                identity_account: ctx.accounts.identity.to_account_info(),
                oracle: ctx.accounts.oracle_signer.to_account_info(),
                config: ctx.accounts.identity_config.to_account_info(),
            };

            let seeds = &[b"config".as_ref(), &[config.bump]];
            let signer_seeds = &[&seeds[..]];

            identity_registry::cpi::update_verification_status(
                CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
                request.verification_type,
                true,
            )?;

            msg!("Verification finalized: VERIFIED");
        } else {
            request.status = VerificationStatus::Rejected;
            msg!("Verification finalized: REJECTED");
        }

        Ok(())
    }

    /// Handle expired verification request
    pub fn expire_verification(ctx: Context<ExpireVerification>) -> Result<()> {
        let request = &mut ctx.accounts.verification_request;
        let clock = Clock::get()?;

        require!(
            request.status == VerificationStatus::Pending ||
            request.status == VerificationStatus::InProgress,
            OracleError::AlreadyFinalized
        );

        require!(clock.unix_timestamp > request.deadline, OracleError::DeadlineNotReached);

        request.status = VerificationStatus::Expired;
        request.result = None;

        // TODO: Refund fee to requester

        msg!("Verification request expired");

        Ok(())
    }

    /// Slash an oracle for misbehavior
    pub fn slash_oracle(
        ctx: Context<SlashOracle>,
        reason: staking_manager::state::SlashReason,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let oracle_node = &mut ctx.accounts.oracle_node;

        // Calculate slash amount
        // This would typically be calculated based on their stake
        // For now, we just mark them and CPI to staking manager

        oracle_node.slash_count = oracle_node.slash_count
            .checked_add(1)
            .ok_or(OracleError::Overflow)?;
        oracle_node.failed_verifications = oracle_node.failed_verifications
            .checked_add(1)
            .ok_or(OracleError::Overflow)?;

        // If slashed too many times, deactivate
        if oracle_node.slash_count >= 3 {
            oracle_node.status = OracleStatus::Slashed;

            let config_mut = &mut ctx.accounts.config;
            config_mut.active_oracle_count = config_mut.active_oracle_count
                .checked_sub(1)
                .ok_or(OracleError::Overflow)?;
        }

        msg!("Oracle {} slashed for {:?}", oracle_node.authority, reason);

        Ok(())
    }

    /// Update oracle configuration (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        min_oracle_stake: Option<u64>,
        verification_fee: Option<u64>,
        required_confirmations: Option<u8>,
        verification_timeout: Option<i64>,
        slash_percentage_bps: Option<u16>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(v) = min_oracle_stake {
            config.min_oracle_stake = v;
        }
        if let Some(v) = verification_fee {
            config.verification_fee = v;
        }
        if let Some(v) = required_confirmations {
            config.required_confirmations = v;
        }
        if let Some(v) = verification_timeout {
            config.verification_timeout = v;
        }
        if let Some(v) = slash_percentage_bps {
            config.slash_percentage_bps = v;
        }

        msg!("Oracle config updated");

        Ok(())
    }
}

// ============== Account Contexts ==============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = OracleConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterOracle<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(
        init,
        payer = authority,
        space = OracleNode::LEN,
        seeds = [b"oracle", authority.key().as_ref()],
        bump
    )]
    pub oracle_node: Account<'info, OracleNode>,

    /// CHECK: Stake account in staking manager (verified via constraints in production)
    pub stake_account: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeregisterOracle<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(
        mut,
        seeds = [b"oracle", authority.key().as_ref()],
        bump = oracle_node.bump,
        has_one = authority
    )]
    pub oracle_node: Account<'info, OracleNode>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(verification_type: u8, verification_hash: [u8; 32])]
pub struct RequestVerification<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(
        init,
        payer = requester,
        space = VerificationRequest::LEN,
        seeds = [b"request", identity.key().as_ref(), &[verification_type]],
        bump
    )]
    pub verification_request: Account<'info, VerificationRequest>,

    /// CHECK: Identity account from identity registry
    pub identity: AccountInfo<'info>,

    /// CHECK: Fee vault to receive verification fees
    #[account(
        mut,
        seeds = [b"fee_vault"],
        bump
    )]
    pub fee_vault: AccountInfo<'info>,

    #[account(mut)]
    pub requester: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitVerification<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, OracleConfig>,

    #[account(
        mut,
        seeds = [b"oracle", authority.key().as_ref()],
        bump = oracle_node.bump,
        has_one = authority
    )]
    pub oracle_node: Account<'info, OracleNode>,

    #[account(mut)]
    pub verification_request: Account<'info, VerificationRequest>,

    #[account(
        init,
        payer = authority,
        space = OracleResponse::LEN,
        seeds = [b"response", verification_request.key().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub oracle_response: Account<'info, OracleResponse>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeVerification<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, OracleConfig>,

    #[account(mut)]
    pub verification_request: Account<'info, VerificationRequest>,

    /// CHECK: Identity account to update
    #[account(mut)]
    pub identity: AccountInfo<'info>,

    /// CHECK: Identity registry config
    pub identity_config: AccountInfo<'info>,

    /// CHECK: Oracle signer (this program as PDA)
    pub oracle_signer: AccountInfo<'info>,

    /// CHECK: Identity registry program for CPI
    pub identity_registry_program: AccountInfo<'info>,

    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExpireVerification<'info> {
    #[account(mut)]
    pub verification_request: Account<'info, VerificationRequest>,

    pub anyone: Signer<'info>,
}

#[derive(Accounts)]
pub struct SlashOracle<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(
        mut,
        seeds = [b"oracle", oracle_node.authority.as_ref()],
        bump = oracle_node.bump
    )]
    pub oracle_node: Account<'info, OracleNode>,

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
    pub config: Account<'info, OracleConfig>,

    pub admin: Signer<'info>,
}
