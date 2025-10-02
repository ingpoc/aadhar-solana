# Development Setup Guide

## Prerequisites

### System Requirements
- **Operating System**: macOS 10.15+, Ubuntu 20.04+, or Windows 10+ with WSL2
- **Memory**: 16GB RAM minimum, 32GB recommended
- **Storage**: 50GB free space for full development environment
- **Network**: Stable internet connection for blockchain interactions

### Required Software
- **Node.js**: v18.0.0 or higher
- **Rust**: Latest stable version (1.70.0+)
- **Git**: v2.30.0 or higher
- **Docker**: v20.10.0 or higher
- **PostgreSQL**: v14.0 or higher

## Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/aadhaarchain/aadhaar-solana.git
cd aadhaar-solana
```

### 2. Environment Setup

#### Install Node.js and Dependencies
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install global dependencies
npm install -g yarn pnpm @coral-xyz/anchor-cli @solana/web3.js
```

#### Install Rust and Solana CLI
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add required components
rustup component add rustfmt clippy

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
export PATH="~/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

### 3. Project Dependencies

#### Install JavaScript/TypeScript Dependencies
```bash
# Install root dependencies
yarn install

# Install frontend dependencies
cd packages/web && yarn install

# Install mobile app dependencies
cd ../mobile && yarn install

# Install backend dependencies
cd ../api && yarn install
```

#### Build Rust Programs
```bash
# Build Solana programs
cd programs && anchor build

# Run tests
anchor test
```

### 4. Database Setup

#### PostgreSQL Installation
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows (WSL2)
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

#### Database Configuration
```bash
# Create database and user
sudo -u postgres psql

-- In PostgreSQL shell
CREATE DATABASE aadhaarchain_dev;
CREATE USER aadhaarchain WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE aadhaarchain_dev TO aadhaarchain;
\q
```

#### Run Migrations
```bash
cd packages/api
npx prisma migrate dev --name initial
npx prisma generate
```

### 5. Environment Configuration

#### Root Environment Variables
Create `.env` file in project root:
```bash
# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# Program IDs (will be set after deployment)
IDENTITY_REGISTRY_PROGRAM_ID=
VERIFICATION_ORACLE_PROGRAM_ID=
CREDENTIAL_MANAGER_PROGRAM_ID=
REPUTATION_ENGINE_PROGRAM_ID=
STAKING_MANAGER_PROGRAM_ID=

# API Configuration
API_BASE_URL=http://localhost:3000
API_SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql://aadhaarchain:dev_password@localhost:5432/aadhaarchain_dev

# External Services
API_SETU_BASE_URL=https://api.sandbox.co.in
API_SETU_CLIENT_ID=your-client-id
API_SETU_CLIENT_SECRET=your-client-secret

# Security
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# Features
ENABLE_BIOMETRIC_AUTH=true
ENABLE_ZK_PROOFS=true
ENABLE_PUSH_NOTIFICATIONS=true
```

#### API Environment Variables
Create `packages/api/.env`:
```bash
# Inherit from root .env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://aadhaarchain:dev_password@localhost:5432/aadhaarchain_dev

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# External APIs
API_SETU_BASE_URL=https://api.sandbox.co.in
API_SETU_CLIENT_ID=your-client-id
API_SETU_CLIENT_SECRET=your-client-secret

# Solana
SOLANA_NETWORK=devnet
SOLANA_PRIVATE_KEY=your-solana-private-key

# Security
JWT_SECRET=your-jwt-secret-here
BCRYPT_ROUNDS=12

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Monitoring
LOG_LEVEL=debug
ENABLE_METRICS=true
```

#### Frontend Environment Variables
Create `packages/web/.env.local`:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Features
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# External Services
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

#### Mobile Environment Variables
Create `packages/mobile/.env`:
```bash
# API Configuration
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Push Notifications
FCM_SENDER_ID=your-fcm-sender-id
APNS_KEY_ID=your-apns-key-id

# Deep Linking
URL_SCHEME=aadhaarchain
ANDROID_PACKAGE=com.aadhaarchain.app
IOS_BUNDLE_ID=com.aadhaarchain.app
```

### 6. Solana Program Deployment

#### Generate Keypairs
```bash
# Generate program keypairs
mkdir -p keys
solana-keygen new --outfile keys/identity-registry-keypair.json
solana-keygen new --outfile keys/verification-oracle-keypair.json
solana-keygen new --outfile keys/credential-manager-keypair.json
solana-keygen new --outfile keys/reputation-engine-keypair.json
solana-keygen new --outfile keys/staking-manager-keypair.json

# Generate deploy authority keypair
solana-keygen new --outfile keys/deploy-authority.json

# Set Solana config
solana config set --url devnet
solana config set --keypair keys/deploy-authority.json
```

#### Deploy Programs
```bash
# Build and deploy all programs
anchor build
anchor deploy

# Update program IDs in Anchor.toml and environment variables
# Copy the program IDs from the deployment output
```

#### Initialize Programs
```bash
# Run initialization scripts
cd scripts
node initialize-programs.js
```

### 7. Start Development Services

#### Start Infrastructure Services
```bash
# Start PostgreSQL (if not running)
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux

# Or use Docker Compose for all services
docker-compose -f docker-compose.dev.yml up -d
```

#### Start Application Services
```bash
# Terminal 1: Start API server
cd packages/api
yarn dev

# Terminal 2: Start web frontend
cd packages/web
yarn dev

# Terminal 3: Start mobile app (choose platform)
cd packages/mobile
yarn ios     # for iOS
yarn android # for Android

# Terminal 4: Start Solana local validator (optional)
solana-test-validator --reset
```

## Development Workflow

### Code Organization
```
aadhaar-solana/
├── packages/
│   ├── api/           # Backend API server
│   ├── web/           # Next.js web frontend
│   ├── mobile/        # React Native mobile app
│   ├── shared/        # Shared utilities and types
│   └── sdk/           # Client SDK
├── programs/          # Solana programs (Rust)
├── scripts/           # Deployment and utility scripts
├── tests/             # Integration tests
├── docs/              # Documentation
└── .docs/             # Generated documentation
```

### Development Commands

#### Backend API
```bash
cd packages/api

# Development
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server

# Database
yarn db:migrate       # Run database migrations
yarn db:reset         # Reset database
yarn db:seed          # Seed test data

# Testing
yarn test             # Run unit tests
yarn test:e2e         # Run end-to-end tests
yarn test:coverage    # Run tests with coverage

# Linting
yarn lint             # Run ESLint
yarn lint:fix         # Fix linting errors
yarn type-check       # Run TypeScript checks
```

#### Web Frontend
```bash
cd packages/web

# Development
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server

# Testing
yarn test             # Run unit tests
yarn test:e2e         # Run Playwright tests
yarn test:coverage    # Run tests with coverage

# Linting
yarn lint             # Run Next.js linting
yarn type-check       # Run TypeScript checks
```

#### Mobile App
```bash
cd packages/mobile

# Development
yarn start            # Start Metro bundler
yarn ios              # Run on iOS simulator
yarn android          # Run on Android emulator

# Building
yarn build:ios        # Build iOS app
yarn build:android    # Build Android app

# Testing
yarn test             # Run unit tests
yarn test:e2e         # Run Detox tests

# Platform specific
yarn pods             # Install iOS CocoaPods
yarn clean            # Clean build artifacts
```

#### Solana Programs
```bash
cd programs

# Development
anchor build          # Build all programs
anchor test           # Run program tests
anchor deploy         # Deploy to configured cluster

# Individual programs
anchor build --program identity-registry
anchor test --file tests/identity-registry.ts

# Code quality
cargo fmt             # Format Rust code
cargo clippy          # Run Rust linter
```

### Testing Strategy

#### Unit Testing
```bash
# API unit tests
cd packages/api && yarn test

# Frontend unit tests
cd packages/web && yarn test

# Mobile unit tests
cd packages/mobile && yarn test

# Solana program tests
cd programs && anchor test
```

#### Integration Testing
```bash
# API integration tests
cd packages/api && yarn test:integration

# End-to-end web tests
cd packages/web && yarn test:e2e

# Mobile end-to-end tests
cd packages/mobile && yarn test:e2e
```

#### Load Testing
```bash
# API load testing
cd tests/load
artillery run api-load-test.yml

# Solana program load testing
cd tests/solana
node program-load-test.js
```

### Code Quality

#### Pre-commit Hooks
```bash
# Install Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "yarn lint-staged"
```

#### Linting Configuration
```json
// .eslintrc.js
{
  "extends": [
    "@typescript-eslint/recommended",
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error"
  }
}
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./packages/*/src/*"],
      "@shared/*": ["./packages/shared/src/*"]
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Solana Connection Issues
```bash
# Check Solana configuration
solana config get

# Test RPC connection
solana cluster-version

# Reset local validator
solana-test-validator --reset --quiet
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
systemctl status postgresql           # Linux

# Test database connection
psql -h localhost -U aadhaarchain -d aadhaarchain_dev
```

#### Node.js/NPM Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
npm --version
```

#### Mobile Development Issues
```bash
# iOS Simulator issues
xcrun simctl list devices
xcrun simctl boot "iPhone 14"

# Android Emulator issues
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator -avd Pixel_4_API_30

# Metro bundler issues
yarn start --reset-cache
```

### Performance Optimization

#### API Optimization
```bash
# Enable Redis caching
redis-cli ping

# Monitor API performance
cd packages/api
yarn add clinic
clinic doctor -- node dist/index.js
```

#### Frontend Optimization
```bash
# Analyze bundle size
cd packages/web
npx @next/bundle-analyzer

# Check performance
yarn build && yarn start
# Use Chrome DevTools > Lighthouse
```

#### Mobile Optimization
```bash
# iOS performance profiling
yarn ios --configuration Release

# Android performance profiling
yarn android --variant=release
```

## Next Steps

1. **Complete Setup Verification**
   ```bash
   # Run setup verification script
   node scripts/verify-setup.js
   ```

2. **Explore Documentation**
   - Read [API Documentation](.docs/api/rest-api-spec.md)
   - Review [Architecture Overview](.docs/architecture/system-overview.md)
   - Study [Security Framework](.docs/security/security-framework.md)

3. **Development Best Practices**
   - Follow [Contributing Guidelines](./development/contributing.md)
   - Use [Testing Guide](./development/testing-guide.md)
   - Follow [Code Style Guide](./development/code-style.md)

4. **Deploy to Staging**
   - Follow [Deployment Guide](./deployment/staging-deployment.md)
   - Set up [Monitoring](./deployment/monitoring-setup.md)

Your development environment is now ready! Start by running the verification script and then dive into the codebase.