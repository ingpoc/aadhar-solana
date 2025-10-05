# Data Architecture V2: Solana-First Design

## Overview

**Philosophy**: Store verified data on-chain once, minimize API Setu dependency, user controls all access and refresh cycles.

### Key Principles

1. **Store Once, Use Forever**: Verified data stored encrypted on Solana blockchain
2. **User-Controlled Refresh**: Users decide when to refresh data, not automatic expiry
3. **Selective Access Control**: Field-level permissions for services
4. **Zero-Knowledge Proofs**: Prove properties without revealing raw data
5. **Minimal API Dependency**: 70-90% reduction in API Setu calls

---

## On-Chain Data Structures

### 1. Core Identity Account

```rust
#[account]
pub struct IdentityAccount {
    // ============ Core Identity ============
    pub authority: Pubkey,                      // 32 bytes - User's wallet
    pub did: String,                            // 132 bytes - "did:sol:ABC123..."

    // ============ Aadhaar Data (Encrypted) ============
    pub aadhaar_hash: [u8; 32],                // 32 - SHA-256 of Aadhaar number
    pub aadhaar_last4: String,                 // 8 - "1234" for display
    pub name_encrypted: Vec<u8>,               // ~100 - AES-256-GCM encrypted
    pub dob_encrypted: Vec<u8>,                // ~50 - Encrypted DOB
    pub gender_encrypted: Vec<u8>,             // ~20 - Encrypted gender
    pub mobile_encrypted: Vec<u8>,             // ~50 - Encrypted mobile
    pub email_encrypted: Vec<u8>,              // ~100 - Encrypted email
    pub address_full_encrypted: Vec<u8>,       // ~500 - Full address encrypted
    pub photo_hash: [u8; 32],                  // 32 - Hash of Aadhaar photo

    // ============ Address Components (Public/ZK) ============
    pub city: String,                          // 64 - Public for location
    pub district: String,                      // 64 - Public
    pub state: String,                         // 32 - Public
    pub pincode: u32,                          // 4 - Public for delivery
    pub city_hash: [u8; 32],                   // 32 - For ZK city proof
    pub state_hash: [u8; 32],                  // 32 - For ZK state proof

    // ============ Zero-Knowledge Commitments ============
    pub age_commitment: [u8; 32],              // 32 - Commitment for age proofs
    pub gender_commitment: [u8; 32],           // 32 - Gender proof without reveal
    pub address_commitment: [u8; 32],          // 32 - Address range proof

    // ============ Verification Metadata ============
    pub aadhaar_verified_at: i64,              // 8 - When verified via API Setu
    pub aadhaar_expires_at: i64,               // 8 - User-set expiry (1-5 years)
    pub last_refreshed_at: i64,                // 8 - Last refresh timestamp
    pub oracle_signature: [u8; 64],            // 64 - Oracle's cryptographic sig
    pub api_setu_reference: String,            // 128 - API Setu verification ID

    // ============ Status & Reputation ============
    pub verification_bitmap: u64,              // 8 - Which verifications done
    /*
    Bit 0: Aadhaar verified
    Bit 1: PAN verified
    Bit 2: ITR verified
    Bit 3: Employment verified
    Bit 4: Bank account verified
    Bit 5: GST verified
    Bit 6: Property verified
    Bit 7: Vehicle verified
    ... up to 64 verifications
    */
    pub reputation_score: u64,                 // 8 - 0-1000 reputation
    pub staked_amount: u64,                    // 8 - SOL staked for trust

    // ============ Access Control ============
    pub active_access_grants: Vec<Pubkey>,     // 164 - Who has access (max 10)
    pub total_access_grants_issued: u32,       // 4 - Lifetime count
    pub total_access_revocations: u32,         // 4 - Revocation count

    // ============ Timestamps ============
    pub created_at: i64,                       // 8
    pub last_updated: i64,                     // 8

    // ============ Recovery ============
    pub recovery_keys: Vec<Pubkey>,            // 164 - Max 5 recovery keys
    pub bump: u8,                              // 1
}

// Total Size: ~2,200 bytes per identity
// Rent: ~0.015 SOL/year (~$2.25/year at $150/SOL)
```

---

### 2. PAN Data Account

```rust
#[account]
pub struct PANData {
    pub identity: Pubkey,                      // 32 - Link to identity account

    // ============ PAN Identity (Encrypted) ============
    pub pan_hash: [u8; 32],                    // 32 - SHA-256 of PAN
    pub pan_last4: String,                     // 8 - "1234F" for display
    pub pan_name_encrypted: Vec<u8>,           // ~100 - Name as per PAN
    pub father_name_encrypted: Vec<u8>,        // ~100 - Father's name

    // ============ Status (Public - Critical for Credit) ============
    pub pan_status: u8,                        // 1 - 0=Inactive, 1=Active
    pub aadhaar_seeded: bool,                  // 1 - PAN linked to Aadhaar

    // ============ Verification Matching ============
    pub aadhaar_pan_name_match_score: u8,      // 1 - 0-100% match
    pub dob_match: bool,                       // 1 - DOB matches Aadhaar

    // ============ Verification Metadata ============
    pub verified_at: i64,                      // 8
    pub expires_at: i64,                       // 8
    pub api_setu_reference: String,            // 128
    pub oracle_signature: [u8; 64],            // 64
    pub bump: u8,                              // 1
}

// PDA: seeds = [b"pan_data", identity.key()]
// Total Size: ~550 bytes
```

---

### 3. ITR Data Account (Income Tax Returns)

```rust
#[account]
pub struct ITRData {
    pub identity: Pubkey,                      // 32

    // ============ Tax Filing Details ============
    pub assessment_year: String,               // 16 - "2023-24"
    pub filing_status: u8,                     // 1 - 0=NotFiled, 1=Filed
    pub filing_date: i64,                      // 8

    // ============ Income (Encrypted) ============
    pub gross_income_encrypted: Vec<u8>,       // ~50 - Actual income
    pub salary_encrypted: Vec<u8>,             // ~50
    pub business_income_encrypted: Vec<u8>,    // ~50
    pub capital_gains_encrypted: Vec<u8>,      // ~50
    pub other_sources_encrypted: Vec<u8>,      // ~50

    // ============ Income Ranges (ZK Commitments - Public) ============
    pub income_range: u8,                      // 1
    /*
    0: < ₹5 Lakh
    1: ₹5-10 Lakh
    2: ₹10-25 Lakh
    3: ₹25-50 Lakh
    4: ₹50 Lakh - ₹1 Crore
    5: > ₹1 Crore
    */
    pub income_commitment: [u8; 32],           // 32 - ZK proof for income range

    // ============ Tax Details (Encrypted) ============
    pub tax_paid_encrypted: Vec<u8>,           // ~50
    pub refund_encrypted: Vec<u8>,             // ~50
    pub tds_deducted_encrypted: Vec<u8>,       // ~50

    // ============ Deductions (Encrypted) ============
    pub section_80c_encrypted: Vec<u8>,        // ~50 - Shows investment behavior
    pub section_80d_encrypted: Vec<u8>,        // ~50 - Medical insurance
    pub total_deductions_encrypted: Vec<u8>,   // ~50

    // ============ Verification ============
    pub verified_at: i64,                      // 8
    pub expires_at: i64,                       // 8 - ITR valid for 1 year
    pub api_setu_reference: String,            // 128
    pub oracle_signature: [u8; 64],            // 64
    pub bump: u8,                              // 1
}

// PDA: seeds = [b"itr_data", identity.key(), assessment_year]
// Total Size: ~850 bytes
```

---

### 4. Employment Data Account (EPFO)

```rust
#[account]
pub struct EmploymentData {
    pub identity: Pubkey,                      // 32

    // ============ Employment Identity ============
    pub uan_hash: [u8; 32],                    // 32 - UAN hash
    pub uan_last4: String,                     // 8
    pub name_match: bool,                      // 1

    // ============ Current Employment (Encrypted) ============
    pub current_employer_encrypted: Vec<u8>,   // ~150
    pub designation_encrypted: Vec<u8>,        // ~100
    pub joining_date: i64,                     // 8
    pub employment_status: u8,                 // 1 - 0=Inactive, 1=Active

    // ============ Salary (Encrypted + ZK) ============
    pub monthly_salary_encrypted: Vec<u8>,     // ~50
    pub salary_range: u8,                      // 1
    /*
    0: < ₹25,000
    1: ₹25,000 - ₹50,000
    2: ₹50,000 - ₹1,00,000
    3: ₹1,00,000 - ₹2,00,000
    4: > ₹2,00,000
    */
    pub salary_commitment: [u8; 32],           // 32

    // ============ Employment Stability (Public - Critical!) ============
    pub total_experience_months: u16,          // 2 - Total work experience
    pub current_job_tenure_months: u8,         // 1 - Current employer tenure
    pub employer_changes: u8,                  // 1 - Number of job changes
    pub employment_stability_score: u8,        // 1 - 0-100
    /*
    Score calculation:
    - Current tenure > 24 months: +40 points
    - Total experience > 60 months: +30 points
    - < 3 job changes: +30 points
    */

    // ============ PF Balance (Encrypted) ============
    pub pf_balance_encrypted: Vec<u8>,         // ~50
    pub last_pf_contribution: i64,             // 8
    pub pf_active: bool,                       // 1

    // ============ Verification ============
    pub verified_at: i64,                      // 8
    pub expires_at: i64,                       // 8 - Employment data valid 3 months
    pub api_setu_reference: String,            // 128
    pub oracle_signature: [u8; 64],            // 64
    pub bump: u8,                              // 1
}

// PDA: seeds = [b"employment", identity.key()]
// Total Size: ~750 bytes
```

---

### 5. Bank Account Data

```rust
#[account]
pub struct BankAccountData {
    pub identity: Pubkey,                      // 32

    // ============ Account Identity ============
    pub account_hash: [u8; 32],                // 32
    pub account_last4: String,                 // 8
    pub ifsc_code: String,                     // 16
    pub bank_name_encrypted: Vec<u8>,          // ~100
    pub branch_name_encrypted: Vec<u8>,        // ~100
    pub account_type: u8,                      // 1 - 0=Savings, 1=Current

    // ============ Account Holder ============
    pub name_match_score: u8,                  // 1 - 0-100% match
    pub account_status: u8,                    // 1 - 0=Closed, 1=Active, 2=Dormant

    // ============ Financial Behavior (Encrypted + ZK) ============
    pub avg_balance_encrypted: Vec<u8>,        // ~50
    pub balance_range: u8,                     // 1
    /*
    0: < ₹10,000
    1: ₹10,000 - ₹50,000
    2: ₹50,000 - ₹1,00,000
    3: ₹1,00,000 - ₹5,00,000
    4: > ₹5,00,000
    */
    pub balance_commitment: [u8; 32],          // 32

    pub monthly_credits_encrypted: Vec<u8>,    // ~50
    pub monthly_debits_encrypted: Vec<u8>,     // ~50

    // ============ Banking Health (Public) ============
    pub banking_health_score: u8,              // 1 - 0-100
    pub has_regular_salary_credit: bool,       // 1
    pub has_loan_emis: bool,                   // 1
    pub emi_to_income_ratio: u8,               // 1 - EMI/Income × 100
    pub cheque_bounce_count: u8,               // 1 - Last 12 months

    // ============ Verification ============
    pub verified_at: i64,                      // 8
    pub expires_at: i64,                       // 8 - Bank data expires after 3 months
    pub api_setu_reference: String,            // 128
    pub oracle_signature: [u8; 64],            // 64
    pub bump: u8,                              // 1
}

// PDA: seeds = [b"bank_account", identity.key(), account_hash[0..8]]
// Can have multiple bank accounts per identity
// Total Size: ~750 bytes per account
```

---

### 6. GST Data Account (Business)

```rust
#[account]
pub struct GSTData {
    pub identity: Pubkey,                      // 32

    // ============ Business Identity ============
    pub gstin_hash: [u8; 32],                  // 32
    pub gstin_last4: String,                   // 8
    pub legal_name_encrypted: Vec<u8>,         // ~150
    pub trade_name_encrypted: Vec<u8>,         // ~150
    pub business_type: u8,                     // 1
    /*
    0: Proprietorship
    1: Partnership
    2: Private Limited
    3: Public Limited
    4: LLP
    */

    // ============ Business Status (Public) ============
    pub gst_status: u8,                        // 1 - 0=Cancelled, 1=Active, 2=Suspended
    pub registration_date: i64,                // 8
    pub last_filing_date: i64,                 // 8
    pub compliance_score: u8,                  // 1 - 0-100 based on filing

    // ============ Turnover (Encrypted + ZK) ============
    pub annual_turnover_encrypted: Vec<u8>,    // ~50
    pub turnover_range: u8,                    // 1
    /*
    0: < ₹20 Lakh (unregistered threshold)
    1: ₹20 Lakh - ₹75 Lakh
    2: ₹75 Lakh - ₹5 Crore
    3: > ₹5 Crore
    */
    pub turnover_commitment: [u8; 32],         // 32

    // ============ Filing Compliance ============
    pub filing_compliance_bitmap: u64,         // 8 - Last 12 months
    /*
    Bit 0: Current month filed
    Bit 1: Month-1 filed
    ... up to 12 months
    */
    pub consecutive_filings: u8,               // 1 - Consecutive months filed

    // ============ Business Address ============
    pub business_address_encrypted: Vec<u8>,   // ~300
    pub city: String,                          // 64
    pub state: String,                         // 32
    pub pincode: u32,                          // 4

    // ============ Verification ============
    pub verified_at: i64,                      // 8
    pub expires_at: i64,                       // 8 - GST data valid 3 months
    pub api_setu_reference: String,            // 128
    pub oracle_signature: [u8; 64],            // 64
    pub bump: u8,                              // 1
}

// PDA: seeds = [b"gst_data", identity.key()]
// Total Size: ~1,150 bytes
```

---

### 7. Access Grant Account

```rust
#[account]
pub struct AccessGrant {
    pub grantor: Pubkey,                       // 32 - User's identity
    pub grantee: Pubkey,                       // 32 - Service/company
    pub grant_type: u8,                        // 1 - 0=Full, 1=Partial, 2=ZKOnly

    // ============ Field-Level Access Control ============
    pub allowed_fields: u64,                   // 8 - Bitmap of allowed fields
    /*
    Identity Account Fields:
    Bit 0: Name
    Bit 1: DOB (exact)
    Bit 2: Age range (ZK only)
    Bit 3: Gender
    Bit 4: Full address
    Bit 5: City only
    Bit 6: State only
    Bit 7: Pincode only
    Bit 8: Mobile
    Bit 9: Email
    Bit 10: Photo

    PAN Fields:
    Bit 11: PAN number
    Bit 12: PAN name
    Bit 13: PAN status

    ITR Fields:
    Bit 14: Exact income
    Bit 15: Income range (ZK)
    Bit 16: Tax paid

    Employment Fields:
    Bit 17: Employer name
    Bit 18: Designation
    Bit 19: Exact salary
    Bit 20: Salary range (ZK)
    Bit 21: Employment stability score

    Bank Fields:
    Bit 22: Account number
    Bit 23: Bank name
    Bit 24: Exact balance
    Bit 25: Balance range (ZK)
    Bit 26: Banking health score

    ... up to 64 fields
    */

    // ============ Data Source Selection ============
    pub allowed_data_sources: u64,             // 8 - Which data accounts
    /*
    Bit 0: Aadhaar data
    Bit 1: PAN data
    Bit 2: ITR data
    Bit 3: Employment data
    Bit 4: Bank account data
    Bit 5: GST data
    Bit 6: Property data
    Bit 7: Vehicle data
    ... up to 64 data sources
    */

    // ============ Time-Based Access ============
    pub granted_at: i64,                       // 8
    pub expires_at: i64,                       // 8 - User sets expiry
    pub auto_renew: bool,                      // 1 - Auto-extend if active

    // ============ Usage Tracking ============
    pub access_count: u32,                     // 4 - How many times accessed
    pub max_access_count: Option<u32>,         // 5 - Optional limit
    pub last_accessed_at: Option<i64>,         // 9 - Last access timestamp

    // ============ Purpose & Metadata ============
    pub purpose: String,                       // 128 - "loan_application", etc.
    pub service_name: String,                  // 64 - Display name
    pub service_category: u8,                  // 1 - Banking/Insurance/Govt/etc.

    // ============ Revocation ============
    pub revoked: bool,                         // 1
    pub revoked_at: Option<i64>,               // 9
    pub revocation_reason: Option<String>,     // 132 - Optional reason

    pub bump: u8,                              // 1
}

// PDA: seeds = [b"access_grant", grantor.key(), grantee.key()]
// Total Size: ~450 bytes per grant
```

---

### 8. Verification Refresh Log

```rust
#[account]
pub struct VerificationRefresh {
    pub identity: Pubkey,                      // 32
    pub verification_type: u8,                 // 1
    /*
    0: Aadhaar
    1: PAN
    2: ITR
    3: Employment
    4: Bank
    5: GST
    */

    pub refreshed_at: i64,                     // 8
    pub previous_hash: [u8; 32],               // 32 - Hash of old data
    pub new_hash: [u8; 32],                    // 32 - Hash of new data
    pub changes_detected: bool,                // 1 - Did data change?
    pub change_summary: Option<String>,        // 132 - What changed

    pub oracle_signature: [u8; 64],            // 64
    pub user_consent_signature: [u8; 64],      // 64 - User must consent to refresh
    pub api_setu_reference: String,            // 128

    pub bump: u8,                              // 1
}

// PDA: seeds = [b"refresh_log", identity.key(), verification_type, timestamp]
// Total Size: ~550 bytes per refresh
// Used for audit trail
```

---

## Data Flow Architecture

### 1. Initial Verification Flow

```typescript
User → API Setu → Oracle → Encrypt Data → Store on Solana

┌─────────────┐
│    User     │
│  (Wallet)   │
└──────┬──────┘
       │ 1. Initiate Aadhaar verification
       │    with consent
       ▼
┌─────────────┐
│   Backend   │
│   Oracle    │
└──────┬──────┘
       │ 2. Call API Setu
       │    (one-time)
       ▼
┌─────────────┐
│  API Setu   │
│  Service    │
└──────┬──────┘
       │ 3. Returns verified data:
       │    - Name, DOB, Gender
       │    - Address, Mobile, Email
       │    - Photo, Verification hash
       ▼
┌─────────────┐
│   Oracle    │
│  Processes  │
└──────┬──────┘
       │ 4. Encrypt each field with user's key
       │ 5. Generate ZK commitments
       │ 6. Create proof hash
       ▼
┌─────────────────────────┐
│   Solana Blockchain     │
│  IdentityAccount PDA    │
│  - Encrypted fields     │
│  - ZK commitments       │
│  - Verification metadata│
└─────────────────────────┘

Result: Data stored permanently on-chain!
No more API Setu calls needed for this user's Aadhaar.
```

### 2. Service Access Flow

```typescript
Service Request → Check Access Grant → Decrypt Allowed Fields → Return Data

User grants access via mobile app
       │
       ▼
┌─────────────────────────┐
│  Create AccessGrant     │
│  - Grantee: Bank XYZ    │
│  - Fields: Name, Age, City│
│  - Expires: 90 days     │
└──────────┬──────────────┘
           │
           ▼ Stored on Solana
┌─────────────────────────┐
│   AccessGrant PDA       │
│  grantor: User          │
│  grantee: BankXYZ       │
│  allowed_fields: 0b...  │
└─────────────────────────┘

Later, bank accesses data:
       │
       ▼
┌─────────────┐
│  Bank XYZ   │
│  Backend    │
└──────┬──────┘
       │ 1. Fetch AccessGrant PDA
       │ 2. Check expiry, revocation
       │ 3. Verify allowed fields
       ▼
┌─────────────────────────┐
│  Fetch IdentityAccount  │
│  - Read encrypted fields│
│  - Decrypt with shared  │
│    key (ECDH)           │
│  - Return only allowed  │
└─────────────────────────┘
       │
       ▼
┌─────────────┐
│  Bank XYZ   │
│  Receives:  │
│  - Name     │
│  - Age: 25+ │
│  - City: BLR│
└─────────────┘

Audit log: AccessGrant.access_count++
```

### 3. User-Initiated Refresh Flow

```typescript
User decides to refresh (not automatic!)

User checks data age:
IdentityAccount.aadhaar_verified_at = 365 days ago
IdentityAccount.aadhaar_expires_at = 730 days (2 years)

Status: Still valid, no refresh needed yet!

After 730 days, user initiates refresh:
       │
       ▼
┌─────────────┐
│    User     │
│  (Wallet)   │
└──────┬──────┘
       │ 1. User signs refresh consent
       ▼
┌─────────────┐
│   Backend   │
│   Oracle    │
└──────┬──────┘
       │ 2. Call API Setu (again)
       │    to fetch fresh data
       ▼
┌─────────────┐
│  API Setu   │
└──────┬──────┘
       │ 3. Returns current data
       ▼
┌─────────────┐
│   Oracle    │
│  Compares   │
└──────┬──────┘
       │ 4. Hash old data
       │ 5. Hash new data
       │ 6. Detect changes
       ▼
┌─────────────────────────┐
│  Create RefreshLog PDA  │
│  - old_hash             │
│  - new_hash             │
│  - changes_detected: Y/N│
│  - change_summary       │
└─────────┬───────────────┘
          │
          ▼ If changes detected
┌─────────────────────────┐
│  Update IdentityAccount │
│  - New encrypted data   │
│  - New ZK commitments   │
│  - Update timestamp     │
└─────────────────────────┘
```

---

## Storage Cost Analysis

### Per User Storage Requirements

```
Identity Account:          ~2,200 bytes
PAN Data:                    ~550 bytes
ITR Data (1 year):           ~850 bytes
Employment Data:             ~750 bytes
Bank Account (2 accounts): ~1,500 bytes
GST Data (optional):       ~1,150 bytes
Access Grants (avg 5):     ~2,250 bytes
Refresh Logs (avg 3):      ~1,650 bytes

Total per power user:     ~10,900 bytes (~11 KB)
Total per basic user:      ~4,000 bytes (~4 KB)
```

### Annual Rent Costs

```
Solana rent calculation:
- ~0.00000348 SOL per byte per year
- Basic user (4 KB): 4,000 × 0.00000348 = 0.01392 SOL/year
  At $150/SOL = $2.09/year

- Power user (11 KB): 11,000 × 0.00000348 = 0.03828 SOL/year
  At $150/SOL = $5.74/year

For 1M users (70% basic, 30% power):
- 700K × $2.09 = $1,463,000
- 300K × $5.74 = $1,722,000
Total: $3,185,000/year
```

### API Setu Cost Savings

```
Old Approach (Every Verification):
- Avg 5 verifications per user/year
- 1M users × 5 × 10 data points = 50M API calls
- 50M × ₹10 = ₹500M ($6M/year)

New Approach (Store + Refresh):
- Initial verification: 1M × 10 data points = 10M calls
- Annual refresh (only critical): 1M × 2 data points = 2M calls
- Total: 12M API calls
- 12M × ₹10 = ₹120M ($1.44M/year)

Net Savings: $6M - $1.44M - $3.18M = $1.38M/year ✅
```

---

## Access Control Patterns

### Example 1: Loan Application

```typescript
// Bank needs: Name, DOB, Income, Employment, Bank account
const accessBitmap =
    (1 << 0) |  // Name ✓
    (1 << 1) |  // DOB exact ✓
    (1 << 14) | // Exact income ✓
    (1 << 17) | // Employer name ✓
    (1 << 19) | // Exact salary ✓
    (1 << 22) | // Account number ✓
    (1 << 26);  // Banking health score ✓

const dataSources =
    (1 << 0) |  // Aadhaar ✓
    (1 << 2) |  // ITR ✓
    (1 << 3) |  // Employment ✓
    (1 << 4);   // Bank account ✓

grantAccess(
    bankPubkey,
    accessBitmap,
    dataSources,
    90 days,
    "home_loan_application"
);
```

### Example 2: Age-Restricted Service (18+)

```typescript
// Service only needs: Age verification (ZK proof)
const accessBitmap = (1 << 2);  // Age range ZK only ✓

const dataSources = (1 << 0);   // Aadhaar only ✓

grantAccess(
    servicePubkey,
    accessBitmap,
    dataSources,
    30 days,
    "age_verification_18plus"
);

// Service receives:
// - ZK proof that age > 18
// - NO name, DOB, address, or any other data!
```

### Example 3: Rental Verification

```typescript
// Landlord needs: Name, Employment, Salary range, No exact income
const accessBitmap =
    (1 << 0) |  // Name ✓
    (1 << 17) | // Employer name ✓
    (1 << 20) | // Salary range (ZK) ✓
    (1 << 21);  // Employment stability score ✓

const dataSources =
    (1 << 0) |  // Aadhaar ✓
    (1 << 3);   // Employment ✓

grantAccess(
    landlordPubkey,
    accessBitmap,
    dataSources,
    180 days,
    "rental_agreement"
);
```

---

## Zero-Knowledge Proof Implementation

### Age Range Proof

```circom
pragma circom 2.0.0;

template AgeRangeProof() {
    signal private input dob_timestamp;
    signal private input aadhaar_hash[32];

    signal input current_timestamp;
    signal input min_age;
    signal input max_age;

    signal output age_in_range;

    // Calculate age in seconds
    var age_seconds = current_timestamp - dob_timestamp;

    // Convert to years (31536000 seconds per year)
    var age_years = age_seconds / 31536000;

    // Range check
    component gte = GreaterEqThan(32);
    component lte = LessEqThan(32);

    gte.in[0] <== age_years;
    gte.in[1] <== min_age;

    lte.in[0] <== age_years;
    lte.in[1] <== max_age;

    age_in_range <== gte.out * lte.out;

    // Verify Aadhaar commitment
    component hasher = Poseidon(32);
    for (var i = 0; i < 32; i++) {
        hasher.inputs[i] <== aadhaar_hash[i];
    }

    // This ensures proof is tied to specific Aadhaar
    component hashCheck = IsEqual();
    hashCheck.in[0] <== hasher.out;
    hashCheck.in[1] <== age_commitment; // From IdentityAccount
    hashCheck.out === 1;
}
```

### Income Range Proof

```circom
template IncomeRangeProof() {
    signal private input actual_income;
    signal private input pan_hash[32];

    signal input income_range; // 0-5 as defined above
    signal output income_verified;

    // Define range boundaries
    var ranges[6][2] = [
        [0, 500000],           // < 5L
        [500000, 1000000],     // 5-10L
        [1000000, 2500000],    // 10-25L
        [2500000, 5000000],    // 25-50L
        [5000000, 10000000],   // 50L-1Cr
        [10000000, 99999999]   // > 1Cr
    ];

    // Verify income is in specified range
    component gte = GreaterEqThan(64);
    component lte = LessEqThan(64);

    gte.in[0] <== actual_income;
    gte.in[1] <== ranges[income_range][0];

    lte.in[0] <== actual_income;
    lte.in[1] <== ranges[income_range][1];

    income_verified <== gte.out * lte.out;

    // Verify PAN commitment
    component hasher = Poseidon(32);
    for (var i = 0; i < 32; i++) {
        hasher.inputs[i] <== pan_hash[i];
    }

    component hashCheck = IsEqual();
    hashCheck.in[0] <== hasher.out;
    hashCheck.in[1] <== income_commitment; // From ITRData
    hashCheck.out === 1;
}
```

---

## Migration Path

### Phase 1: Current State (Week 1-2)
- ✅ Basic identity verification working
- ✅ API Setu integration functional
- ❌ No data stored on-chain (except proof hashes)

### Phase 2: Core Data Storage (Week 3-6)
- Implement IdentityAccount with encrypted fields
- Implement PANData account
- Deploy updated Solana programs
- Migrate existing users

### Phase 3: Financial Data (Week 7-10)
- Implement ITRData account
- Implement EmploymentData account
- Implement BankAccountData account
- API Setu integration for all sources

### Phase 4: Access Control (Week 11-14)
- Implement AccessGrant account
- Build access control UI
- Service integration SDK
- Test with pilot banks

### Phase 5: Zero-Knowledge Proofs (Week 15-20)
- Implement ZK circuits
- Generate commitments on verification
- Proof generation API
- Test with pilot services

### Phase 6: Business Features (Week 21-24)
- Implement GSTData account
- Implement PropertyData account
- Implement VehicleData account
- Business user onboarding

---

## Summary

This architecture achieves:

1. ✅ **70-90% API Setu cost reduction**
2. ✅ **User owns and controls all data**
3. ✅ **Selective access at field level**
4. ✅ **Privacy through ZK proofs**
5. ✅ **User-controlled refresh cycles**
6. ✅ **Instant access for services (no API delays)**
7. ✅ **Immutable audit trail**
8. ✅ **Global portability**

**Next Steps**: Begin implementation of Phase 2 - Core Data Storage
