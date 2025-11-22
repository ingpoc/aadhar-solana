use anchor_lang::prelude::*;

#[error_code]
pub enum ReputationError {
    #[msg("Reputation score would exceed maximum")]
    ScoreOverflow,

    #[msg("Reputation score would go below minimum")]
    ScoreUnderflow,

    #[msg("Unauthorized: Only admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Unauthorized: Only authorized sources can record events")]
    UnauthorizedSource,

    #[msg("Invalid points value")]
    InvalidPoints,

    #[msg("Reputation score not found for identity")]
    ScoreNotFound,

    #[msg("Decay already run recently")]
    DecayTooSoon,

    #[msg("Arithmetic overflow")]
    Overflow,
}
