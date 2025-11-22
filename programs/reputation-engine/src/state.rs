use anchor_lang::prelude::*;

/// Global configuration for the reputation engine
#[account]
pub struct ReputationConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Identity registry program for CPI
    pub identity_registry: Pubkey,
    /// Base reputation score for new identities
    pub base_score: u64,
    /// Maximum reputation score
    pub max_score: u64,
    /// Minimum reputation score
    pub min_score: u64,
    /// Score decay rate per day (basis points, 100 = 1%)
    pub decay_rate_bps: u16,
    /// Last decay run timestamp
    pub last_decay_run: i64,
    /// Bump seed
    pub bump: u8,
}

impl ReputationConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // identity_registry
        8 +  // base_score
        8 +  // max_score
        8 +  // min_score
        2 +  // decay_rate_bps
        8 +  // last_decay_run
        1;   // bump
}

/// Reputation score for an identity
#[account]
pub struct ReputationScore {
    /// Identity this score belongs to
    pub identity: Pubkey,
    /// Current reputation score (0-1000)
    pub score: u64,
    /// Current reputation tier
    pub tier: ReputationTier,
    /// Total positive events
    pub positive_events: u32,
    /// Total negative events
    pub negative_events: u32,
    /// Total points earned (lifetime)
    pub total_points_earned: i64,
    /// Total points lost (lifetime)
    pub total_points_lost: i64,
    /// Last event timestamp
    pub last_event: i64,
    /// Created at timestamp
    pub created_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl ReputationScore {
    pub const LEN: usize = 8 + // discriminator
        32 + // identity
        8 +  // score
        1 +  // tier
        4 +  // positive_events
        4 +  // negative_events
        8 +  // total_points_earned
        8 +  // total_points_lost
        8 +  // last_event
        8 +  // created_at
        1;   // bump
}

/// Reputation event record
#[account]
pub struct ReputationEvent {
    /// Identity this event belongs to
    pub identity: Pubkey,
    /// Type of event
    pub event_type: EventType,
    /// Points change (positive or negative)
    pub points: i32,
    /// Score before this event
    pub score_before: u64,
    /// Score after this event
    pub score_after: u64,
    /// Source of the event (e.g., verification oracle, credential manager)
    pub source: Pubkey,
    /// Event timestamp
    pub timestamp: i64,
    /// Optional metadata (e.g., reason)
    pub metadata: [u8; 32],
    /// Bump seed
    pub bump: u8,
}

impl ReputationEvent {
    pub const LEN: usize = 8 + // discriminator
        32 + // identity
        1 +  // event_type
        4 +  // points
        8 +  // score_before
        8 +  // score_after
        32 + // source
        8 +  // timestamp
        32 + // metadata
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReputationTier {
    Bronze,    // 0-300
    Silver,    // 301-500
    Gold,      // 501-700
    Platinum,  // 701-900
    Diamond,   // 901-1000
}

impl Default for ReputationTier {
    fn default() -> Self {
        ReputationTier::Silver // Base score of 500 = Silver
    }
}

impl ReputationTier {
    pub fn from_score(score: u64) -> Self {
        match score {
            0..=300 => ReputationTier::Bronze,
            301..=500 => ReputationTier::Silver,
            501..=700 => ReputationTier::Gold,
            701..=900 => ReputationTier::Platinum,
            _ => ReputationTier::Diamond,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EventType {
    // Positive events
    VerificationCompleted,      // +50
    CredentialIssued,           // +30
    SuccessfulTransaction,      // +10
    StakeDeposited,             // +20
    ConsistentActivity,         // +5

    // Negative events
    VerificationFailed,         // -30
    CredentialRevoked,          // -50
    SuspiciousActivity,         // -40
    StakeSlashed,               // -60
    InactivityPenalty,          // -10
}

impl Default for EventType {
    fn default() -> Self {
        EventType::VerificationCompleted
    }
}

/// Default point values for each event type
pub fn get_default_points(event_type: &EventType) -> i32 {
    match event_type {
        EventType::VerificationCompleted => 50,
        EventType::CredentialIssued => 30,
        EventType::SuccessfulTransaction => 10,
        EventType::StakeDeposited => 20,
        EventType::ConsistentActivity => 5,
        EventType::VerificationFailed => -30,
        EventType::CredentialRevoked => -50,
        EventType::SuspiciousActivity => -40,
        EventType::StakeSlashed => -60,
        EventType::InactivityPenalty => -10,
    }
}
