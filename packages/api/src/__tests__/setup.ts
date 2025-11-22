/**
 * Jest Setup File for API Tests
 * This file runs before each test file
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment defaults
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/aadhaarchain_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.SOLANA_RPC_URL = 'http://localhost:8899';
process.env.SOLANA_NETWORK = 'localnet';

// Increase timeout for async operations
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup logic here
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
