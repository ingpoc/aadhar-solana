# CLAUDE.md - Solana Programs (Smart Contracts)

## Overview

This directory contains 5 interconnected Solana programs built with the Anchor framework that form the blockchain layer of AadhaarChain.

## Programs

| Program | Purpose | Program ID (Localnet) |
|---------|---------|----------------------|
| `identity-registry` | Core DID management, W3C DID standard compliance | `9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n` |
| `verification-oracle` | Bridge between API Setu (gov APIs) and blockchain | `3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY` |
| `credential-manager` | Verifiable credential lifecycle management | `7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP` |
| `reputation-engine` | Decentralized reputation scoring system | `27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH` |
| `staking-manager` | Economic incentives through SOL staking | `GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh` |

## Build & Test Commands

```bash
# From project root
yarn anchor:build       # Build all programs
yarn anchor:test        # Run all program tests
yarn anchor:deploy      # Deploy to localnet

# From this directory
anchor build            # Build programs
anchor test             # Run tests with localnet
anchor deploy           # Deploy to configured cluster

# Individual program build
anchor build -p identity_registry
```

## Technology Stack

- **Language**: Rust 1.70+
- **Framework**: Anchor 0.30.1
- **Solana SDK**: anchor-lang 0.29.0, anchor-spl 0.29.0
- **Testing**: Mocha + ts-mocha (TypeScript tests)

## Directory Structure

```
programs/
├── identity-registry/
│   ├── Cargo.toml           # Package manifest
│   └── src/
│       ├── lib.rs           # Program entry point, instruction handlers
│       ├── state/           # Account structures
│       │   └── mod.rs       # Identity account definitions
│       └── instructions/    # Instruction implementations
├── verification-oracle/
├── credential-manager/
├── reputation-engine/
└── staking-manager/
```

## Code Conventions

### Naming
- **Program names**: kebab-case in directories (`identity-registry`)
- **Rust modules**: snake_case (`identity_registry`)
- **Account structs**: PascalCase (`IdentityAccount`)
- **Functions**: snake_case (`create_identity`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_NAME_LENGTH`)

### Account Structure Pattern
```rust
#[account]
#[derive(Default)]
pub struct IdentityAccount {
    pub owner: Pubkey,           // 32 bytes
    pub did: String,             // 4 + len bytes
    pub verification_status: u64, // 8 bytes (bitmap)
    pub created_at: i64,         // 8 bytes
    pub bump: u8,                // 1 byte
}
```

### PDA (Program Derived Address) Pattern
```rust
#[derive(Accounts)]
pub struct CreateIdentity<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + IdentityAccount::INIT_SPACE,
        seeds = [b"identity", authority.key().as_ref()],
        bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

### Verification Bitmap Pattern
The `verification_status` field uses a u64 bitmap for efficient storage:
```rust
pub const AADHAAR_VERIFIED: u64 = 1 << 0;  // 0x0001
pub const PAN_VERIFIED: u64 = 1 << 1;      // 0x0002
pub const PHONE_VERIFIED: u64 = 1 << 2;    // 0x0004
pub const EMAIL_VERIFIED: u64 = 1 << 3;    // 0x0008
// ... up to 64 verification types
```

## Key Patterns

### Cross-Program Invocation (CPI)
Programs communicate via CPI for complex operations:
```rust
// Example: Identity registry calling credential manager
let cpi_accounts = IssueCredential {
    identity: ctx.accounts.identity.to_account_info(),
    credential: ctx.accounts.credential.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};
let cpi_program = ctx.accounts.credential_program.to_account_info();
let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
credential_manager::cpi::issue_credential(cpi_ctx, credential_data)?;
```

### Error Handling
```rust
#[error_code]
pub enum IdentityError {
    #[msg("Identity already exists for this wallet")]
    IdentityAlreadyExists,
    #[msg("Unauthorized: Only owner can modify")]
    Unauthorized,
    #[msg("Invalid verification type")]
    InvalidVerificationType,
}
```

## Security Requirements

### Critical Security Practices
- **Always** verify signer authority before state mutations
- **Always** use PDA seeds that include the user's pubkey for ownership
- **Never** trust client-provided data without validation
- **Use** `require!` macro for all precondition checks
- **Implement** proper account validation with Anchor constraints

### Account Validation
```rust
#[account(
    mut,
    has_one = owner @ IdentityError::Unauthorized,
    seeds = [b"identity", owner.key().as_ref()],
    bump = identity_account.bump
)]
pub identity_account: Account<'info, IdentityAccount>,
```

### Size Calculations
Always calculate account space accurately:
```rust
impl IdentityAccount {
    pub const INIT_SPACE: usize =
        32 +     // owner: Pubkey
        4 + 64 + // did: String (max 64 chars)
        8 +      // verification_status: u64
        8 +      // created_at: i64
        1;       // bump: u8
}
```

## Testing

Tests are written in TypeScript using Mocha:

```bash
# Run all tests
anchor test

# Run specific program tests
anchor test --skip-build -- --grep "identity"
```

### Test File Location
Tests are in `/tests/` directory at project root:
```
tests/
├── identity-registry.ts
├── verification-oracle.ts
├── credential-manager.ts
├── reputation-engine.ts
└── staking-manager.ts
```

### Test Pattern
```typescript
describe("identity-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.IdentityRegistry;

  it("creates an identity", async () => {
    const [identityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("identity"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createIdentity("did:aadhaar:1234567890")
      .accounts({
        identityAccount: identityPda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });
});
```

## Deployment

### Localnet (Development)
```bash
# Start local validator
solana-test-validator

# Deploy programs
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID>
```

### Devnet/Mainnet
1. Update `Anchor.toml` cluster setting
2. Ensure wallet has sufficient SOL
3. Run `anchor deploy --provider.cluster devnet`
4. Update program IDs in configuration

## Common Issues

### "Account not found"
- Ensure PDA seeds match exactly between creation and lookup
- Check that the account was initialized before access

### "Insufficient funds"
- The payer account needs SOL for rent-exempt account creation
- Calculate: `8 + InitSpace` bytes * rent rate

### "Program failed to complete"
- Check compute unit limits (default 200k)
- Add `#[instruction(compute_units = 400000)]` if needed

## Program Interactions

```
┌─────────────────────┐
│  identity-registry  │◄──────────────────────┐
└─────────┬───────────┘                       │
          │ CPI                               │ CPI
          ▼                                   │
┌─────────────────────┐    CPI    ┌───────────┴───────┐
│ verification-oracle │◄─────────►│ credential-manager│
└─────────────────────┘           └───────────────────┘
          │                                   │
          │ CPI                               │ CPI
          ▼                                   ▼
┌─────────────────────┐           ┌───────────────────┐
│  reputation-engine  │◄─────────►│  staking-manager  │
└─────────────────────┘    CPI    └───────────────────┘
```
