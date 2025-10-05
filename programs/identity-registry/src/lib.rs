use anchor_lang::prelude::*;

pub mod state;
pub mod errors;

use state::*;

declare_id!("9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n");

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
        identity.aadhaar_hash = [0u8; 32];
        identity.aadhaar_last4 = String::new();
        identity.name_encrypted = Vec::new();
        identity.dob_encrypted = Vec::new();
        identity.gender_encrypted = Vec::new();
        identity.mobile_encrypted = Vec::new();
        identity.email_encrypted = Vec::new();
        identity.address_full_encrypted = Vec::new();
        identity.photo_hash = [0u8; 32];
        identity.age_commitment = [0u8; 32];
        identity.gender_commitment = [0u8; 32];
        identity.aadhaar_verified_at = 0;
        identity.aadhaar_expires_at = 0;
        identity.oracle_signature = [0u8; 64];
        identity.verification_bitmap = 0;
        identity.reputation_score = 500;
        identity.staked_amount = 0;
        identity.created_at = clock.unix_timestamp;
        identity.last_updated = clock.unix_timestamp;
        identity.recovery_keys = recovery_keys;
        identity.bump = ctx.bumps.identity_account;

        Ok(())
    }

    pub fn store_aadhaar_data(
        ctx: Context<StoreAadhaarData>,
        aadhaar_hash: [u8; 32],
        aadhaar_last4: String,
        name_encrypted: [u8; 128],
        name_len: u8,
        dob_encrypted: [u8; 64],
        dob_len: u8,
        gender_encrypted: [u8; 32],
        gender_len: u8,
        mobile_encrypted: [u8; 64],
        mobile_len: u8,
        email_encrypted: [u8; 128],
        email_len: u8,
        address_full_encrypted: [u8; 512],
        address_len: u16,
        photo_hash: [u8; 32],
        age_commitment: [u8; 32],
        gender_commitment: [u8; 32],
        expires_at: i64,
        oracle_signature: [u8; 64],
    ) -> Result<()> {
        require!(aadhaar_last4.len() == 4, errors::IdentityError::InvalidAadhaarLast4);
        require!(name_len as usize <= 128, errors::IdentityError::EncryptedDataTooLarge);
        require!(dob_len as usize <= 64, errors::IdentityError::EncryptedDataTooLarge);
        require!(gender_len as usize <= 32, errors::IdentityError::EncryptedDataTooLarge);
        require!(mobile_len as usize <= 64, errors::IdentityError::EncryptedDataTooLarge);
        require!(email_len as usize <= 128, errors::IdentityError::EncryptedDataTooLarge);
        require!(address_len as usize <= 512, errors::IdentityError::EncryptedDataTooLarge);

        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        identity.aadhaar_hash = aadhaar_hash;
        identity.aadhaar_last4 = aadhaar_last4;
        identity.name_encrypted = name_encrypted[..name_len as usize].to_vec();
        identity.dob_encrypted = dob_encrypted[..dob_len as usize].to_vec();
        identity.gender_encrypted = gender_encrypted[..gender_len as usize].to_vec();
        identity.mobile_encrypted = mobile_encrypted[..mobile_len as usize].to_vec();
        identity.email_encrypted = email_encrypted[..email_len as usize].to_vec();
        identity.address_full_encrypted = address_full_encrypted[..address_len as usize].to_vec();
        identity.photo_hash = photo_hash;
        identity.age_commitment = age_commitment;
        identity.gender_commitment = gender_commitment;
        identity.aadhaar_verified_at = clock.unix_timestamp;
        identity.aadhaar_expires_at = expires_at;
        identity.oracle_signature = oracle_signature;
        identity.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_verification_status(
        ctx: Context<UpdateVerificationStatus>,
        verification_type: u8,
        verified: bool,
    ) -> Result<()> {
        require!(verification_type < 64, errors::IdentityError::InvalidVerificationType);

        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        if verified {
            identity.verification_bitmap |= 1 << verification_type;
        } else {
            identity.verification_bitmap &= !(1 << verification_type);
        }

        identity.last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        new_score: u64,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity_account;
        let clock = Clock::get()?;

        identity.reputation_score = new_score;
        identity.last_updated = clock.unix_timestamp;

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

    #[account(
        constraint = oracle.key() == config.verification_oracle @ errors::IdentityError::UnauthorizedOracle
    )]
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

    #[account(
        constraint = reputation_engine.key() == config.reputation_engine @ errors::IdentityError::UnauthorizedReputationEngine
    )]
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
pub struct StoreAadhaarData<'info> {
    #[account(
        mut,
        seeds = [b"identity", authority.key().as_ref()],
        bump = identity_account.bump,
        has_one = authority
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    pub authority: Signer<'info>,

    #[account(
        constraint = oracle.key() == config.verification_oracle @ errors::IdentityError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, GlobalConfig>,
}
