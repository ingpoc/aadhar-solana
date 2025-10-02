use anchor_lang::prelude::*;

declare_id!("FoZKx8qQqKvpwHHzCvuqQtmKLx4zUqNqmJz7uSxYpGhS");

#[program]
pub mod credential_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
