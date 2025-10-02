# Deployed Solana Programs - Local Validator

**Deployment Date:** October 2, 2025
**Network:** Local Validator (localhost:8899)
**Status:** ✅ All 5 Programs Successfully Deployed

## Program IDs

### 1. Identity Registry
- **Program ID:** `9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n`
- **Size:** 240,256 bytes (235 KB)
- **Balance:** 1.67 SOL
- **Features:** DID creation, verification bitmap, reputation tracking, recovery mechanisms

### 2. Verification Oracle
- **Program ID:** `3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY`
- **Size:** 255,008 bytes (249 KB)
- **Balance:** 1.78 SOL
- **Features:** Proof submission/verification, CPI to identity registry, expiry management

### 3. Credential Manager
- **Program ID:** `7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP`
- **Size:** 276,016 bytes (270 KB)
- **Balance:** 1.92 SOL
- **Features:** W3C-style credentials, issuer registry, revocation, transfer capabilities

### 4. Reputation Engine
- **Program ID:** `27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH`
- **Size:** 248,496 bytes (243 KB)
- **Balance:** 1.73 SOL
- **Features:** Time-decay scoring, activity tracking, challenge system, CPI integration

### 5. Staking Manager
- **Program ID:** `GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh`
- **Size:** 266,472 bytes (260 KB)
- **Balance:** 1.86 SOL
- **Features:** Economic incentives, lockups, rewards calculation, slashing, treasury

## Environment Variables

Update your `.env` files with these program IDs:

```bash
# Solana Program IDs (Local Validator)
IDENTITY_REGISTRY_PROGRAM_ID=9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
VERIFICATION_ORACLE_PROGRAM_ID=3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY
CREDENTIAL_MANAGER_PROGRAM_ID=7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP
REPUTATION_ENGINE_PROGRAM_ID=27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH
STAKING_MANAGER_PROGRAM_ID=GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh
```

## IDL Files Location

All program IDL files are available at:
- `target/idl/identity_registry.json`
- `target/idl/verification_oracle.json`
- `target/idl/credential_manager.json`
- `target/idl/reputation_engine.json`
- `target/idl/staking_manager.json`

## Deployment Commands Used

```bash
# Build all programs
cargo build-sbf (in each program directory)

# Deploy to local validator
solana program deploy target/deploy/identity_registry.so
solana program deploy target/deploy/verification_oracle.so
solana program deploy target/deploy/credential_manager.so
solana program deploy target/deploy/reputation_engine.so
solana program deploy target/deploy/staking_manager.so
```

## Verification

All programs verified successfully:
```bash
solana program show <PROGRAM_ID>
```

## Next Steps for Backend Integration

1. Copy the program IDs above to your backend `.env` file
2. Load IDL files from `target/idl/` directory
3. Initialize Anchor Program instances with these IDs
4. Replace mock signatures in SolanaService with real program calls

See `.docs/CURRENT_ARCHITECTURE.html` (Recommendations tab) for detailed integration guide.
