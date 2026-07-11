#!/usr/bin/env bash
# Ensure :8899 answers JSON-RPC getHealth. For portfolio burner SSO / --require-rpc.
# Do not pkill or rm .local-validator here — that is on-chain-test mutex only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
START="$ROOT/scripts/start-validator.sh"
LOG="${TMPDIR:-/tmp}/aadharsolana-validator.log"
WAIT_SECS="${ENSURE_VALIDATOR_WAIT:-45}"

rpc_ok() {
  curl -s --connect-timeout 2 http://127.0.0.1:8899 \
    -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null \
    | grep -q '"ok"'
}

if rpc_ok; then
  echo "✓ Solana validator :8899 healthy"
  exit 0
fi

if lsof -ti:8899 >/dev/null 2>&1; then
  echo "→ Port :8899 busy; waiting up to ${WAIT_SECS}s for getHealth…"
  for ((i = 1; i <= WAIT_SECS; i++)); do
    rpc_ok && echo "✓ Solana validator :8899 healthy" && exit 0
    sleep 1
  done
  echo "✗ :8899 up but getHealth never ok — do not pkill for browser lanes; check validator.log" >&2
  exit 1
fi

echo "→ Starting validator (log: $LOG)"
# start-validator.sh execs the binary — background the whole script
nohup bash "$START" >"$LOG" 2>&1 &
disown || true

for ((i = 1; i <= WAIT_SECS; i++)); do
  if rpc_ok; then
    echo "✓ Solana validator :8899 healthy (started)"
    exit 0
  fi
  sleep 1
done

echo "✗ Validator did not become healthy within ${WAIT_SECS}s — see $LOG" >&2
tail -20 "$LOG" >&2 || true
exit 1
