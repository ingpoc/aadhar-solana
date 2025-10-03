# Solana Program Development Lifecycle

## Complete Guide: Building, Deploying, and Updating Solana Programs

---

## Table of Contents

1. [Understanding Program IDs](#understanding-program-ids)
2. [The Complete Development Workflow](#the-complete-development-workflow)
3. [When to Update Program IDs](#when-to-update-program-ids)
4. [What are IDL Files](#what-are-idl-files)
5. [Where IDL Files Are Used](#where-idl-files-are-used)
6. [Common Scenarios Explained](#common-scenarios-explained)

---

## Understanding Program IDs

### What is a Program ID?

A **Program ID** is a unique identifier (public key) for your Solana program. Think of it like:
- A **street address** for your program on the blockchain
- A **unique identifier** that never changes for a deployed program
- A **base58-encoded public key** (e.g., `9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n`)

### Why Programs Need IDs

```
┌─────────────────────────────────────────────────────────┐
│  Blockchain (Solana Network)                            │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ Program A            │  │ Program B            │   │
│  │ ID: 9cDgdU4V...     │  │ ID: 3zNSrpqK...     │   │
│  │ (Identity Registry)  │  │ (Token Program)      │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
│  Clients find programs by their ID                     │
└─────────────────────────────────────────────────────────┘
```

### Where Program IDs Exist

Program IDs must be consistent across **4 locations**:

```
1. Source Code (programs/*/src/lib.rs)
   ├─ declare_id!("9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n");
   └─ This tells the program "I am this address"

2. Anchor.toml (Configuration)
   ├─ [programs.localnet]
   ├─ identity_registry = "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n"
   └─ Anchor uses this to know where to deploy

3. IDL Files (target/idl/*.json)
   ├─ "address": "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n"
   └─ Clients use this to find the program

4. On-Chain (Deployed Program)
   ├─ The actual program living at that address
   └─ Verified with: solana program show <program-id>
```

**❗ Critical Rule**: All 4 locations MUST have the same Program ID!

---

## The Complete Development Workflow

### Scenario 1: First Time Development (New Program)

#### Step 1: Generate a New Program ID

```bash
# Anchor automatically generates IDs during init
anchor init my-program

# Or generate manually
solana-keygen new -o target/deploy/my_program-keypair.json
```

**What happens:**
- Anchor creates a **keypair** (public + private key)
- Public key becomes your **Program ID**
- Private key is used to **deploy** and **upgrade** the program

#### Step 2: Write Your Program

```rust
// programs/my-program/src/lib.rs
use anchor_lang::prelude::*;

// ⚠️ PLACEHOLDER ID - Will be updated after first deployment
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello from my program!");
        Ok(())
    }
}
```

#### Step 3: Build the Program

```bash
anchor build
# or
cargo build-sbf
```

**What happens:**
- Compiles Rust code to BPF (Berkeley Packet Filter) bytecode
- Creates `.so` file: `target/deploy/my_program.so`
- Generates IDL file: `target/idl/my_program.json`

#### Step 4: Deploy to Localnet (First Deployment)

```bash
# Start local validator
solana-test-validator

# Deploy
anchor deploy
# or
solana program deploy target/deploy/my_program.so
```

**What happens:**
```
Before Deployment:
  Program ID (placeholder): Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
  On-chain: ❌ Nothing deployed

After Deployment:
  Deployed to NEW address: 9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
  On-chain: ✅ Program lives at 9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
```

#### Step 5: 🚨 UPDATE Program ID Everywhere

This is **CRITICAL** and where most confusion happens!

**Why?** The placeholder ID in your source code doesn't match the deployed address!

```bash
# ❌ MISMATCH PROBLEM:
Source Code:  declare_id!("Fg6PaFpo...") (placeholder)
Deployed At:  9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n (real)

# This causes:
- DeclaredProgramIdMismatch errors
- IDL discriminators calculated wrong
- Transactions fail
```

**Fix by updating all 4 locations:**

1. **Source Code:**
```rust
// programs/my-program/src/lib.rs
declare_id!("9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n"); // ✅ Updated
```

2. **Anchor.toml:**
```toml
[programs.localnet]
my_program = "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n" # ✅ Updated
```

3. **IDL File:**
```json
{
  "address": "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n"
}
```

4. **On-chain:** Already correct (it's where we got the ID from!)

#### Step 6: Rebuild with Correct ID

```bash
# ⚠️ MUST rebuild after updating declare_id!()
cargo build-sbf

# Regenerate IDL with correct discriminators
# (Our script does this automatically)
./scripts/build-verify-deploy.sh
```

**Why rebuild?**
- `declare_id!()` affects **instruction discriminators**
- Discriminators are SHA256 hashes that depend on the program ID
- Old discriminators won't match deployed program

---

### Scenario 2: Updating an Existing Program

#### When You Make Code Changes

```rust
// You modify your program
pub fn initialize(ctx: Context<Initialize>, new_param: u64) -> Result<()> {
    // Added new_param
    msg!("Hello with param: {}", new_param);
    Ok(())
}
```

#### The Update Process

```bash
# 1. Build with changes
cargo build-sbf

# 2. Upgrade the program (SAME ID)
solana program deploy target/deploy/my_program.so

# ✅ Program ID stays the same!
# ✅ No need to update declare_id!()
```

**What happens:**
```
Before Update:
  Program ID: 9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
  Version: 1 (old code)

After Update:
  Program ID: 9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n (SAME!)
  Version: 2 (new code)
```

#### When IDL Changes

If you added/removed instructions or accounts:

```bash
# Regenerate IDL
anchor build

# Copy new IDL to backend
cp target/idl/my_program.json packages/api/src/idls/

# Restart backend
cd packages/api && npm run dev
```

---

## When to Update Program IDs

### ✅ UPDATE Program IDs When:

#### 1. **First Deployment** (Most Common)
```
Situation: You deployed a program for the first time
Action: Update declare_id!() to match deployed address
Reason: Placeholder ID ≠ Real deployed ID
```

#### 2. **Deploying to Different Network**
```
Situation: Moving from localnet → devnet → mainnet
Action: Deploy gets NEW ID on each network

Example:
  Localnet:  9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
  Devnet:    5xNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY
  Mainnet:   2zMcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH
```

#### 3. **Creating a New Program** (Clean Slate)
```
Situation: Starting a brand new program from scratch
Action: Generate new keypair and ID
Reason: Each program needs unique address
```

### ❌ DON'T UPDATE Program IDs When:

#### 1. **Making Code Changes to Existing Program**
```
❌ Wrong: Change declare_id!() after every code update
✅ Right: Keep same ID, just redeploy
```

#### 2. **Fixing Bugs**
```
❌ Wrong: New bug fix = New ID
✅ Right: Same ID, upgrade program
```

#### 3. **Adding New Instructions**
```
❌ Wrong: Added function = Change ID
✅ Right: Same ID, rebuild, redeploy
```

---

## What are IDL Files?

### IDL = Interface Definition Language

Think of IDL as a **restaurant menu** for your program:

```
Restaurant Menu (IDL)          vs    Actual Kitchen (Program)
───────────────────────────────────────────────────────────────
📋 Menu Item: "Burger"         🍔    Real burger recipe in kitchen
   - Ingredients: bun, patty          (Actual Rust code)
   - Price: $10
   - How to order: "One burger"

📋 Menu Item: "Pizza"          🍕    Real pizza recipe in kitchen
   - Ingredients: dough, cheese       (Actual Rust code)
   - Toppings: pepperoni
   - Price: $15
```

**The waiter (client) reads the menu (IDL) to know:**
- What dishes exist (instructions)
- What ingredients needed (accounts)
- How to order (parameters)

### Example IDL File

```json
{
  "address": "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n",
  "metadata": {
    "name": "identity_registry",
    "version": "0.1.0"
  },
  "instructions": [
    {
      "name": "create_identity",
      "discriminator": [98, 145, 244, 162, 212, 244, 201, 233],
      "accounts": [
        {
          "name": "identity_account",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "did",
          "type": "string"
        },
        {
          "name": "metadata_uri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "IdentityAccount",
      "discriminator": [194, 90, 181, 160, 182, 206, 116, 158]
    }
  ]
}
```

### Key IDL Components

#### 1. **Address** (Program ID)
```json
"address": "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n"
```
Tells clients WHERE to find your program on-chain.

#### 2. **Instructions** (Functions/Methods)
```json
{
  "name": "create_identity",
  "discriminator": [98, 145, 244, 162, 212, 244, 201, 233],
  "args": [...]
}
```
Tells clients WHAT functions are available and HOW to call them.

#### 3. **Discriminator** (Function Signature)
```
Discriminator = First 8 bytes of SHA256("global:create_identity")

Why needed?
  - Solana transactions are just bytes
  - Discriminator tells program WHICH function to call
  - Like a function ID

Example:
  create_identity → [98, 145, 244, ...]
  update_identity → [72, 193, 156, ...]
```

#### 4. **Accounts** (Required Accounts)
```json
"accounts": [
  {
    "name": "identity_account",
    "writable": true
  }
]
```
Tells clients WHICH accounts to pass when calling function.

#### 5. **Args** (Parameters)
```json
"args": [
  {
    "name": "did",
    "type": "string"
  }
]
```
Tells clients WHAT parameters the function expects.

---

## Where IDL Files Are Used

### 1. **Backend API (TypeScript/JavaScript)**

**Location:** `packages/api/src/idls/`

```typescript
// packages/api/src/services/solana.service.ts
import { Program } from '@coral-xyz/anchor';
import identityRegistryIDL from '../idls/identity_registry.json';

// Load program using IDL
const program = new Program(
  identityRegistryIDL,
  provider
);

// Call instruction (Anchor uses IDL to build transaction)
const tx = await program.methods
  .createIdentity(
    did,              // IDL knows this is a string
    metadataUri,      // IDL knows this is a string
    recoveryKeys      // IDL knows this is PublicKey[]
  )
  .accounts({
    identityAccount: identityPDA,  // IDL knows this must be writable
    authority: wallet.publicKey,   // IDL knows this must be signer
    systemProgram: SystemProgram.programId
  })
  .rpc();
```

**What IDL provides to backend:**
- ✅ **Type safety**: TypeScript knows parameter types
- ✅ **Account validation**: Knows which accounts are writable/signers
- ✅ **Discriminators**: Automatically builds correct instruction data
- ✅ **Serialization**: Converts JS objects → Solana bytes

### 2. **Frontend (React/Next.js)**

**Location:** `packages/web/src/idls/` or imported from backend

```typescript
// Frontend using Anchor
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import identityRegistryIDL from './idls/identity_registry.json';

function MyComponent() {
  const wallet = useAnchorWallet();

  const createIdentity = async () => {
    const provider = new AnchorProvider(connection, wallet);
    const program = new Program(identityRegistryIDL, provider);

    // IDL makes this type-safe!
    await program.methods
      .createIdentity("did:example:123", "https://...", [])
      .accounts({ ... })
      .rpc();
  };
}
```

### 3. **Testing (Anchor Tests)**

**Location:** `tests/`

```typescript
// tests/identity-registry.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { IdentityRegistry } from "../target/types/identity_registry";

describe("identity-registry", () => {
  const program = anchor.workspace.IdentityRegistry as Program<IdentityRegistry>;

  it("Creates identity", async () => {
    // IDL provides type-safe testing
    await program.methods
      .createIdentity("did:test:123", "uri", [])
      .accounts({ ... })
      .rpc();
  });
});
```

### 4. **Cross-Program Invocations (CPI)**

```rust
// Another program calling your program
use identity_registry::cpi;

// IDL allows other programs to call yours
cpi::create_identity(
    CpiContext::new(program, accounts),
    did,
    metadata_uri,
    recovery_keys
)?;
```

---

## Common Scenarios Explained

### Scenario: Fresh Development Start

```
Day 1: Create new program
├─ anchor init my-program
├─ Write code with placeholder ID: Fg6PaFpo...
└─ Build: anchor build

Day 2: First deployment
├─ Deploy: anchor deploy
├─ Gets real ID: 9cDgdU4V...
└─ ⚠️ MISMATCH: Placeholder ≠ Real

Day 3: Fix the mismatch
├─ Update declare_id!("9cDgdU4V...")
├─ Update Anchor.toml
├─ Rebuild: cargo build-sbf
├─ Regenerate IDL with correct discriminators
└─ ✅ Everything matches now!

Day 4-∞: Regular development
├─ Make code changes
├─ Rebuild: cargo build-sbf
├─ Redeploy: solana program deploy
└─ ✅ Same ID, no updates needed!
```

### Scenario: We Had 5 Programs

```
Our Situation:
  - 5 programs created with placeholder IDs
  - Deployed to localnet (got 5 new IDs)
  - Source code still had placeholder IDs
  - IDL files generated from placeholder IDs

The Problem:
  Source:   Fg6PaFpo... (placeholder)
  Deployed: 9cDgdU4V... (real)
  Result:   DeclaredProgramIdMismatch ❌

The Fix (What our script does):
  1. Update declare_id!() in all 5 programs
  2. Rebuild all programs
  3. Regenerate IDLs with correct discriminators
  4. Verify everything matches
  5. ✅ All working!
```

### Scenario: Moving Networks

```
Development Flow:
  Localnet (testing)
  ├─ Build program
  ├─ Deploy → ID: 9cDgdU4V...
  ├─ Update declare_id!("9cDgdU4V...")
  └─ Test locally ✅

  Devnet (staging)
  ├─ Deploy to devnet → NEW ID: 5xNSrpqK...
  ├─ Update declare_id!("5xNSrpqK...")
  ├─ Update Anchor.toml [programs.devnet]
  ├─ Rebuild & redeploy
  └─ Test on devnet ✅

  Mainnet (production)
  ├─ Deploy to mainnet → NEW ID: 2zMcyzQM...
  ├─ Update declare_id!("2zMcyzQM...")
  ├─ Update Anchor.toml [programs.mainnet]
  ├─ Rebuild & redeploy
  └─ Production ✅
```

---

## Visual Summary

### Complete Build-Deploy-Update Cycle

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Write Code                                         │
├─────────────────────────────────────────────────────────────┤
│  programs/my-program/src/lib.rs                             │
│  declare_id!("Placeholder-ID");                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Build                                              │
├─────────────────────────────────────────────────────────────┤
│  $ cargo build-sbf                                          │
│  ✅ Creates: target/deploy/my_program.so                    │
│  ✅ Creates: target/idl/my_program.json (with placeholder)  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Deploy (First Time)                                │
├─────────────────────────────────────────────────────────────┤
│  $ solana program deploy target/deploy/my_program.so        │
│  ✅ Deployed to: 9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n │
│  ⚠️  MISMATCH: Placeholder ≠ Real ID                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Update Program ID (ONE TIME ONLY)                  │
├─────────────────────────────────────────────────────────────┤
│  1. Update declare_id!("9cDgdU4V...")                       │
│  2. Update Anchor.toml                                      │
│  3. Rebuild: cargo build-sbf                                │
│  4. Regenerate IDL with correct discriminators              │
│  ✅ Now everything matches!                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Regular Development (No ID changes!)               │
├─────────────────────────────────────────────────────────────┤
│  Make code changes → Build → Deploy → Test                  │
│  ✅ Same ID forever!                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Backend Integration                                │
├─────────────────────────────────────────────────────────────┤
│  $ cp target/idl/*.json packages/api/src/idls/              │
│  Backend uses IDL to:                                       │
│    - Know program address                                   │
│    - Build transactions                                     │
│    - Call instructions type-safely                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Cheat Sheet

### When to Update declare_id!()

| Situation | Update? | Why |
|-----------|---------|-----|
| First deployment | ✅ YES | Placeholder → Real ID |
| Moving to new network | ✅ YES | Different network = Different ID |
| Bug fix in code | ❌ NO | Same program, same ID |
| Adding new function | ❌ NO | Same program, same ID |
| Modifying existing function | ❌ NO | Same program, same ID |
| Complete rewrite | ✅ YES | If starting fresh program |

### IDL Integration Checklist

```bash
# After ANY program changes:
1. Build program
   cargo build-sbf

2. Regenerate IDL (if structure changed)
   ./scripts/build-verify-deploy.sh

3. Copy IDL to backend
   cp target/idl/*.json packages/api/src/idls/

4. Restart backend
   cd packages/api && npm run dev

5. Test endpoints
   curl http://localhost:3000/api/v1/health
```

### File Locations

```
Project Structure:
├── programs/
│   └── my-program/
│       └── src/
│           └── lib.rs          ← declare_id!() here
├── target/
│   ├── deploy/
│   │   └── my_program.so       ← Compiled program
│   └── idl/
│       └── my_program.json     ← IDL file (copy to backend)
├── packages/
│   └── api/
│       └── src/
│           └── idls/
│               └── my_program.json  ← Backend uses this
└── Anchor.toml                 ← Program IDs config
```

---

## Conclusion

**Key Takeaways:**

1. **Program IDs** are permanent addresses for deployed programs
2. **Update declare_id!()** only after first deployment or network changes
3. **IDL files** are the "menu" clients use to interact with programs
4. **Copy IDL to backend** after any instruction/account changes
5. **Use the script** `./scripts/build-verify-deploy.sh` to avoid all errors

**The Golden Rule:**
> Once deployed, a program's ID never changes (unless you deploy a completely new program).

All updates happen at the same ID through program upgrades! 🚀
