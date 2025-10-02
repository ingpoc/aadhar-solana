use anchor_lang::prelude::*;

declare_id!("FJzG8XuVKmNdHpHqkdg7tMxUNNHZLLqaWBNgWz6bPsxZ");

#[program]
pub mod verification_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
