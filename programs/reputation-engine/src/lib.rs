use anchor_lang::prelude::*;

declare_id!("FpRDg4wqEHkzVMQvYtNzCXvXqNqSxqwKLjPzxYpGhSmQ");

#[program]
pub mod reputation_engine {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
