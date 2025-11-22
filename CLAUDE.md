# CLAUDE.md - AadhaarChain Project Guide

## Project Overview

AadhaarChain is a production-ready, self-sovereign identity platform that bridges India's government-grade identity verification (Aadhaar/PAN) with blockchain-based decentralized ownership. Built on the Solana blockchain using a monorepo architecture.

## Quick Reference

### Build & Run Commands

```bash
# Root level commands (Yarn workspaces)
yarn build              # Build all packages
yarn test               # Test all packages
yarn dev                # Run dev mode for all packages

# Solana programs (Anchor)
yarn anchor:build       # Build Solana programs
yarn anchor:test        # Test Solana programs
yarn anchor:deploy      # Deploy programs to localnet

# Individual packages
cd packages/api && yarn dev      # Start API server (port 3001)
cd packages/web && yarn dev      # Start web frontend (port 3000)
cd packages/mobile && yarn start # Start React Native metro bundler
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Solana + Anchor Framework 0.30.1 |
| Smart Contracts | Rust 1.70+ |
| Backend API | NestJS 10 + TypeScript 5 + Prisma 5 |
| Database | PostgreSQL 14+ |
| Cache | Redis |
| Web Frontend | Next.js 14 + React 18 + Tailwind CSS |
| Mobile | React Native 0.72 + Redux Toolkit |

## Project Structure

```
aadhar-solana/
├── programs/           # Solana smart contracts (Rust/Anchor)
│   ├── identity-registry/      # Core DID management
│   ├── verification-oracle/    # Government API bridge
│   ├── credential-manager/     # Verifiable credentials
│   ├── reputation-engine/      # Reputation scoring
│   └── staking-manager/        # SOL staking incentives
├── packages/
│   ├── api/            # NestJS backend REST API
│   ├── mobile/         # React Native mobile app
│   └── web/            # Next.js web frontend
├── scripts/            # Deployment scripts
└── .docs/              # Documentation
```

## Architecture Patterns

### 6-Layer Architecture
1. **Layer 1**: External Integration (API Setu, Government APIs)
2. **Layer 2**: Data Persistence (PostgreSQL, Redis, IPFS)
3. **Layer 3**: Solana Blockchain (5 interconnected programs)
4. **Layer 4**: Privacy & Security (ZK-proofs, AES-256-GCM)
5. **Layer 5**: Application Services (NestJS modules)
6. **Layer 6**: User Interfaces (Web, Mobile)

### Key Design Patterns
- **Program Derived Addresses (PDAs)**: Deterministic Solana account creation
- **Verification Bitmap**: Efficient multi-verification storage using u64 flags
- **Hybrid Storage**: On-chain state + off-chain data + IPFS documents
- **Cross-Program Invocation (CPI)**: Inter-program communication

## Code Conventions

### Naming
- **Files**: kebab-case (`identity-registry.ts`)
- **Classes/Types**: PascalCase (`IdentityRegistry`)
- **Functions/Variables**: camelCase (`verifyIdentity`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Solana Accounts**: snake_case (`identity_account`)

### File Organization
- **NestJS**: Feature modules with `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`
- **React/RN**: Component files with `.tsx`, hooks with `use` prefix
- **Rust**: `lib.rs` entry, `state/` for accounts, `instructions/` for handlers

### Database
- UUID primary keys
- Timestamp tracking (`createdAt`, `updatedAt`)
- Prisma ORM with migrations in `packages/api/prisma/`

## Security Requirements

### Critical Security Practices
- **Never** store private keys in code or environment files committed to git
- **Always** validate input using `class-validator` decorators
- **Use** AES-256-GCM for sensitive data encryption
- **Implement** rate limiting on all public endpoints
- **Verify** all Solana signatures before processing transactions

### OWASP Top 10 Awareness
- Validate all user inputs at API boundaries
- Use parameterized queries (Prisma handles this)
- Implement proper authentication/authorization
- No sensitive data in logs or error messages

## Testing

```bash
# Run all tests
yarn test

# Solana program tests
yarn anchor:test

# API tests
cd packages/api && yarn test

# With coverage
yarn test --coverage
```

## Environment Setup

Required environment variables (see `.env.example` in each package):

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aadhaarchain

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Solana
SOLANA_RPC_URL=http://localhost:8899
ANCHOR_WALLET=~/.config/solana/id.json

# API
JWT_SECRET=your-secret-key
API_PORT=3001
```

## Solana Program IDs (Localnet)

```
identity_registry:    9cDgdU4VnziNnBzDbWx7yTEhJsiDk27HbcYwUTmTTF6n
verification_oracle:  3zNSrpqKKd7Bdsq1JJeVwPyddt9jCcP6Eg9xMgbZtziY
credential_manager:   7trw2WbG59rrKKwnCfnFw8mTMNvYpCfpURoVgJYAgTSP
reputation_engine:    27mcyzQMfRAf1Y2z9T9cf4DaViEa6Kqc4czwJM1PPonH
staking_manager:      GyDkVUfK3u4JzADv8ADw7MyCvn68guX5K1Eo7HVDyZSh
```

## Common Tasks

### Adding a New API Endpoint
1. Create/update DTO in `packages/api/src/modules/<feature>/dto/`
2. Add controller method in `<feature>.controller.ts`
3. Implement business logic in `<feature>.service.ts`
4. Update Prisma schema if needed, run `npx prisma migrate dev`

### Adding a New Solana Instruction
1. Define accounts struct in `programs/<program>/src/instructions/`
2. Add instruction handler function
3. Register in `lib.rs` declare_id! macro
4. Update TypeScript client types

### Running Local Development
```bash
# Terminal 1: Start Solana localnet
solana-test-validator

# Terminal 2: Deploy programs
yarn anchor:deploy

# Terminal 3: Start API
cd packages/api && yarn dev

# Terminal 4: Start web
cd packages/web && yarn dev
```

## Debugging Tips

- **Solana logs**: `solana logs -u localhost`
- **API logs**: Check NestJS console output with structured logging
- **Database**: Use Prisma Studio `npx prisma studio`
- **Redis**: Use `redis-cli monitor` for cache debugging

## Documentation

- Architecture details: `.docs/architecture/`
- API specs: `.docs/api/`
- Security framework: `.docs/security/`
- Deployment guides: `.docs/deployment/`

## Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| Solana Programs | Complete | 5 programs implemented |
| Backend API | Complete | Production-ready |
| Mobile App | Complete | iOS/Android ready |
| Web Frontend | Partial | ~30% complete |
