#!/bin/bash

# AadhaarChain Local Deployment Script
# This script deploys the entire stack to local development environment

set -e

echo "🚀 Starting AadhaarChain Local Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Solana validator is running
echo "📡 Checking Solana local validator..."
if ! solana cluster-version &> /dev/null; then
    echo -e "${RED}❌ Solana validator not running!${NC}"
    echo "Please start it in another terminal with: solana-test-validator"
    exit 1
fi
echo -e "${GREEN}✅ Solana validator is running${NC}"
echo ""

# Build Solana programs
echo "🔨 Building Solana programs..."
cd "$(dirname "$0")/.."
anchor build
echo -e "${GREEN}✅ Solana programs built${NC}"
echo ""

# Deploy Solana programs
echo "🚀 Deploying Solana programs to local validator..."
anchor deploy
echo -e "${GREEN}✅ Solana programs deployed${NC}"
echo ""

# Extract program IDs
echo "📝 Extracting program IDs..."
IDENTITY_REGISTRY_ID=$(solana program show --programs | grep identity_registry | awk '{print $1}')
echo "Identity Registry Program ID: $IDENTITY_REGISTRY_ID"
echo ""

# Set up database
echo "💾 Setting up database..."
cd packages/api
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Created .env file - please configure it${NC}"
fi

npx prisma migrate dev --name initial
npx prisma generate
echo -e "${GREEN}✅ Database ready${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd ../..
yarn install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start Backend API: cd packages/api && yarn dev"
echo "2. Start Mobile App: cd packages/mobile && yarn ios (or yarn android)"
echo ""
echo "API will be available at: http://localhost:3000"
echo "API Documentation: http://localhost:3000/api/docs"
