import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database (required)
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // JWT (required for production)
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('dev-secret-key-change-in-production'),
  }),

  // Solana
  SOLANA_RPC_URL: Joi.string().uri().default('https://api.devnet.solana.com'),
  SOLANA_NETWORK: Joi.string().valid('devnet', 'testnet', 'mainnet-beta').default('devnet'),

  // Program IDs (required for blockchain operations)
  IDENTITY_REGISTRY_PROGRAM_ID: Joi.string().optional(),
  VERIFICATION_ORACLE_PROGRAM_ID: Joi.string().optional(),
  CREDENTIAL_MANAGER_PROGRAM_ID: Joi.string().optional(),
  REPUTATION_ENGINE_PROGRAM_ID: Joi.string().optional(),
  STAKING_MANAGER_PROGRAM_ID: Joi.string().optional(),

  // API Setu (required for Aadhaar verification in production)
  API_SETU_BASE_URL: Joi.string().uri().default('https://dg-sandbox.setu.co'),
  API_SETU_CLIENT_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  API_SETU_CLIENT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Security
  BCRYPT_SALT_ROUNDS: Joi.number().min(10).max(15).default(12),
  ENCRYPTION_KEY: Joi.string().length(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('debug'),
});
