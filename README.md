# aadhar-solana

`aadhar-solana` is the Solana and NestJS identity-layer candidate for AadhaarChain. In the current portfolio it is a migration/bridge target, not the active trust source of truth.

The active local trust producer remains `aadhaar-chain` until the bridge contract, signer/oracle model, credential issuance path, revocation propagation, and downstream read semantics are fully verified.

## Portfolio Role

- Anchor programs for identity registry, verification oracle, credential manager, reputation, and staking.
- NestJS/API, web, mobile, shared packages, and scripts for the long-term Solana-backed identity layer.
- Validator-backed testbed for adversarial identity and credential behavior.

Non-goals in the current portfolio state:

- Do not point buyer, seller, FlatWatch, or the shared agent control plane directly at this repo for trust state.
- Do not store raw Aadhaar, PAN, OCR evidence, or private identity data on-chain.
- Do not issue transferable credentials for identity-derived schemas such as Aadhaar, PAN, bank-account, or address-proof credentials.

## Project Structure

```text
aadhar-solana/
├── programs/              # Solana programs (Rust/Anchor)
├── packages/
│   ├── api/               # Backend API (NestJS/TypeScript)
│   ├── web/               # Web frontend (Next.js)
│   ├── mobile/            # Mobile app (React Native)
│   └── shared/            # Shared utilities and types
├── scripts/               # Deployment and utility scripts
├── tests/                 # Integration and E2E tests
└── .docs/                 # Project documentation
```

## Prerequisites

- Node.js 18+
- Yarn
- Rust
- Solana CLI
- Anchor CLI `0.31.1`
- PostgreSQL
- Redis

## Local Verification

Install dependencies:

```bash
yarn install --frozen-lockfile
```

Build and test Anchor programs:

```bash
yarn anchor:build
yarn anchor:test
```

The local validator path has been verified with `yarn anchor:test`. Current adversarial coverage includes unauthorized verification updates, issuer impersonation, identity-derived credential transfer misuse, oracle double response, fee-vault payment handling, and oracle slashing/deactivation.

## Bridge Status

Before this repo can become a trust producer for portfolio apps, the bridge to `aadhaar-chain` must define and verify:

- verification event schema
- signer/oracle identity
- downstream attestation format
- credential issuance path
- revocation propagation
- trust read semantics compatible with `TRUST-CONSUMER-CONTRACT.md`

Until then, downstream apps must continue consuming the FastAPI gateway trust contract from `aadhaar-chain`.
