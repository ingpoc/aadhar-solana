# Phase 3: Web Frontend Completion - Implementation Plan

## Overview

**Current Status**: ~30-35% complete
**Target**: 100% production-ready web application
**Framework**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
**Timeline Reference**: 4 tracks of parallel development

---

## Current State Summary

### Implemented Features (30-35%)
- Home/Landing page with marketing content
- Wallet connection (Phantom, Solflare)
- Identity creation flow
- Dashboard with identity overview
- Aadhaar & PAN verification forms
- Credentials list with filtering
- Reputation display with mock history
- Staking interface (stake/unstake)
- JWT + Solana wallet authentication
- Toast notifications
- Responsive navigation
- Loading states and error boundaries

### Missing Features (65-70%)
- Compliance UI (DPDP Act, Aadhaar Act consent)
- Settings/Profile management
- Identity recovery & backup
- Audit logs viewer
- Data export functionality
- Advanced components (modals, tables, charts)
- Dark mode
- Comprehensive testing
- Accessibility improvements

---

## Implementation Tracks

### Track 1: Compliance UI (Priority: Critical)
**Goal**: Frontend for Phase 2 backend compliance features

### Track 2: Core Feature Completion (Priority: High)
**Goal**: Complete all core identity management features

### Track 3: Component Library & UX (Priority: Medium)
**Goal**: Reusable components, dark mode, accessibility

### Track 4: Testing & Quality (Priority: Medium)
**Goal**: Unit tests, E2E tests, performance optimization

---

## Track 1: Compliance UI

### 1.1 Consent Management Module
**Files to create**:
```
app/
  consent/
    page.tsx                    # Consent dashboard
    history/page.tsx            # Consent history
components/
  consent/
    ConsentBanner.tsx           # Cookie-style consent banner
    ConsentCard.tsx             # Individual consent item
    ConsentModal.tsx            # Grant/revoke modal
    ConsentPurposeList.tsx      # Purpose selection list
    ConsentReceipt.tsx          # Downloadable receipt
hooks/
  useConsent.ts                 # Consent API integration
```

**Features**:
- [ ] Consent dashboard showing all active consents
- [ ] Purpose-based consent granting with data element selection
- [ ] Consent revocation with reason
- [ ] Consent receipt generation (downloadable PDF)
- [ ] Consent expiry notifications
- [ ] First-visit consent banner for new users
- [ ] Consent version tracking

**API Integration**:
```typescript
// hooks/useConsent.ts
interface UseConsentReturn {
  consents: ConsentRecord[];
  purposes: ConsentPurpose[];
  loading: boolean;
  grantConsent: (type: ConsentType, options?: GrantOptions) => Promise<void>;
  revokeConsent: (consentId: string, reason?: string) => Promise<void>;
  checkConsent: (type: ConsentType) => Promise<boolean>;
  getReceipt: (consentId: string) => Promise<string>;
}
```

**UI Components**:

```tsx
// ConsentBanner.tsx - First-visit banner
<div className="fixed bottom-0 inset-x-0 bg-white shadow-lg p-4 border-t">
  <h3>We value your privacy</h3>
  <p>AadhaarChain requires your consent for identity verification...</p>
  <div className="flex gap-2">
    <Button onClick={grantEssential}>Accept Essential</Button>
    <Button onClick={grantAll}>Accept All</Button>
    <Button onClick={openSettings}>Manage Preferences</Button>
  </div>
</div>

// ConsentCard.tsx - Individual consent item
<Card>
  <div className="flex justify-between">
    <div>
      <h4>{consent.purpose}</h4>
      <p className="text-sm text-gray-500">{consent.dataElements.join(', ')}</p>
      <span className="badge">{consent.status}</span>
    </div>
    <div>
      <Button variant="outline" onClick={() => viewReceipt(consent.id)}>
        View Receipt
      </Button>
      <Button variant="danger" onClick={() => revoke(consent.id)}>
        Revoke
      </Button>
    </div>
  </div>
</Card>
```

### 1.2 Data Rights Module (DPDP Act)
**Files to create**:
```
app/
  data-rights/
    page.tsx                    # Data rights hub
    access/page.tsx             # Access request form
    erasure/page.tsx            # Erasure request form
    correction/page.tsx         # Correction request form
    portability/page.tsx        # Data export
    grievance/page.tsx          # Grievance submission
    requests/page.tsx           # View all requests
    requests/[id]/page.tsx      # Request detail/status
components/
  data-rights/
    RequestCard.tsx             # Request summary card
    RequestTimeline.tsx         # Status timeline
    DataCategorySelector.tsx    # Select data categories
    ExportFormatSelector.tsx    # JSON/CSV/XML selector
    GrievanceForm.tsx           # Grievance form
hooks/
  useDataRights.ts              # Data rights API integration
```

**Features**:
- [ ] Data access request submission
- [ ] Right to erasure (with confirmation modal)
- [ ] Data correction request with field editor
- [ ] Data portability export (JSON, CSV, XML)
- [ ] Grievance submission to Data Protection Board
- [ ] Request tracking with 30-day deadline indicator
- [ ] Request history with status filtering
- [ ] Download exported data

**UI Design**:

```tsx
// Data Rights Hub (/data-rights)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <DataRightCard
    title="Access Your Data"
    description="Request a copy of all personal data we hold about you"
    icon={<EyeIcon />}
    href="/data-rights/access"
    deadline="30 days"
  />
  <DataRightCard
    title="Erase Your Data"
    description="Request deletion of your personal data (right to be forgotten)"
    icon={<TrashIcon />}
    href="/data-rights/erasure"
    deadline="30 days"
  />
  <DataRightCard
    title="Correct Your Data"
    description="Request corrections to inaccurate personal data"
    icon={<PencilIcon />}
    href="/data-rights/correction"
    deadline="30 days"
  />
  <DataRightCard
    title="Export Your Data"
    description="Download your data in portable format (JSON, CSV, XML)"
    icon={<DownloadIcon />}
    href="/data-rights/portability"
    deadline="30 days"
  />
  <DataRightCard
    title="File Grievance"
    description="Submit complaint to Data Protection Board of India"
    icon={<ExclamationIcon />}
    href="/data-rights/grievance"
    deadline="30 days"
  />
</div>

// Request Status Page
<RequestTimeline
  steps={[
    { status: 'completed', title: 'Request Submitted', date: '2024-01-15' },
    { status: 'current', title: 'Under Review', date: '2024-01-16' },
    { status: 'pending', title: 'Processing', date: null },
    { status: 'pending', title: 'Completed', date: null },
  ]}
  deadline="2024-02-14"
  daysRemaining={28}
/>
```

### 1.3 Privacy Settings Module
**Files to create**:
```
app/
  privacy/
    page.tsx                    # Privacy dashboard
    notice/page.tsx             # View privacy notice
    settings/page.tsx           # Privacy preferences
components/
  privacy/
    PrivacyNoticeModal.tsx      # Privacy notice acknowledgment
    PrivacySettingsForm.tsx     # Privacy preferences
    DataRetentionInfo.tsx       # Retention period display
hooks/
  usePrivacy.ts                 # Privacy API integration
```

**Features**:
- [ ] Privacy notice display with version history
- [ ] Privacy notice acknowledgment (required for new versions)
- [ ] Privacy settings preferences
- [ ] Data retention information display
- [ ] Communication preferences
- [ ] Marketing opt-out controls

### 1.4 Aadhaar Compliance UI
**Files to create**:
```
components/
  aadhaar/
    MaskedAadhaar.tsx           # Display XXXX-XXXX-1234
    AadhaarAccessLog.tsx        # Access history display
    AadhaarConsentPrompt.tsx    # Consent before operations
```

**Features**:
- [ ] Aadhaar always displayed in masked format
- [ ] Access log viewer (who accessed, when, why)
- [ ] Consent prompt before any Aadhaar operation
- [ ] Purpose declaration for each access

---

## Track 2: Core Feature Completion

### 2.1 Settings & Profile Module
**Files to create**:
```
app/
  settings/
    page.tsx                    # Settings hub
    profile/page.tsx            # Profile management
    security/page.tsx           # Security settings
    notifications/page.tsx      # Notification preferences
    recovery/page.tsx           # Recovery key management
components/
  settings/
    ProfileCard.tsx             # Profile overview
    SecuritySettings.tsx        # 2FA, session management
    NotificationSettings.tsx    # Push/email preferences
    RecoveryKeyManager.tsx      # Add/remove recovery keys
    ConnectedWallets.tsx        # Linked wallet addresses
    SessionList.tsx             # Active sessions
hooks/
  useSettings.ts                # Settings API
  useRecovery.ts                # Recovery key operations
```

**Features**:
- [ ] Profile information display/edit
- [ ] Connected wallet management
- [ ] Security settings (session timeout, etc.)
- [ ] Recovery key generation and management
- [ ] Notification preferences
- [ ] Active sessions view with logout option
- [ ] Account deletion initiation

### 2.2 Identity Management Enhancement
**Files to create**:
```
app/
  identity/
    page.tsx                    # Identity list (if multiple)
    [id]/page.tsx               # Identity detail view
    backup/page.tsx             # Backup identity
    recover/page.tsx            # Recover identity
components/
  identity/
    IdentityCard.tsx            # Identity summary card
    IdentityDetail.tsx          # Full identity view
    VerificationBadges.tsx      # Verification status badges
    BackupWizard.tsx            # Step-by-step backup
    RecoveryWizard.tsx          # Step-by-step recovery
```

**Features**:
- [ ] Identity detail page with full information
- [ ] Verification status breakdown
- [ ] Identity backup to encrypted file
- [ ] Identity recovery from backup
- [ ] DID document viewer
- [ ] On-chain verification proof viewer

### 2.3 Audit & Activity Logs
**Files to create**:
```
app/
  activity/
    page.tsx                    # Activity log
    audit/page.tsx              # Detailed audit trail
components/
  activity/
    ActivityFeed.tsx            # Recent activity list
    AuditLogTable.tsx           # Paginated audit table
    ActivityFilters.tsx         # Filter by type/date
    ExportAuditLog.tsx          # Export functionality
hooks/
  useActivity.ts                # Activity log API
  useAuditLog.ts                # Audit log API
```

**Features**:
- [ ] Recent activity feed on dashboard
- [ ] Full audit log with pagination
- [ ] Filter by action type, date range
- [ ] Search audit entries
- [ ] Export audit log (CSV/JSON)
- [ ] Activity notifications

### 2.4 Transaction History
**Files to create**:
```
app/
  transactions/
    page.tsx                    # Transaction list
    [signature]/page.tsx        # Transaction detail
components/
  transactions/
    TransactionList.tsx         # Transaction table
    TransactionDetail.tsx       # Full transaction view
    TransactionStatus.tsx       # Status indicator
hooks/
  useTransactions.ts            # Transaction history API
```

**Features**:
- [ ] Solana transaction history
- [ ] Transaction status tracking
- [ ] Transaction detail view with Solana Explorer link
- [ ] Transaction type categorization
- [ ] Pagination and filtering

---

## Track 3: Component Library & UX

### 3.1 Core UI Components
**Files to create**:
```
components/
  ui/
    Button.tsx                  # Button variants
    Input.tsx                   # Form input
    Select.tsx                  # Dropdown select
    Checkbox.tsx                # Checkbox with label
    Radio.tsx                   # Radio buttons
    Switch.tsx                  # Toggle switch
    Modal.tsx                   # Modal dialog
    Dialog.tsx                  # Confirmation dialog
    Dropdown.tsx                # Dropdown menu
    Tabs.tsx                    # Tab navigation
    Accordion.tsx               # Collapsible sections
    Tooltip.tsx                 # Tooltips
    Badge.tsx                   # Status badges
    Avatar.tsx                  # User avatar
    Card.tsx                    # Card container
    Alert.tsx                   # Alert messages
    Progress.tsx                # Progress bar
    Spinner.tsx                 # Loading spinner
    Skeleton.tsx                # Loading skeleton
    Pagination.tsx              # Pagination controls
    Table.tsx                   # Data table
    EmptyState.tsx              # Empty state display
    ErrorBoundary.tsx           # Error boundary
    index.ts                    # Exports
```

**Design System Specs**:
```typescript
// Button variants
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

// Color tokens (already defined in globals.css)
const colors = {
  primary: '#0052A5',    // Navy blue
  secondary: '#FF9933',  // Saffron
  success: '#138808',    // Indian green
  danger: '#DC2626',
  warning: '#F59E0B',
  info: '#3B82F6',
};
```

### 3.2 Form Components
**Files to create**:
```
components/
  forms/
    FormField.tsx               # Field wrapper with label/error
    FormGroup.tsx               # Group of related fields
    DatePicker.tsx              # Date selection
    TimePicker.tsx              # Time selection
    FileUpload.tsx              # File upload with preview
    OTPInput.tsx                # OTP code entry
    PhoneInput.tsx              # Phone with country code
    AadhaarInput.tsx            # Masked Aadhaar input
    PANInput.tsx                # PAN format input
    AmountInput.tsx             # SOL amount input
    SearchInput.tsx             # Search with suggestions
```

### 3.3 Data Display Components
**Files to create**:
```
components/
  data/
    DataTable.tsx               # Sortable/filterable table
    DataGrid.tsx                # Card grid layout
    Timeline.tsx                # Vertical timeline
    Stats.tsx                   # Statistics display
    Chart.tsx                   # Simple charts (recharts)
    CopyButton.tsx              # Copy to clipboard
    TruncatedText.tsx           # Truncated with tooltip
    JsonViewer.tsx              # JSON display
    QRCode.tsx                  # QR code generation
```

### 3.4 Dark Mode Implementation
**Files to modify/create**:
```
contexts/
  ThemeContext.tsx              # Theme provider
components/
  ThemeToggle.tsx               # Dark/light toggle
app/
  globals.css                   # Dark mode CSS variables
```

**Implementation**:
```typescript
// ThemeContext.tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(stored || (prefersDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**CSS Variables**:
```css
/* globals.css additions */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
}

.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #374151;
}
```

### 3.5 Accessibility Improvements
**Tasks**:
- [ ] Add ARIA labels to all interactive elements
- [ ] Keyboard navigation for modals and dropdowns
- [ ] Focus trap in modals
- [ ] Skip-to-content link
- [ ] Screen reader announcements for dynamic content
- [ ] Color contrast audit (WCAG AA)
- [ ] Focus indicators on all focusable elements
- [ ] Alt text for all images
- [ ] Form field descriptions and error messages
- [ ] Reduced motion support

---

## Track 4: Testing & Quality

### 4.1 Unit Tests
**Files to create**:
```
tests/
  hooks/
    useIdentity.test.tsx        # (existing)
    useConsent.test.tsx
    useDataRights.test.tsx
    usePrivacy.test.tsx
    useSettings.test.tsx
    useActivity.test.tsx
    useTransactions.test.tsx
  components/
    ui/
      Button.test.tsx
      Modal.test.tsx
      Form.test.tsx
    consent/
      ConsentCard.test.tsx
      ConsentBanner.test.tsx
    data-rights/
      RequestCard.test.tsx
  utils/
    formatters.test.ts
    validators.test.ts
```

**Coverage Targets**:
- Hooks: 80%
- UI Components: 70%
- Utilities: 90%

### 4.2 Integration Tests
**Files to create**:
```
tests/
  integration/
    consent-flow.test.tsx       # Full consent grant/revoke
    data-rights-flow.test.tsx   # Request submission flow
    verification-flow.test.tsx  # Aadhaar/PAN verification
    identity-flow.test.tsx      # Identity creation
```

### 4.3 E2E Tests (Playwright)
**Files to create**:
```
e2e/
  playwright.config.ts
  tests/
    auth.spec.ts                # Wallet connection
    identity.spec.ts            # Identity creation
    verification.spec.ts        # Verification flow
    consent.spec.ts             # Consent management
    data-rights.spec.ts         # Data rights requests
    staking.spec.ts             # Staking operations
  fixtures/
    wallet.ts                   # Mock wallet fixture
  pages/
    dashboard.ts                # Page object model
    consent.ts
    data-rights.ts
```

**Setup**:
```bash
# Install Playwright
yarn add -D @playwright/test

# Generate config
npx playwright init
```

### 4.4 Performance Optimization
**Tasks**:
- [ ] Lazy loading for routes (Next.js dynamic imports)
- [ ] Image optimization (next/image)
- [ ] Bundle analysis and code splitting
- [ ] API response caching
- [ ] Memoization of expensive computations
- [ ] Virtual scrolling for long lists
- [ ] Service worker for offline support
- [ ] Lighthouse audit (target: 90+ all categories)

---

## File Structure Summary

```
packages/web/
├── app/
│   ├── (auth)/                 # Auth group (if needed)
│   ├── consent/
│   │   ├── page.tsx
│   │   └── history/page.tsx
│   ├── data-rights/
│   │   ├── page.tsx
│   │   ├── access/page.tsx
│   │   ├── erasure/page.tsx
│   │   ├── correction/page.tsx
│   │   ├── portability/page.tsx
│   │   ├── grievance/page.tsx
│   │   └── requests/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── privacy/
│   │   ├── page.tsx
│   │   ├── notice/page.tsx
│   │   └── settings/page.tsx
│   ├── settings/
│   │   ├── page.tsx
│   │   ├── profile/page.tsx
│   │   ├── security/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── recovery/page.tsx
│   ├── identity/
│   │   ├── page.tsx
│   │   ├── create/page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── backup/page.tsx
│   │   └── recover/page.tsx
│   ├── activity/
│   │   ├── page.tsx
│   │   └── audit/page.tsx
│   ├── transactions/
│   │   ├── page.tsx
│   │   └── [signature]/page.tsx
│   ├── dashboard/page.tsx
│   ├── credentials/page.tsx
│   ├── verification/page.tsx
│   ├── reputation/page.tsx
│   ├── staking/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── error.tsx
│   └── not-found.tsx
├── components/
│   ├── ui/                     # Core UI components (20+ files)
│   ├── forms/                  # Form components (10+ files)
│   ├── data/                   # Data display (10+ files)
│   ├── consent/                # Consent module (5 files)
│   ├── data-rights/            # Data rights module (5 files)
│   ├── privacy/                # Privacy module (3 files)
│   ├── aadhaar/                # Aadhaar compliance (3 files)
│   ├── settings/               # Settings module (6 files)
│   ├── identity/               # Identity module (5 files)
│   ├── activity/               # Activity module (4 files)
│   ├── transactions/           # Transaction module (3 files)
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   ├── WalletProvider.tsx
│   ├── Toast.tsx
│   ├── Loading.tsx
│   └── ThemeToggle.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── useIdentity.ts
│   ├── useAuth.ts
│   ├── useSolana.ts
│   ├── useCredentials.ts
│   ├── useVerification.ts
│   ├── useReputation.ts
│   ├── useStaking.ts
│   ├── useConsent.ts           # NEW
│   ├── useDataRights.ts        # NEW
│   ├── usePrivacy.ts           # NEW
│   ├── useSettings.ts          # NEW
│   ├── useRecovery.ts          # NEW
│   ├── useActivity.ts          # NEW
│   ├── useAuditLog.ts          # NEW
│   └── useTransactions.ts      # NEW
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts        # Extended with new APIs
│   │   └── index.ts
│   ├── solana.ts
│   ├── utils.ts
│   └── api.ts
├── types/
│   └── index.ts                # Extended with new types
├── tests/
│   ├── hooks/                  # Hook tests
│   ├── components/             # Component tests
│   ├── integration/            # Integration tests
│   ├── mocks/
│   ├── setup.ts
│   └── utils.tsx
├── e2e/                        # Playwright E2E tests
│   ├── tests/
│   ├── fixtures/
│   └── pages/
├── public/
│   └── icons/                  # App icons
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── vitest.config.ts
├── playwright.config.ts        # NEW
└── .env.example
```

---

## New API Endpoints to Integrate

### Consent API (`lib/api/endpoints.ts`)
```typescript
export const consentApi = {
  getPurposes: () =>
    apiClient.get<ConsentPurpose[]>('/consent/purposes'),

  getAll: (query?: ConsentQuery) =>
    apiClient.get<ConsentRecord[]>('/consent', { params: query }),

  checkConsent: (type: ConsentType) =>
    apiClient.get<{ hasConsent: boolean; consent?: ConsentRecord }>(`/consent/check/${type}`),

  grantConsent: (data: GrantConsentData) =>
    apiClient.post<ConsentRecord>('/consent/grant', data),

  revokeConsent: (consentId: string, reason?: string) =>
    apiClient.delete<ConsentRecord>(`/consent/${consentId}`, { data: { reason } }),

  getReceipt: (consentId: string) =>
    apiClient.get<string>(`/consent/${consentId}/receipt`),
};
```

### Data Rights API
```typescript
export const dataRightsApi = {
  submitAccessRequest: (data: AccessRequestData) =>
    apiClient.post<DataRightsRequest>('/data-rights/access', data),

  submitErasureRequest: (data: ErasureRequestData) =>
    apiClient.post<DataRightsRequest>('/data-rights/erasure', data),

  submitCorrectionRequest: (data: CorrectionRequestData) =>
    apiClient.post<DataRightsRequest>('/data-rights/correction', data),

  submitPortabilityRequest: (data: PortabilityRequestData) =>
    apiClient.post<DataRightsRequest>('/data-rights/portability', data),

  submitGrievance: (data: GrievanceData) =>
    apiClient.post<DataRightsRequest>('/data-rights/grievance', data),

  getRequests: (query?: RequestQuery) =>
    apiClient.get<PaginatedResponse<DataRightsRequest>>('/data-rights/requests', { params: query }),

  getRequestById: (id: string) =>
    apiClient.get<DataRightsRequest>(`/data-rights/requests/${id}`),

  downloadExport: (requestId: string) =>
    apiClient.get<Blob>(`/data-rights/export/${requestId}`, { responseType: 'blob' }),
};
```

### Privacy API
```typescript
export const privacyApi = {
  getCurrentNotice: () =>
    apiClient.get<PrivacyNotice>('/privacy/notice/current'),

  acknowledgeNotice: (noticeId: string) =>
    apiClient.post('/privacy/notice/acknowledge', { noticeId }),

  hasAcknowledged: () =>
    apiClient.get<{ acknowledged: boolean; notice?: PrivacyNotice }>('/privacy/notice/status'),

  getNoticeHistory: () =>
    apiClient.get<PrivacyNotice[]>('/privacy/notice/history'),
};
```

---

## New TypeScript Types

```typescript
// types/index.ts additions

// Consent Types
export enum ConsentType {
  IDENTITY_CREATION = 'identity.creation',
  AADHAAR_VERIFICATION = 'pii.aadhaar.verification',
  AADHAAR_STORAGE = 'pii.aadhaar.storage',
  PAN_VERIFICATION = 'pii.pan.verification',
  PAN_STORAGE = 'pii.pan.storage',
  CREDENTIAL_ISSUANCE = 'credential.issuance',
  CREDENTIAL_SHARING = 'credential.sharing',
  REPUTATION_CALCULATION = 'reputation.calculation',
  STAKING_PARTICIPATION = 'staking.participation',
  MARKETING_COMMUNICATIONS = 'marketing.communications',
  ANALYTICS_COLLECTION = 'analytics.collection',
  THIRD_PARTY_SHARING = 'third_party.sharing',
  CROSS_BORDER_TRANSFER = 'cross_border.transfer',
  BIOMETRIC_PROCESSING = 'biometric.processing',
  AUTOMATED_DECISIONS = 'automated.decisions',
  RESEARCH_PURPOSES = 'research.purposes',
  GOVERNMENT_VERIFICATION = 'government.verification',
  DATA_ENRICHMENT = 'data.enrichment',
}

export enum ConsentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export interface ConsentPurpose {
  type: ConsentType;
  name: string;
  description: string;
  dataElements: string[];
  required: boolean;
  retentionPeriod: string;
  thirdParties: string[];
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  dataElements: string[];
  status: ConsentStatus;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  version: string;
  consentArtifact?: string;
}

// Data Rights Types
export enum RequestType {
  ACCESS = 'access',
  ERASURE = 'erasure',
  CORRECTION = 'correction',
  PORTABILITY = 'portability',
  GRIEVANCE = 'grievance',
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface DataRightsRequest {
  id: string;
  userId: string;
  requestType: RequestType;
  status: RequestStatus;
  dataCategories: string[];
  reason?: string;
  deadline: string;
  processedAt?: string;
  responseData?: any;
  exportFormat?: 'json' | 'csv' | 'xml';
  exportFileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Privacy Types
export interface PrivacyNotice {
  id: string;
  version: string;
  effectiveDate: string;
  content: {
    summary: string;
    fullText: string;
    dataCollected: string[];
    purposes: string[];
    retentionPeriods: Record<string, string>;
    thirdParties: string[];
    rights: string[];
    contact: {
      dpo: string;
      email: string;
      address: string;
    };
  };
  isActive: boolean;
}

// Activity Types
export interface ActivityLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, any>;
  hash: string;
}
```

---

## Implementation Priority Order

### Week 1-2: Compliance UI (Critical Path)
1. Consent management page and components
2. Consent hooks and API integration
3. Data rights hub and request forms
4. Privacy notice display and acknowledgment

### Week 3-4: Core Features
1. Settings and profile pages
2. Identity detail and backup/recovery
3. Activity and audit log viewers
4. Transaction history

### Week 5-6: Component Library & UX
1. Core UI component library
2. Form components
3. Dark mode implementation
4. Accessibility improvements

### Week 7-8: Testing & Polish
1. Unit tests for new hooks and components
2. Integration tests for flows
3. E2E tests with Playwright
4. Performance optimization
5. Final QA and bug fixes

---

## Success Metrics

### Functional Requirements
- [ ] All DPDP Act data subject rights accessible via UI
- [ ] Consent management fully operational
- [ ] Privacy notice acknowledgment enforced
- [ ] Aadhaar displayed only in masked format
- [ ] All existing features continue to work

### Non-Functional Requirements
- [ ] Lighthouse score: 90+ (Performance, Accessibility, Best Practices, SEO)
- [ ] Test coverage: 70%+ overall
- [ ] Page load time: <3s on 3G
- [ ] WCAG 2.1 AA compliance
- [ ] Mobile responsive on all pages

### User Experience
- [ ] Consent flows clear and intuitive
- [ ] Data rights requests easy to submit
- [ ] Status tracking visible and accurate
- [ ] Error messages helpful and actionable
- [ ] Loading states on all async operations

---

## Dependencies

### New NPM Packages (to install)
```bash
# E2E Testing
yarn add -D @playwright/test

# Charts (optional)
yarn add recharts

# Date handling
yarn add date-fns

# PDF generation (for receipts)
yarn add @react-pdf/renderer

# QR Code (for backup)
yarn add qrcode.react

# File download
yarn add file-saver
yarn add -D @types/file-saver
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API changes during development | Define contracts early, use TypeScript interfaces |
| Complex consent flows | User testing with prototypes |
| Performance with large audit logs | Virtual scrolling, pagination |
| Dark mode color conflicts | Systematic CSS variable approach |
| Test flakiness | Proper mocking, retry mechanisms |

---

## Notes

- All compliance features must match Phase 2 backend implementation
- Privacy notice must be shown on first visit and version changes
- Consent is required before any Aadhaar/PAN operation
- 30-day deadline prominently displayed for data rights requests
- Audit logs must show integrity indicators (hash chain)
