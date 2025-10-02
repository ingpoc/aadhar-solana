#!/bin/bash

# Start all development servers
# Requires: tmux or run each command in separate terminals

echo "🚀 Starting AadhaarChain Development Environment..."

# Check if tmux is available
if command -v tmux &> /dev/null; then
    # Start with tmux
    tmux new-session -d -s aadhaarchain

    # Window 0: Solana validator
    tmux rename-window -t aadhaarchain:0 'validator'
    tmux send-keys -t aadhaarchain:0 'solana-test-validator' C-m

    # Window 1: Backend API
    tmux new-window -t aadhaarchain:1 -n 'api'
    tmux send-keys -t aadhaarchain:1 'cd packages/api && yarn dev' C-m

    # Window 2: Mobile app
    tmux new-window -t aadhaarchain:2 -n 'mobile'
    tmux send-keys -t aadhaarchain:2 'cd packages/mobile && yarn start' C-m

    echo "✅ Started all services in tmux session 'aadhaarchain'"
    echo "Attach with: tmux attach -t aadhaarchain"
else
    echo "⚠️  tmux not found. Please run these commands in separate terminals:"
    echo ""
    echo "Terminal 1: solana-test-validator"
    echo "Terminal 2: cd packages/api && yarn dev"
    echo "Terminal 3: cd packages/mobile && yarn start"
fi
