# AadhaarChain - Self-Sovereign Identity Platform

Revolutionary Solana-based identity platform bridging India's government-grade identity verification with decentralized ownership.

## Project Structure

```
aadhaar-solana/
├── programs/              # Solana programs (Rust/Anchor)
│   ├── identity-registry/
│   ├── verification-oracle/
│   ├── credential-manager/
│   ├── reputation-engine/
│   └── staking-manager/
├── packages/
│   ├── api/              # Backend API (NestJS/TypeScript)
│   ├── web/              # Web frontend (Next.js)
│   ├── mobile/           # Mobile app (React Native)
│   └── shared/           # Shared utilities and types
├── scripts/              # Deployment and utility scripts
├── tests/                # Integration and E2E tests
└── .docs/                # Complete documentation

```

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Solana CLI
- Anchor CLI 0.29.0
- PostgreSQL 14+
- Redis

### Installation

```bash
# Clone repository
git clone https://github.com/aadhaarchain/aadhaar-solana.git
cd aadhaar-solana

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Build Solana programs
yarn anchor:build

# Set up database
cd packages/api
npx prisma migrate dev
cd ../..

# Start development servers
yarn dev
```

## Development Commands

```bash
# Solana Programs
yarn anchor:build          # Build all programs
yarn anchor:test           # Run program tests
yarn anchor:deploy         # Deploy to devnet

# Backend API
cd packages/api
yarn dev                   # Start API server
yarn test                  # Run tests

# Web Frontend
cd packages/web
yarn dev                   # Start Next.js dev server

# Mobile App
cd packages/mobile
yarn ios                   # Run on iOS
yarn android               # Run on Android
```

## Documentation

See [.docs/README.md](.docs/README.md) for complete documentation including:
- Architecture overview
- API specifications
- Smart contract details
- Security framework
- Deployment guides

## License

See LICENSE file for details.
