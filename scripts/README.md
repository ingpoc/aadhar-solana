# Solana Programs Build & Deploy Scripts

## Overview

This directory contains automated scripts for building, verifying, and deploying AadhaarChain's Solana programs. These scripts handle all the issues encountered during development to ensure a smooth build process.

## Scripts

### `build-verify-deploy.sh`

**Comprehensive build, verification, and deployment script that prevents all common errors.**

#### What It Does

1. **Validator Check**: Verifies Solana local validator is running
2. **Program ID Verification**: Ensures `declare_id!()` in source files matches deployed program IDs
3. **Build Programs**: Compiles all 5 programs with `cargo build-sbf`
4. **IDL Regeneration**: Regenerates IDL files with correct discriminators using Anchor's algorithm
5. **IDL Validation**: Validates IDL files for:
   - Correct program addresses
   - Complete discriminator coverage (instructions & accounts)
   - TypeScript compatibility (`"publicKey"` not `"pubkey"`)
6. **Deployment**: Deploys programs to local validator
7. **Verification**: Verifies all programs are on-chain

#### Usage

```bash
# Make executable (first time only)
chmod +x scripts/build-verify-deploy.sh

# Run the script
./scripts/build-verify-deploy.sh
```

#### Issues This Script Prevents

##### 1. **DeclaredProgramIdMismatch Error**
- **Problem**: Program source had placeholder IDs, but deployed programs had different IDs
- **Solution**: Automatically verifies and fixes `declare_id!()` in source files
- **Fix Applied**: Updates all 5 program source files with correct deployed program IDs

##### 2. **IDL Discriminator Errors**
- **Problem**: IDL discriminators calculated from wrong program IDs
- **Solution**: Regenerates discriminators using Anchor's sha256 algorithm:
  - Instructions: `sha256("global:<instruction_name>")[:8]`
  - Accounts: `sha256("account:<AccountName>")[:8]`

##### 3. **TypeScript IDL Incompatibility**
- **Problem**: IDL files had `"pubkey"` type, but Anchor TypeScript expects `"publicKey"`
- **Solution**: Automatically replaces all `"pubkey"` → `"publicKey"` in IDL files

##### 4. **Missing Discriminators**
- **Problem**: Some IDL files missing instruction or account discriminators
- **Solution**: Validates 100% discriminator coverage and regenerates if needed

##### 5. **Build Failures**
- **Problem**: Programs fail to compile due to various issues
- **Solution**: Catches build errors early and provides clear error messages

## Program IDs

All programs are deployed with the following IDs:

| Program | Program ID |
|---------|-----------|
| Identity Registry | `9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n` |
| Verification Oracle | `3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY` |
| Credential Manager | `7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP` |
| Reputation Engine | `27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH` |
| Staking Manager | `GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh` |

## Expected Output

```
╔════════════════════════════════════════════════════════════╗
║   AadhaarChain Solana Programs - Build & Deploy Script    ║
╚════════════════════════════════════════════════════════════╝

[1/7] Checking Solana validator...
✓ Solana validator running

[2/7] Verifying program IDs in source files...
✓ identity-registry: 9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
✓ verification-oracle: 3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY
✓ credential-manager: 7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP
✓ reputation-engine: 27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH
✓ staking-manager: GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh

[3/7] Building all programs with cargo build-sbf...
✓ All programs built successfully

[4/7] Regenerating IDL files with correct discriminators...
✓ identity_registry: 6 instructions, 2 accounts
✓ verification_oracle: 3 instructions, 1 accounts
✓ credential_manager: 2 instructions, 1 accounts
✓ reputation_engine: 2 instructions, 1 accounts
✓ staking_manager: 3 instructions, 1 accounts

[5/7] Validating IDL files...
✓ All IDL files valid

[6/7] Deploying programs to local validator...
✓ All programs deployed

[7/7] Verifying deployments...
✓ All programs verified on-chain

╔════════════════════════════════════════════════════════════╗
║                   🎉 SUCCESS! 🎉                           ║
╚════════════════════════════════════════════════════════════╝

Platform Status: 100% READY 🚀
```

## Next Steps After Running Script

1. **Copy IDL files to backend:**
   ```bash
   cp target/idl/*.json packages/api/src/idls/
   ```

2. **Restart backend server:**
   ```bash
   cd packages/api && npm run dev
   ```

3. **Test transactions:**
   - Should work without `DeclaredProgramIdMismatch` errors
   - Should return real transaction signatures

## Troubleshooting

### Validator Not Running
```
✗ Solana validator not running on localhost:8899
  Start it with: solana-test-validator
```
**Solution**: Start the validator in a separate terminal:
```bash
solana-test-validator
```

### Build Failures
**Solution**: Check the error message and ensure:
- Rust toolchain is installed
- Solana CLI tools are installed
- All dependencies in Cargo.toml are correct

### IDL Validation Errors
**Solution**: The script will automatically fix most IDL issues. If errors persist:
1. Delete `target/idl/*.json`
2. Run the script again

## Technical Details

### Discriminator Calculation

The script uses Anchor's standard discriminator algorithm:

```python
import hashlib

# For instructions
preimage = f"global:{instruction_name}"
discriminator = hashlib.sha256(preimage.encode()).digest()[:8]

# For accounts
preimage = f"account:{AccountName}"
discriminator = hashlib.sha256(preimage.encode()).digest()[:8]
```

### Program ID Verification

The script verifies that `declare_id!()` in each program's `src/lib.rs` matches:
- The deployed program ID on-chain
- The program ID in `Anchor.toml`
- The program ID in IDL files

If mismatches are found, the script automatically fixes them.

## Development Workflow

**For regular development:**
```bash
# 1. Make changes to Solana programs
# 2. Run the comprehensive script
./scripts/build-verify-deploy.sh

# 3. Copy IDL files to backend
cp target/idl/*.json packages/api/src/idls/

# 4. Restart backend
cd packages/api && npm run dev
```

**For quick builds (no deployment):**
```bash
cargo build-sbf
```

**For testing:**
```bash
anchor test
```

## Files Modified by Script

- **Source Files**: `programs/*/src/lib.rs` (declare_id! updates)
- **IDL Files**: `target/idl/*.json` (program IDs, discriminators, types)
- **Compiled Binaries**: `target/deploy/*.so` (rebuilt)

## Related Documentation

- [Anchor IDL Documentation](https://www.anchor-lang.com/docs/basics/idl)
- [Solana Program Deployment](https://docs.solana.com/cli/deploy-a-program)
- [Project Architecture](.docs/CURRENT_ARCHITECTURE.html)
- [Agent Communication](.docs/AGENT_COMMUNICATION.md)
