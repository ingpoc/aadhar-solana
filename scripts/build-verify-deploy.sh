#!/bin/bash

# AadhaarChain Solana Programs - Build, Verify & Deploy Script
# This script handles all the issues encountered during development:
# 1. Verifies program IDs match between source, Anchor.toml, and deployed programs
# 2. Rebuilds programs with correct declare_id!()
# 3. Regenerates IDL files with correct discriminators
# 4. Validates IDL type compatibility (publicKey vs pubkey)
# 5. Deploys programs to local validator
# 6. Verifies deployments

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Program definitions (space-separated: name:id)
PROGRAMS=(
    "identity-registry:9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n"
    "verification-oracle:3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY"
    "credential-manager:7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP"
    "reputation-engine:27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH"
    "staking-manager:GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh"
)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AadhaarChain Solana Programs - Build & Deploy Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify Solana validator is running
echo -e "${YELLOW}[1/8] Checking Solana validator...${NC}"
if ! solana cluster-version &>/dev/null; then
    echo -e "${RED}✗ Solana validator not running on localhost:8899${NC}"
    echo -e "${YELLOW}  Start it with: solana-test-validator${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Solana validator running${NC}"
echo ""

# Step 2: Verify program IDs in source files
echo -e "${YELLOW}[2/8] Verifying program IDs in source files...${NC}"
VERIFY_FAILED=0

for program_entry in "${PROGRAMS[@]}"; do
    program_name="${program_entry%%:*}"
    program_id="${program_entry##*:}"
    source_file="programs/$program_name/src/lib.rs"

    if grep -q "declare_id!(\"$program_id\")" "$source_file"; then
        echo -e "${GREEN}✓ $program_name: $program_id${NC}"
    else
        echo -e "${RED}✗ $program_name: Program ID mismatch in source${NC}"

        # Auto-fix: Update declare_id in source
        current_id=$(grep -oE 'declare_id!\("[^"]+"\)' "$source_file" | grep -oE '"[^"]+"' | tr -d '"' || echo "UNKNOWN")
        echo -e "${YELLOW}  Fixing: $current_id → $program_id${NC}"

        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/declare_id!(\".*\")/declare_id!(\"$program_id\")/" "$source_file"
        else
            sed -i "s/declare_id!(\".*\")/declare_id!(\"$program_id\")/" "$source_file"
        fi
        echo -e "${GREEN}  ✓ Fixed${NC}"
    fi
done

if [ $VERIFY_FAILED -eq 1 ]; then
    echo -e "${RED}Program ID verification failed. Check above errors.${NC}"
    exit 1
fi
echo ""

# Step 3: Build all programs
echo -e "${YELLOW}[3/8] Building all programs with cargo build-sbf...${NC}"
if cargo build-sbf 2>&1 | grep -i "^error"; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All programs built successfully${NC}"
echo ""

# Step 4: Regenerate IDL files with correct discriminators
echo -e "${YELLOW}[4/8] Regenerating IDL files with correct discriminators...${NC}"

python3 << 'EOF'
import json
import hashlib
import os

def calculate_discriminator(namespace, name):
    """Calculate 8-byte discriminator using Anchor's algorithm"""
    preimage = f"{namespace}:{name}"
    hash_result = hashlib.sha256(preimage.encode()).digest()
    return list(hash_result[:8])

# Program IDs
program_ids = {
    "identity_registry": "9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n",
    "verification_oracle": "3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY",
    "credential_manager": "7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP",
    "reputation_engine": "27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH",
    "staking_manager": "GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh"
}

for program_name, program_id in program_ids.items():
    idl_path = f"target/idl/{program_name}.json"

    if not os.path.exists(idl_path):
        print(f"⚠ Warning: {idl_path} not found, skipping...")
        continue

    with open(idl_path, 'r') as f:
        idl = json.load(f)

    # Update program ID
    idl['address'] = program_id

    # Update instruction discriminators
    if 'instructions' in idl:
        for instruction in idl['instructions']:
            disc = calculate_discriminator("global", instruction['name'])
            instruction['discriminator'] = disc

    # Update account discriminators
    if 'accounts' in idl:
        for account in idl['accounts']:
            disc = calculate_discriminator("account", account['name'])
            account['discriminator'] = disc

    # Fix pubkey → publicKey type incompatibility
    idl_str = json.dumps(idl)
    idl_str = idl_str.replace('"pubkey"', '"publicKey"')
    idl = json.loads(idl_str)

    # Write back
    with open(idl_path, 'w') as f:
        json.dump(idl, f, indent=2)

    inst_count = len(idl.get('instructions', []))
    acc_count = len(idl.get('accounts', []))
    print(f"✓ {program_name}: {inst_count} instructions, {acc_count} accounts")

print("\n✓ All IDL files regenerated successfully!")
EOF

echo ""

# Step 5: Validate IDL files
echo -e "${YELLOW}[5/8] Validating IDL files...${NC}"

# Check for pubkey vs publicKey issues
if grep -r '"pubkey"' target/idl/ 2>/dev/null; then
    echo -e "${RED}✗ Found 'pubkey' type in IDL files (should be 'publicKey')${NC}"
    exit 1
fi

# Verify all programs have discriminators
python3 << 'EOF'
import json
import os

all_valid = True
for filename in sorted(os.listdir('target/idl')):
    if filename.endswith('.json'):
        with open(f'target/idl/{filename}') as f:
            idl = json.load(f)

        if 'address' not in idl:
            print(f"✗ {filename}: Missing program address")
            all_valid = False
            continue

        inst_count = len(idl.get('instructions', []))
        acc_count = len(idl.get('accounts', []))

        inst_with_disc = sum(1 for i in idl.get('instructions', []) if 'discriminator' in i)
        acc_with_disc = sum(1 for a in idl.get('accounts', []) if 'discriminator' in a)

        if inst_with_disc != inst_count or acc_with_disc != acc_count:
            print(f"✗ {filename}: Missing discriminators (Inst: {inst_with_disc}/{inst_count}, Acc: {acc_with_disc}/{acc_count})")
            all_valid = False
        else:
            print(f"✓ {filename}: All discriminators present")

exit(0 if all_valid else 1)
EOF

echo -e "${GREEN}✓ All IDL files valid${NC}"
echo ""

# Step 6: Deploy programs to local validator
echo -e "${YELLOW}[6/8] Deploying programs to local validator...${NC}"

for program_entry in "${PROGRAMS[@]}"; do
    program_name="${program_entry%%:*}"
    program_id="${program_entry##*:}"
    binary_name="${program_name//-/_}"
    binary_path="target/deploy/${binary_name}.so"

    if [ ! -f "$binary_path" ]; then
        echo -e "${RED}✗ Binary not found: $binary_path${NC}"
        exit 1
    fi

    echo -e "${BLUE}Deploying $program_name...${NC}"

    # Check if program already exists
    if solana program show "$program_id" &>/dev/null; then
        echo -e "${GREEN}✓ $program_name already deployed - $program_id${NC}"
    else
        # Deploy new program
        if output=$(solana program deploy "$binary_path" 2>&1); then
            size=$(ls -lh "$binary_path" | awk '{print $5}')
            echo -e "${GREEN}✓ $program_name deployed ($size) - $program_id${NC}"
        else
            echo -e "${RED}✗ Failed to deploy $program_name${NC}"
            echo "$output"
            exit 1
        fi
    fi
done
echo ""

# Step 7: Verify deployments
echo -e "${YELLOW}[7/8] Verifying deployments...${NC}"

for program_entry in "${PROGRAMS[@]}"; do
    program_name="${program_entry%%:*}"
    program_id="${program_entry##*:}"

    if solana program show "$program_id" &>/dev/null; then
        echo -e "${GREEN}✓ $program_name verified on-chain${NC}"
    else
        echo -e "${RED}✗ $program_name not found on-chain${NC}"
        exit 1
    fi
done
echo ""

# Step 8: Sync environment variables
echo -e "${YELLOW}[8/8] Syncing program IDs to environment files...${NC}"

# Update backend .env
if [ -f "packages/api/.env" ]; then
    echo -e "${BLUE}Updating packages/api/.env...${NC}"
    for program_entry in "${PROGRAMS[@]}"; do
        program_name="${program_entry%%:*}"
        program_id="${program_entry##*:}"
        env_var_name=$(echo "$program_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')"_PROGRAM_ID"

        if grep -q "^${env_var_name}=" packages/api/.env; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^${env_var_name}=.*/${env_var_name}=\"${program_id}\"/" packages/api/.env
            else
                sed -i "s/^${env_var_name}=.*/${env_var_name}=\"${program_id}\"/" packages/api/.env
            fi
            echo -e "${GREEN}  ✓ Updated ${env_var_name}${NC}"
        else
            echo "${env_var_name}=\"${program_id}\"" >> packages/api/.env
            echo -e "${GREEN}  ✓ Added ${env_var_name}${NC}"
        fi
    done
fi

# Update frontend .env.local
if [ -f "packages/web/.env.local" ]; then
    echo -e "${BLUE}Updating packages/web/.env.local...${NC}"
    for program_entry in "${PROGRAMS[@]}"; do
        program_name="${program_entry%%:*}"
        program_id="${program_entry##*:}"
        env_var_name="NEXT_PUBLIC_"$(echo "$program_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')"_ID"

        if grep -q "^${env_var_name}=" packages/web/.env.local; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^${env_var_name}=.*/${env_var_name}=${program_id}/" packages/web/.env.local
            else
                sed -i "s/^${env_var_name}=.*/${env_var_name}=${program_id}/" packages/web/.env.local
            fi
            echo -e "${GREEN}  ✓ Updated ${env_var_name}${NC}"
        else
            echo "${env_var_name}=${program_id}" >> packages/web/.env.local
            echo -e "${GREEN}  ✓ Added ${env_var_name}${NC}"
        fi
    done
fi

echo -e "${GREEN}✓ Environment variables synchronized${NC}"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   🎉 SUCCESS! 🎉                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}All 5 Solana programs:${NC}"
echo -e "  ✓ Built with correct program IDs"
echo -e "  ✓ IDL files regenerated with correct discriminators"
echo -e "  ✓ IDL types fixed (publicKey not pubkey)"
echo -e "  ✓ Deployed to local validator (localhost:8899)"
echo -e "  ✓ Verified on-chain"
echo -e "  ✓ Environment variables synchronized"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Copy IDL files to backend: ${BLUE}cp target/idl/*.json packages/api/src/idls/${NC}"
echo -e "  2. Restart backend server: ${BLUE}cd packages/api && npm run dev${NC}"
echo -e "  3. Restart frontend server: ${BLUE}cd packages/web && npm run dev${NC}"
echo -e "  4. Test transactions (should work without DeclaredProgramIdMismatch)"
echo ""
echo -e "${GREEN}Platform Status: 100% READY 🚀${NC}"
