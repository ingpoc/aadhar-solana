#!/usr/bin/env bash
# Start local solana-test-validator on :8899.
# Agave 2.2+ may never create admin.rpc — do NOT treat missing admin.rpc as corruption.
# Fresh ledger (on-chain tests): ./scripts/start-validator.sh --reset
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LEDGER="$ROOT/.local-validator"
RESET=0
[[ "${1:-}" == "--reset" ]] && RESET=1

rpc_ok() {
  curl -s --connect-timeout 2 http://127.0.0.1:8899 \
    -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null \
    | grep -q '"ok"'
}

if rpc_ok; then
  echo "Validator already healthy on :8899"
  solana cluster-version --url localhost 2>/dev/null || true
  exit 0
fi

if lsof -ti:8899 >/dev/null 2>&1; then
  echo "Port :8899 is in use but getHealth is not ok — investigate; do not pkill for portfolio browser lanes" >&2
  exit 1
fi

if [[ "$RESET" -eq 1 ]]; then
  echo "Resetting ledger: $LEDGER"
  rm -rf "$LEDGER"
fi

echo "Starting solana-test-validator (ledger: $LEDGER)"
solana config set --url localhost >/dev/null

mkdir -p "$LEDGER"

if [[ ! -f "$LEDGER/genesis.bin" ]]; then
  exec solana-test-validator --ledger "$LEDGER" --reset
fi

exec solana-test-validator --ledger "$LEDGER"
