# Privacy Controls

## Privacy Architecture Overview

AadhaarChain implements privacy-first design principles, ensuring users maintain complete control over their personal data while enabling verified interactions. The system employs zero-knowledge proofs, selective disclosure, and advanced cryptographic techniques to protect user privacy.

## Data Classification and Protection

### Personal Data Categories
```typescript
enum DataCategory {
  // Public data (on-chain)
  PublicIdentifiers = 'public_identifiers',     // DID, public keys
  VerificationStatus = 'verification_status',   // Boolean verification flags
  ReputationMetrics = 'reputation_metrics',     // Aggregate scores

  // Encrypted data (off-chain)
  PersonalInfo = 'personal_info',               // Name, address, etc.
  BiometricTemplates = 'biometric_templates',   // Processed biometric data
  DocumentImages = 'document_images',           // Scanned documents

  // Zero-knowledge only
  SensitiveAttributes = 'sensitive_attributes', // Age, income, etc.
  VerificationProofs = 'verification_proofs',   // ZK proofs only
}

interface DataProtectionLevel {
  category: DataCategory;
  encryption: EncryptionType;
  storage: StorageType;
  access: AccessLevel;
  retention: RetentionPolicy;
}

const dataProtectionMatrix: DataProtectionLevel[] = [
  {
    category: DataCategory.PublicIdentifiers,
    encryption: EncryptionType.None,
    storage: StorageType.OnChain,
    access: AccessLevel.Public,
    retention: RetentionPolicy.Permanent
  },
  {
    category: DataCategory.PersonalInfo,
    encryption: EncryptionType.AES256,
    storage: StorageType.EncryptedOffChain,
    access: AccessLevel.UserControlled,
    retention: RetentionPolicy.UserDefined
  },
  {
    category: DataCategory.SensitiveAttributes,
    encryption: EncryptionType.ZKProofOnly,
    storage: StorageType.NoStorage,
    access: AccessLevel.ProofBased,
    retention: RetentionPolicy.NoRetention
  }
];
```

### Data Flow Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Device   │    │  Privacy Layer  │    │ Storage Layer   │
│                 │    │                 │    │                 │
│ • Raw Data      │───▶│ • Encryption    │───▶│ • Encrypted DB  │
│ • Biometrics    │    │ • Hashing       │    │ • IPFS          │
│ • Documents     │    │ • ZK Generation │    │ • Blockchain    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Local Storage   │    │   ZK Proofs     │
│                 │    │                 │
│ • Private Keys  │    │ • Age Range     │
│ • Preferences   │    │ • Income Level  │
│ • Cache         │    │ • Qualifications│
└─────────────────┘    └─────────────────┘
```

## Zero-Knowledge Proof System

### Proof Circuits

#### Age Verification Circuit
```typescript
interface AgeVerificationProof {
  // Public inputs (revealed)
  minAge: number;
  maxAge: number;
  currentDate: number;

  // Private inputs (hidden)
  dateOfBirth: number;
  aadhaarHash: Buffer;

  // Output
  ageInRange: boolean;
}

// Circom circuit implementation
/*
pragma circom 2.0.0;

template AgeVerification(n) {
    signal private input dateOfBirth;
    signal private input aadhaarHash[n];
    signal input minAge;
    signal input maxAge;
    signal input currentDate;
    signal output ageInRange;

    // Calculate age in days
    component ageDays = Num2Bits(32);
    ageDays.in <== currentDate - dateOfBirth;

    // Convert to years (365.25 days per year)
    var ageInYears = ageDays.out / 365;

    // Range check
    component gte = GreaterEqThan(32);
    component lte = LessEqThan(32);

    gte.in[0] <== ageInYears;
    gte.in[1] <== minAge;

    lte.in[0] <== ageInYears;
    lte.in[1] <== maxAge;

    ageInRange <== gte.out * lte.out;

    // Verify Aadhaar hash commitment
    component hasher = Poseidon(n);
    for (var i = 0; i < n; i++) {
        hasher.inputs[i] <== aadhaarHash[i];
    }

    // This ensures the proof is tied to a specific Aadhaar
    component hashCheck = IsEqual();
    hashCheck.in[0] <== hasher.out;
    hashCheck.in[1] <== expectedAadhaarHash;
    hashCheck.out === 1;
}
*/

class AgeVerificationProofGenerator {
  static async generateProof(
    dateOfBirth: Date,
    aadhaarNumber: string,
    minAge: number,
    maxAge: number
  ): Promise<ZKProof> {
    // Hash Aadhaar number for privacy
    const aadhaarHash = this.hashAadhaar(aadhaarNumber);

    // Prepare circuit inputs
    const input = {
      dateOfBirth: Math.floor(dateOfBirth.getTime() / 1000),
      aadhaarHash: Array.from(aadhaarHash),
      minAge,
      maxAge,
      currentDate: Math.floor(Date.now() / 1000)
    };

    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      './circuits/age_verification.wasm',
      './circuits/age_verification_final.zkey'
    );

    return {
      proof,
      publicSignals,
      verificationKey: this.getVerificationKey()
    };
  }
}
```

#### Income Range Verification
```typescript
interface IncomeRangeProof {
  // Public inputs
  minIncome: number;
  maxIncome: number;
  taxYear: number;

  // Private inputs
  actualIncome: number;
  panHash: Buffer;
  itrData: Buffer;

  // Output
  incomeInRange: boolean;
}

/*
template IncomeVerification() {
    signal private input actualIncome;
    signal private input panHash[8];
    signal private input itrDataHash[8];
    signal input minIncome;
    signal input maxIncome;
    signal input taxYear;
    signal output incomeInRange;

    // Range check for income
    component gte = GreaterEqThan(64);
    component lte = LessEqThan(64);

    gte.in[0] <== actualIncome;
    gte.in[1] <== minIncome;

    lte.in[0] <== actualIncome;
    lte.in[1] <== maxIncome;

    incomeInRange <== gte.out * lte.out;

    // Verify PAN hash commitment
    component panHasher = Poseidon(8);
    for (var i = 0; i < 8; i++) {
        panHasher.inputs[i] <== panHash[i];
    }

    // Verify ITR data integrity
    component itrHasher = Poseidon(8);
    for (var i = 0; i < 8; i++) {
        itrHasher.inputs[i] <== itrDataHash[i];
    }
}
*/
```

#### Educational Qualification Proof
```typescript
interface EducationProof {
  // Public inputs
  minimumQualification: QualificationLevel;
  institutionTier: InstitutionTier;

  // Private inputs
  actualQualification: QualificationLevel;
  institution: string;
  certificateHash: Buffer;

  // Output
  qualificationMet: boolean;
}

enum QualificationLevel {
  HighSchool = 1,
  Diploma = 2,
  Bachelors = 3,
  Masters = 4,
  PhD = 5
}

enum InstitutionTier {
  Any = 0,
  Recognized = 1,
  Tier2 = 2,
  Tier1 = 3,
  Premier = 4
}
```

### Selective Disclosure

#### Attribute-Based Disclosure
```typescript
interface DisclosureRequest {
  requestId: string;
  requester: string;
  attributes: AttributeRequest[];
  purpose: string;
  retention: RetentionPeriod;
  callback: string;
}

interface AttributeRequest {
  attribute: AttributeType;
  required: boolean;
  constraints?: AttributeConstraints;
  proofType: ProofType;
}

enum AttributeType {
  Age = 'age',
  AgeRange = 'age_range',
  Income = 'income',
  IncomeRange = 'income_range',
  Education = 'education',
  Employment = 'employment',
  Location = 'location',
  Citizenship = 'citizenship'
}

enum ProofType {
  Exact = 'exact',           // Reveal exact value
  Range = 'range',           // Prove value in range
  Boolean = 'boolean',       // Prove true/false
  Threshold = 'threshold',   // Prove above/below threshold
  ZeroKnowledge = 'zk'       // Zero-knowledge proof only
}

class SelectiveDisclosure {
  static async processDisclosureRequest(
    request: DisclosureRequest,
    userConsent: UserConsent
  ): Promise<DisclosureResponse> {
    // Validate user consent
    this.validateConsent(request, userConsent);

    const response: DisclosureResponse = {
      requestId: request.requestId,
      attributes: []
    };

    for (const attr of request.attributes) {
      if (userConsent.approvedAttributes.includes(attr.attribute)) {
        const proof = await this.generateAttributeProof(attr, userConsent);
        response.attributes.push(proof);
      }
    }

    // Log disclosure for audit
    await this.logDisclosure(request, response);

    return response;
  }

  private static async generateAttributeProof(
    attr: AttributeRequest,
    userConsent: UserConsent
  ): Promise<AttributeProof> {
    switch (attr.proofType) {
      case ProofType.Range:
        return await this.generateRangeProof(attr);
      case ProofType.Boolean:
        return await this.generateBooleanProof(attr);
      case ProofType.ZeroKnowledge:
        return await this.generateZKProof(attr);
      default:
        throw new Error(`Unsupported proof type: ${attr.proofType}`);
    }
  }
}
```

#### Consent Management
```typescript
interface ConsentRecord {
  consentId: string;
  userId: string;
  dataController: string;
  purpose: string;
  attributes: string[];
  grantedAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  legalBasis: LegalBasis;
}

enum LegalBasis {
  Consent = 'consent',
  Contract = 'contract',
  LegalObligation = 'legal_obligation',
  VitalInterests = 'vital_interests',
  PublicTask = 'public_task',
  LegitimateInterests = 'legitimate_interests'
}

class ConsentManager {
  static async grantConsent(
    userId: string,
    dataController: string,
    purpose: string,
    attributes: string[],
    duration: number
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      consentId: crypto.randomUUID(),
      userId,
      dataController,
      purpose,
      attributes,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      revoked: false,
      legalBasis: LegalBasis.Consent
    };

    // Store consent record
    await this.storeConsent(consent);

    // Emit consent granted event
    await this.emitConsentEvent('consent_granted', consent);

    return consent;
  }

  static async revokeConsent(
    consentId: string,
    userId: string
  ): Promise<void> {
    const consent = await this.getConsent(consentId);

    // Verify ownership
    if (consent.userId !== userId) {
      throw new Error('Unauthorized consent revocation');
    }

    // Mark as revoked
    consent.revoked = true;
    consent.revokedAt = new Date();

    await this.updateConsent(consent);

    // Notify data controller
    await this.notifyConsentRevocation(consent);

    // Delete associated data
    await this.triggerDataDeletion(consent);
  }
}
```

## Biometric Privacy Protection

### Template Processing
```typescript
interface BiometricTemplate {
  templateId: string;
  type: BiometricType;
  processedData: Buffer;  // Irreversible template
  quality: number;
  createdAt: Date;
}

enum BiometricType {
  Fingerprint = 'fingerprint',
  FaceTemplate = 'face_template',
  IrisPattern = 'iris_pattern',
  VoicePrint = 'voice_print'
}

class BiometricPrivacy {
  static async processBiometric(
    rawBiometric: Buffer,
    type: BiometricType
  ): Promise<BiometricTemplate> {
    // Extract features
    const features = await this.extractFeatures(rawBiometric, type);

    // Create irreversible template
    const template = await this.createIrreversibleTemplate(features);

    // Generate unique template ID
    const templateId = this.generateTemplateId(template);

    return {
      templateId,
      type,
      processedData: template,
      quality: this.calculateQuality(features),
      createdAt: new Date()
    };
  }

  private static async createIrreversibleTemplate(
    features: BiometricFeatures
  ): Promise<Buffer> {
    // Apply one-way transformation
    const transformed = await this.applyOneWayTransform(features);

    // Add noise for privacy
    const noisy = this.addPrivacyNoise(transformed);

    // Hash for additional security
    return crypto.createHash('sha256').update(noisy).digest();
  }

  static async verifyBiometric(
    liveTemplate: Buffer,
    storedTemplate: BiometricTemplate,
    threshold: number = 0.8
  ): Promise<boolean> {
    // Process live biometric
    const liveProcessed = await this.processBiometric(liveTemplate, storedTemplate.type);

    // Compute similarity score
    const similarity = await this.computeSimilarity(
      liveProcessed.processedData,
      storedTemplate.processedData
    );

    return similarity >= threshold;
  }

  // Cancelable biometrics for enhanced privacy
  static async generateCancelableBiometric(
    template: BiometricTemplate,
    userKey: Buffer
  ): Promise<Buffer> {
    // Apply user-specific transformation
    const transformed = this.applyUserTransformation(template.processedData, userKey);

    // This template can be "canceled" by changing the user key
    return transformed;
  }
}
```

### Liveness Detection
```typescript
interface LivenessDetection {
  // Challenge-response for fingerprint
  detectFingerprintLiveness(
    fingerprintData: Buffer,
    challenge: Buffer
  ): Promise<boolean>;

  // Face liveness detection
  detectFaceLiveness(
    faceImage: Buffer,
    eyeBlinkDetected: boolean,
    headMovement: MovementVector
  ): Promise<boolean>;

  // Multi-modal liveness
  detectMultiModalLiveness(
    biometricData: MultiModalBiometric
  ): Promise<LivenessResult>;
}

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  method: LivenessMethod;
  timestamp: Date;
}

enum LivenessMethod {
  BlinkDetection = 'blink_detection',
  HeadMovement = 'head_movement',
  VoiceChallenge = 'voice_challenge',
  TouchDynamics = 'touch_dynamics',
  PulseDetection = 'pulse_detection'
}
```

## Data Minimization

### Minimal Disclosure Protocols
```typescript
interface MinimalDisclosurePolicy {
  dataType: DataType;
  minimumRequired: string[];
  alternatives: AlternativeProof[];
  retentionLimit: number;
}

interface AlternativeProof {
  proofType: ProofType;
  accuracy: number;
  privacyLevel: PrivacyLevel;
}

enum PrivacyLevel {
  None = 0,      // Full disclosure
  Low = 1,       // Anonymized
  Medium = 2,    // Pseudonymized
  High = 3,      // Zero-knowledge
  Maximum = 4    // No disclosure
}

class DataMinimizer {
  static async minimizeDisclosure(
    request: DataRequest,
    availableData: UserData
  ): Promise<MinimalResponse> {
    const policy = this.getDisclosurePolicy(request.dataType);

    // Find the minimal set of attributes needed
    const minimalSet = this.findMinimalAttributeSet(
      request.requirements,
      availableData,
      policy
    );

    // Generate proofs with maximum privacy
    const proofs = await this.generateMinimalProofs(minimalSet);

    return {
      attributes: minimalSet,
      proofs,
      privacyLevel: this.calculatePrivacyLevel(proofs)
    };
  }

  private static findMinimalAttributeSet(
    requirements: Requirement[],
    availableData: UserData,
    policy: MinimalDisclosurePolicy
  ): AttributeSet {
    // Use constraint satisfaction to find minimal set
    const solver = new ConstraintSolver();

    // Add requirements as constraints
    requirements.forEach(req => {
      solver.addConstraint(req.toConstraint());
    });

    // Add privacy preferences
    solver.addObjective(ObjectiveType.MinimizeDisclosure);

    return solver.solve();
  }
}
```

### Purpose Limitation
```typescript
interface PurposeLimitation {
  originalPurpose: string;
  allowedSecondaryUses: string[];
  prohibitedUses: string[];
  compatibilityCheck: (newPurpose: string) => boolean;
}

class PurposeController {
  static async validateDataUse(
    dataId: string,
    proposedPurpose: string
  ): Promise<ValidationResult> {
    const originalConsent = await this.getOriginalConsent(dataId);
    const limitation = this.getPurposeLimitation(originalConsent.purpose);

    // Check if new purpose is compatible
    if (limitation.allowedSecondaryUses.includes(proposedPurpose)) {
      return { allowed: true, reason: 'Explicitly allowed secondary use' };
    }

    if (limitation.prohibitedUses.includes(proposedPurpose)) {
      return { allowed: false, reason: 'Explicitly prohibited use' };
    }

    // Check compatibility
    const compatible = limitation.compatibilityCheck(proposedPurpose);

    if (!compatible) {
      return { allowed: false, reason: 'Incompatible with original purpose' };
    }

    // Require new consent for compatible but not explicitly allowed uses
    return {
      allowed: false,
      reason: 'New consent required',
      requiresNewConsent: true
    };
  }
}
```

## Privacy-Preserving Analytics

### Differential Privacy
```typescript
interface DifferentialPrivacyConfig {
  epsilon: number;        // Privacy budget
  delta: number;          // Failure probability
  mechanism: DPMechanism; // Noise mechanism
}

enum DPMechanism {
  Laplace = 'laplace',
  Gaussian = 'gaussian',
  Exponential = 'exponential'
}

class DifferentialPrivacy {
  static async addNoise(
    value: number,
    sensitivity: number,
    config: DifferentialPrivacyConfig
  ): Promise<number> {
    switch (config.mechanism) {
      case DPMechanism.Laplace:
        return this.addLaplaceNoise(value, sensitivity, config.epsilon);

      case DPMechanism.Gaussian:
        return this.addGaussianNoise(value, sensitivity, config.epsilon, config.delta);

      default:
        throw new Error(`Unsupported mechanism: ${config.mechanism}`);
    }
  }

  private static addLaplaceNoise(
    value: number,
    sensitivity: number,
    epsilon: number
  ): Promise<number> {
    const scale = sensitivity / epsilon;
    const noise = this.sampleLaplace(scale);
    return value + noise;
  }

  // Privacy-preserving age distribution
  static async getAgeDistribution(
    config: DifferentialPrivacyConfig
  ): Promise<AgeDistribution> {
    const actualCounts = await this.getActualAgeCounts();
    const noisyCounts: number[] = [];

    for (const count of actualCounts) {
      const noisyCount = await this.addNoise(count, 1, config);
      noisyCounts.push(Math.max(0, Math.round(noisyCount)));
    }

    return {
      ageRanges: ['18-25', '26-35', '36-45', '46-55', '55+'],
      counts: noisyCounts,
      privacyBudgetUsed: config.epsilon
    };
  }
}
```

### Aggregated Analytics
```typescript
interface PrivacyPreservingAnalytics {
  // Aggregate statistics without revealing individual data
  getVerificationStats(): Promise<AggregateStats>;

  // Geographic distribution with location privacy
  getLocationDistribution(
    granularity: LocationGranularity
  ): Promise<LocationStats>;

  // Reputation score distribution
  getReputationDistribution(): Promise<ReputationStats>;
}

enum LocationGranularity {
  Country = 'country',
  State = 'state',
  City = 'city',
  PostalCode = 'postal_code'  // Only with sufficient users
}

class PrivateAnalytics {
  static async getVerificationStats(): Promise<AggregateStats> {
    // Use k-anonymity to ensure privacy
    const kValue = 10; // Minimum group size

    const stats = await this.computeStatsWithKAnonymity(kValue);

    return {
      totalVerifications: stats.total,
      verificationTypes: stats.byType,
      successRate: stats.successRate,
      privacyLevel: `k=${kValue}`,
      dataFreshness: new Date()
    };
  }

  private static async computeStatsWithKAnonymity(
    k: number
  ): Promise<RawStats> {
    // Only include groups with at least k members
    const query = `
      SELECT verification_type, COUNT(*) as count
      FROM verifications
      GROUP BY verification_type
      HAVING COUNT(*) >= ${k}
    `;

    return await this.executePrivacyPreservingQuery(query);
  }
}
```

## Cross-Border Privacy

### Data Localization Compliance
```typescript
interface DataLocalizationRules {
  country: string;
  sensitiveDataMustStayLocal: boolean;
  allowedCrossBorderTransfers: string[];
  adequacyDecisions: string[];
  safeguards: DataSafeguard[];
}

interface DataSafeguard {
  type: SafeguardType;
  description: string;
  implementationDetails: any;
}

enum SafeguardType {
  StandardContractualClauses = 'scc',
  AdequacyDecision = 'adequacy',
  CertificationScheme = 'certification',
  CodeOfConduct = 'code_of_conduct',
  BindingCorporateRules = 'bcr'
}

class CrossBorderPrivacy {
  static async validateDataTransfer(
    sourceCountry: string,
    destinationCountry: string,
    dataType: DataType
  ): Promise<TransferValidation> {
    const sourceRules = this.getLocalizationRules(sourceCountry);
    const destRules = this.getLocalizationRules(destinationCountry);

    // Check if data must stay local
    if (sourceRules.sensitiveDataMustStayLocal &&
        this.isSensitiveData(dataType)) {
      return {
        allowed: false,
        reason: 'Sensitive data must remain in source country'
      };
    }

    // Check adequacy decisions
    if (sourceRules.adequacyDecisions.includes(destinationCountry)) {
      return { allowed: true, basis: 'Adequacy decision' };
    }

    // Check available safeguards
    const availableSafeguards = this.getApplicableSafeguards(
      sourceRules,
      destRules
    );

    if (availableSafeguards.length > 0) {
      return {
        allowed: true,
        basis: 'Appropriate safeguards',
        safeguards: availableSafeguards
      };
    }

    return {
      allowed: false,
      reason: 'No legal basis for transfer'
    };
  }
}
```

## Privacy Dashboard

### User Privacy Controls
```typescript
interface PrivacyDashboard {
  // Data visibility
  viewCollectedData(): Promise<UserDataOverview>;

  // Consent management
  viewConsents(): Promise<ConsentRecord[]>;
  revokeConsent(consentId: string): Promise<void>;

  // Data sharing history
  viewSharingHistory(): Promise<SharingRecord[]>;

  // Privacy preferences
  updatePrivacyPreferences(prefs: PrivacyPreferences): Promise<void>;

  // Data deletion
  requestDataDeletion(categories: DataCategory[]): Promise<void>;

  // Export data
  exportData(format: ExportFormat): Promise<Buffer>;
}

interface PrivacyPreferences {
  defaultConsentDuration: number;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  shareAggregateStats: boolean;
  biometricRetention: BiometricRetentionPolicy;
  locationPrecision: LocationPrecision;
}

enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml'
}

class UserPrivacyControls {
  static async generatePrivacyReport(
    userId: string
  ): Promise<PrivacyReport> {
    const data = await this.collectUserData(userId);
    const consents = await this.getUserConsents(userId);
    const sharing = await this.getSharingHistory(userId);

    return {
      dataOverview: {
        categoriesCollected: this.categorizeData(data),
        totalDataPoints: data.length,
        oldestRecord: this.findOldestRecord(data),
        newestRecord: this.findNewestRecord(data)
      },
      consentSummary: {
        activeConsents: consents.filter(c => !c.revoked).length,
        revokedConsents: consents.filter(c => c.revoked).length,
        expiringSoon: this.findExpiringSoon(consents)
      },
      sharingActivity: {
        totalShares: sharing.length,
        uniqueRecipients: this.countUniqueRecipients(sharing),
        mostRecentShare: this.findMostRecent(sharing)
      },
      privacyScore: await this.calculatePrivacyScore(userId),
      recommendations: await this.generatePrivacyRecommendations(userId)
    };
  }
}
```