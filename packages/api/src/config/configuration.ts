export default () => ({
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  },

  // Solana
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    network: process.env.SOLANA_NETWORK || 'devnet',
    commitment: process.env.SOLANA_COMMITMENT || 'confirmed',
    programs: {
      identityRegistry: process.env.IDENTITY_REGISTRY_PROGRAM_ID,
      verificationOracle: process.env.VERIFICATION_ORACLE_PROGRAM_ID,
      credentialManager: process.env.CREDENTIAL_MANAGER_PROGRAM_ID,
      reputationEngine: process.env.REPUTATION_ENGINE_PROGRAM_ID,
      stakingManager: process.env.STAKING_MANAGER_PROGRAM_ID,
    },
    oracle: {
      privateKey: process.env.ORACLE_PRIVATE_KEY,
      publicKey: process.env.ORACLE_PUBLIC_KEY,
    },
  },

  // API Setu
  apiSetu: {
    baseUrl: process.env.API_SETU_BASE_URL || 'https://dg-sandbox.setu.co',
    clientId: process.env.API_SETU_CLIENT_ID,
    clientSecret: process.env.API_SETU_CLIENT_SECRET,
    productInstanceId: process.env.API_SETU_PRODUCT_INSTANCE_ID,
  },

  // DigiLocker
  digilocker: {
    clientId: process.env.DIGILOCKER_CLIENT_ID,
    clientSecret: process.env.DIGILOCKER_CLIENT_SECRET,
    redirectUri: process.env.DIGILOCKER_REDIRECT_URI,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    skipSuccessful: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
    apiKeyMultiplier: parseInt(process.env.API_KEY_RATE_LIMIT_MULTIPLIER, 10) || 10,
  },

  // Security
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
    encryptionKey: process.env.ENCRYPTION_KEY,
    webhookSecret: process.env.WEBHOOK_SECRET,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'json',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
  },

  // Monitoring
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT, 10) || 9090,
    sentryDsn: process.env.SENTRY_DSN,
  },

  // Features
  features: {
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableWebhooks: process.env.ENABLE_WEBHOOKS !== 'false',
    enableBiometricVerification: process.env.ENABLE_BIOMETRIC_VERIFICATION === 'true',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'noreply@aadhaarchain.io',
  },

  // SMS
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },
});
