#!/usr/bin/env bash
# Build, deploy, and test all aadhar-solana Anchor programs against local validator.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== aadhar-solana on-chain validation ==="

if ! solana cluster-version --url localhost >/dev/null 2>&1; then
  echo "Start validator first:"
  echo "  ./scripts/start-validator.sh"
  exit 1
fi

solana config set --url localhost >/dev/null
solana airdrop 5 >/dev/null 2>&1 || true

echo "Syncing program IDs from deploy keypairs..."
anchor keys sync

echo "Building programs..."
anchor build

echo "Deploying to local validator..."
anchor deploy

echo "Running integration tests..."
anchor test --skip-local-validator

echo ""
echo "=== All on-chain tests passed ==="
echo "Program IDs (localnet):"
anchor keys list
