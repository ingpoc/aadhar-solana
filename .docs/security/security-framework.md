# Security Framework

## Security Architecture Overview

AadhaarChain implements a comprehensive security framework designed to protect user privacy, prevent identity theft, and maintain the integrity of the verification system while ensuring compliance with Indian data protection laws.

## Core Security Principles

### 1. Privacy by Design
- **Data Minimization**: Only necessary data is collected and processed
- **Purpose Limitation**: Data used only for specified purposes
- **Storage Limitation**: Data retained only as long as necessary
- **Transparency**: Clear disclosure of data practices

### 2. Zero-Trust Architecture
- **Verify Everything**: No implicit trust for users, devices, or networks
- **Least Privilege**: Minimal access rights for all entities
- **Continuous Monitoring**: Real-time security monitoring and logging
- **Micro-segmentation**: Isolated security zones for different functions

### 3. Defense in Depth
- **Multiple Security Layers**: Redundant security controls
- **Fail-Safe Defaults**: Secure by default configurations
- **Incident Response**: Rapid response to security events
- **Regular Audits**: Continuous security assessments

## Cryptographic Security

### Encryption Standards

#### Data at Rest
```typescript
// AES-256-GCM encryption for sensitive data
interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivation: 'pbkdf2';
  iterations: 100000;
  saltLength: 32;
  ivLength: 16;
  tagLength: 16;
}

// Example implementation
class DataEncryption {
  static async encryptSensitiveData(
    data: Buffer,
    password: string
  ): Promise<EncryptedData> {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      salt,
      iv,
      tag
    };
  }
}
```

#### Data in Transit
- **TLS 1.3**: All API communications
- **Certificate Pinning**: Mobile app security
- **HSTS**: HTTP Strict Transport Security
- **Perfect Forward Secrecy**: Ephemeral key exchange

#### Blockchain Layer
- **Ed25519**: Digital signatures for Solana compatibility
- **SHA-256**: General purpose hashing
- **Merkle Trees**: Efficient data verification

### Key Management

#### Hierarchical Deterministic (HD) Wallets
```typescript
interface HDWalletStructure {
  masterSeed: Buffer;          // 256-bit entropy
  rootKey: ExtendedKey;        // Master private key
  derivationPath: string;      // BIP44 derivation path

  // Derived keys
  identityKey: PrivateKey;     // m/44'/501'/0'/0/0
  signingKey: PrivateKey;      // m/44'/501'/0'/0/1
  encryptionKey: PrivateKey;   // m/44'/501'/0'/0/2
}

class KeyDerivation {
  static deriveIdentityKeys(masterSeed: Buffer): HDWallet {
    const root = HDKey.fromMasterSeed(masterSeed);

    return {
      identity: root.derive("m/44'/501'/0'/0/0"),
      signing: root.derive("m/44'/501'/0'/0/1"),
      encryption: root.derive("m/44'/501'/0'/0/2")
    };
  }
}
```

#### Biometric Key Derivation (Research Phase)
```typescript
interface BiometricKeyDerivation {
  // Convert biometric template to cryptographic key
  deriveKeyFromBiometric(
    biometricTemplate: Buffer,
    salt: Buffer
  ): Promise<PrivateKey>;

  // Fuzzy matching for key regeneration
  regenerateKey(
    newBiometric: Buffer,
    originalSalt: Buffer,
    threshold: number
  ): Promise<PrivateKey | null>;
}
```

### Zero-Knowledge Proofs

#### Age Verification Proof
```typescript
interface AgeVerificationCircuit {
  // Public inputs
  publicInputs: {
    minAge: number;
    maxAge: number;
    currentTimestamp: number;
  };

  // Private inputs
  privateInputs: {
    dateOfBirth: number;
    aadhaarHash: Buffer;
  };

  // Proof generation
  generateProof(): Promise<{
    proof: Buffer;
    publicSignals: number[];
  }>;
}

// Circom circuit for age verification
/*
pragma circom 2.0.0;

template AgeVerification() {
    signal private input dateOfBirth;
    signal private input aadhaarHash;
    signal input minAge;
    signal input maxAge;
    signal input currentTimestamp;
    signal output ageInRange;

    // Calculate age in seconds
    component ageCalc = Num2Bits(64);
    ageCalc.in <== currentTimestamp - dateOfBirth;

    // Convert to years (approximate)
    var ageInYears = ageCalc.out / 31536000;

    // Check if age is in range
    component geq = GreaterEqThan(8);
    component leq = LessEqThan(8);

    geq.in[0] <== ageInYears;
    geq.in[1] <== minAge;

    leq.in[0] <== ageInYears;
    leq.in[1] <== maxAge;

    ageInRange <== geq.out * leq.out;
}
*/
```

#### Income Range Proof
```typescript
interface IncomeRangeCircuit {
  publicInputs: {
    minIncome: number;
    maxIncome: number;
    year: number;
  };

  privateInputs: {
    actualIncome: number;
    panHash: Buffer;
    itrData: Buffer;
  };
}
```

## Biometric Security

### Biometric Template Processing
```typescript
interface BiometricSecurity {
  // One-way biometric template hashing
  hashBiometricTemplate(template: Buffer): Promise<Buffer>;

  // Secure matching without storing raw biometrics
  verifyBiometric(
    liveTemplate: Buffer,
    storedHash: Buffer,
    threshold: number
  ): Promise<boolean>;

  // Anti-spoofing measures
  detectLiveness(biometricData: Buffer): Promise<boolean>;
}

class BiometricProcessor {
  static async processFingerprint(
    fingerprintImage: Buffer
  ): Promise<BiometricTemplate> {
    // Extract minutiae points
    const minutiae = await extractMinutiae(fingerprintImage);

    // Create irreversible template
    const template = await createTemplate(minutiae);

    // Generate hash for storage
    const hash = crypto.createHash('sha256')
      .update(template)
      .digest();

    return {
      template: template,
      hash: hash,
      quality: calculateQuality(minutiae)
    };
  }
}
```

### Biometric Data Protection
- **No Raw Storage**: Never store raw biometric data
- **Irreversible Templates**: One-way conversion of biometric features
- **Encrypted Transport**: All biometric data encrypted in transit
- **Local Processing**: Biometric matching on user device when possible

## Access Control Framework

### Role-Based Access Control (RBAC)
```typescript
enum UserRole {
  User = 'user',
  Verifier = 'verifier',
  Issuer = 'issuer',
  Admin = 'admin',
  Oracle = 'oracle',
  Auditor = 'auditor'
}

interface Permission {
  resource: string;
  action: string;
  conditions?: Condition[];
}

interface RoleDefinition {
  role: UserRole;
  permissions: Permission[];
  inheritance?: UserRole[];
}

const roleDefinitions: RoleDefinition[] = [
  {
    role: UserRole.User,
    permissions: [
      { resource: 'identity', action: 'read' },
      { resource: 'identity', action: 'update' },
      { resource: 'credentials', action: 'share' },
      { resource: 'proofs', action: 'generate' }
    ]
  },
  {
    role: UserRole.Verifier,
    permissions: [
      { resource: 'credentials', action: 'verify' },
      { resource: 'proofs', action: 'verify' },
      { resource: 'reputation', action: 'read' }
    ]
  },
  {
    role: UserRole.Issuer,
    permissions: [
      { resource: 'credentials', action: 'issue' },
      { resource: 'credentials', action: 'revoke' },
      { resource: 'definitions', action: 'create' }
    ]
  }
];
```

### Attribute-Based Access Control (ABAC)
```typescript
interface AccessPolicy {
  subject: {
    role: UserRole;
    verificationLevel: VerificationLevel;
    reputationScore: number;
  };
  resource: {
    type: string;
    classification: DataClassification;
    owner: string;
  };
  action: string;
  context: {
    timestamp: number;
    location?: string;
    device?: string;
  };
}

enum DataClassification {
  Public = 'public',
  Internal = 'internal',
  Confidential = 'confidential',
  Restricted = 'restricted'
}

class AccessController {
  static async evaluateAccess(
    policy: AccessPolicy
  ): Promise<AccessDecision> {
    // Check role permissions
    const rolePermissions = await this.getRolePermissions(policy.subject.role);

    // Check verification level requirements
    if (policy.resource.classification === DataClassification.Restricted) {
      if (policy.subject.verificationLevel < VerificationLevel.High) {
        return { allowed: false, reason: 'Insufficient verification level' };
      }
    }

    // Check reputation requirements
    if (policy.action === 'issue' && policy.subject.reputationScore < 750) {
      return { allowed: false, reason: 'Insufficient reputation score' };
    }

    // Time-based restrictions
    if (policy.context.timestamp > expirationTime) {
      return { allowed: false, reason: 'Access expired' };
    }

    return { allowed: true };
  }
}
```

## Network Security

### API Security
```typescript
interface APISecurityConfig {
  // Rate limiting
  rateLimiting: {
    requests: number;
    timeWindow: number;
    skipSuccessfulRequests: boolean;
  };

  // Request validation
  validation: {
    requestSizeLimit: number;
    allowedContentTypes: string[];
    sanitizeInput: boolean;
  };

  // Authentication
  authentication: {
    jwtSecret: string;
    tokenExpiry: number;
    refreshTokenExpiry: number;
  };
}

// Express.js middleware for API security
class APISecurityMiddleware {
  static rateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });

  static validateRequest = [
    body('*').escape(), // Escape HTML characters
    body('*').trim(), // Trim whitespace
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ];

  static authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid token.' });
    }
  };
}
```

### DDoS Protection
```typescript
interface DDoSProtection {
  // IP-based filtering
  ipWhitelist: string[];
  ipBlacklist: string[];

  // Geographic filtering
  allowedCountries: string[];
  blockedCountries: string[];

  // Pattern detection
  suspiciousPatterns: RegExp[];
  anomalyThreshold: number;
}

class DDoSProtector {
  static async detectAnomaly(
    request: IncomingRequest
  ): Promise<boolean> {
    // Check request patterns
    const isAnomalous = await this.analyzeRequestPattern(request);

    // Check source reputation
    const sourceReputation = await this.getSourceReputation(request.ip);

    // Machine learning-based detection
    const mlScore = await this.getMaliciousScore(request);

    return isAnomalous || sourceReputation < 0.3 || mlScore > 0.7;
  }
}
```

## Smart Contract Security

### Program Security Patterns
```rust
// Access control macro
#[macro_export]
macro_rules! require_authority {
    ($authority:expr, $expected:expr) => {
        if $authority != $expected {
            return Err(ErrorCode::Unauthorized.into());
        }
    };
}

// Reentrancy protection
#[derive(Accounts)]
pub struct ReentrancyGuard<'info> {
    #[account(mut)]
    pub guard: Account<'info, ReentrancyState>,
}

#[account]
pub struct ReentrancyState {
    pub locked: bool,
}

impl<'info> ReentrancyGuard<'info> {
    pub fn lock(&mut self) -> Result<()> {
        require!(!self.guard.locked, ErrorCode::Reentrancy);
        self.guard.locked = true;
        Ok(())
    }

    pub fn unlock(&mut self) {
        self.guard.locked = false;
    }
}

// Integer overflow protection
use checked_arithmetic::*;

fn safe_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(ErrorCode::Overflow.into())
}
```

### Upgrade Security
```rust
// Upgradeable program with security controls
#[derive(Accounts)]
pub struct UpgradeProgram<'info> {
    #[account(mut)]
    pub program: Account<'info, ProgramData>,

    #[account(
        constraint = upgrade_authority.key() == program.upgrade_authority @ ErrorCode::Unauthorized
    )]
    pub upgrade_authority: Signer<'info>,

    // Multi-signature requirement for upgrades
    pub multisig: Account<'info, Multisig>,
}

impl<'info> UpgradeProgram<'info> {
    pub fn upgrade_with_multisig(
        ctx: Context<UpgradeProgram>,
        new_program_data: Vec<u8>
    ) -> Result<()> {
        // Verify multisig approval
        require!(
            ctx.accounts.multisig.is_approved_for_upgrade(),
            ErrorCode::InsufficientSignatures
        );

        // Validate new program code
        Self::validate_program_code(&new_program_data)?;

        // Perform upgrade with time delay
        Self::schedule_upgrade(new_program_data)?;

        Ok(())
    }
}
```

## Incident Response

### Security Monitoring
```typescript
interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: Severity;
  timestamp: Date;
  source: string;
  details: any;
}

enum SecurityEventType {
  UnauthorizedAccess = 'unauthorized_access',
  SuspiciousActivity = 'suspicious_activity',
  DataBreach = 'data_breach',
  SystemIntrusion = 'system_intrusion',
  MalwareDetection = 'malware_detection',
  DDoSAttack = 'ddos_attack'
}

class SecurityMonitor {
  static async handleSecurityEvent(event: SecurityEvent) {
    // Log the event
    await this.logSecurityEvent(event);

    // Immediate response based on severity
    switch (event.severity) {
      case Severity.Critical:
        await this.triggerEmergencyResponse(event);
        break;
      case Severity.High:
        await this.alertSecurityTeam(event);
        break;
      case Severity.Medium:
        await this.flagForReview(event);
        break;
    }

    // Update threat intelligence
    await this.updateThreatIntelligence(event);
  }
}
```

### Emergency Response Procedures
```typescript
interface EmergencyResponse {
  // Immediate containment
  isolateAffectedSystems(): Promise<void>;

  // Communication
  notifyStakeholders(): Promise<void>;
  notifyRegulators(): Promise<void>;

  // Investigation
  preserveEvidence(): Promise<void>;
  conductForensicAnalysis(): Promise<void>;

  // Recovery
  implementRecoveryPlan(): Promise<void>;
  validateSystemIntegrity(): Promise<void>;

  // Post-incident
  conductPostMortem(): Promise<void>;
  updateSecurityPolicies(): Promise<void>;
}
```

## Compliance Framework

### GDPR/DPDP Compliance
```typescript
interface DataProtectionCompliance {
  // Right to information
  provideDataProcessingInfo(): DataProcessingInfo;

  // Right of access
  exportUserData(userId: string): Promise<UserDataExport>;

  // Right to rectification
  updateUserData(userId: string, updates: any): Promise<void>;

  // Right to erasure
  deleteUserData(userId: string): Promise<void>;

  // Right to data portability
  exportDataInStandardFormat(userId: string): Promise<Buffer>;

  // Right to object
  stopDataProcessing(userId: string, purpose: string): Promise<void>;
}

class DataProtectionService {
  static async handleDataSubjectRequest(
    request: DataSubjectRequest
  ): Promise<void> {
    // Verify identity
    const verified = await this.verifyDataSubjectIdentity(request);
    require(verified, 'Identity verification failed');

    // Process request based on type
    switch (request.type) {
      case 'access':
        await this.handleAccessRequest(request);
        break;
      case 'deletion':
        await this.handleDeletionRequest(request);
        break;
      case 'portability':
        await this.handlePortabilityRequest(request);
        break;
    }

    // Log the request handling
    await this.logDataSubjectRequest(request);
  }
}
```

### Audit Requirements
```typescript
interface AuditTrail {
  eventId: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: any;
}

class AuditLogger {
  static async logUserAction(
    userId: string,
    action: string,
    resource: string,
    success: boolean,
    details?: any
  ): Promise<void> {
    const auditEntry: AuditTrail = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      action,
      resource,
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
      success,
      details
    };

    // Store in immutable audit log
    await this.storeAuditEntry(auditEntry);

    // Real-time monitoring
    await this.analyzeForAnomalies(auditEntry);
  }
}
```

## Security Testing

### Penetration Testing Framework
```typescript
interface PenetrationTest {
  // Web application testing
  testSQLInjection(): Promise<TestResult>;
  testXSS(): Promise<TestResult>;
  testCSRF(): Promise<TestResult>;
  testAuthenticationBypass(): Promise<TestResult>;

  // API testing
  testAPIAuthentication(): Promise<TestResult>;
  testRateLimiting(): Promise<TestResult>;
  testInputValidation(): Promise<TestResult>;

  // Smart contract testing
  testReentrancy(): Promise<TestResult>;
  testIntegerOverflow(): Promise<TestResult>;
  testAccessControl(): Promise<TestResult>;

  // Infrastructure testing
  testNetworkSecurity(): Promise<TestResult>;
  testServerConfiguration(): Promise<TestResult>;
}
```

### Security Metrics
```typescript
interface SecurityMetrics {
  // Authentication metrics
  failedLoginAttempts: number;
  successfulLogins: number;
  bruteForceAttempts: number;

  // API security metrics
  blockedRequests: number;
  rateLimitExceeded: number;
  invalidTokens: number;

  // System security metrics
  vulnerabilitiesDetected: number;
  securityPatchesApplied: number;
  incidentResponseTime: number;

  // Compliance metrics
  dataSubjectRequests: number;
  dataBreaches: number;
  auditFindings: number;
}
```