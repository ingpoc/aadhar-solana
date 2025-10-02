use anchor_lang::prelude::*;

declare_id!("FqSMx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhR");

#[program]
pub mod staking_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
