# Phase 4: Production Readiness - Implementation Plan

## Overview

**Current Status**: ~70% complete
**Target**: 100% production-ready application
**Estimated Effort**: 15-20 hours
**Priority Focus**: Testing, Accessibility, Integration

---

## Current State Summary

### Completed (Phases 1-3)
- ✅ Phase 1: Security Hardening (encryption, audit logging, middleware)
- ✅ Phase 2: Regulatory Compliance backend (DPDP Act, Aadhaar Act)
- ✅ Phase 3 Track 1: Compliance UI (consent, data rights, privacy pages)
- ✅ Phase 3 Track 2: Core features (settings, profile, activity)
- ✅ Phase 3 Track 3: Component library, dark mode infrastructure

### Remaining Work
- ❌ ThemeProvider integration
- ❌ Test coverage (<5% → 70%+)
- ❌ Accessibility compliance (WCAG 2.1 AA)
- ❌ Form components library
- ❌ Documentation
- ❌ CI/CD pipeline

---

## Implementation Tracks

### Track 1: Critical Fixes (Priority: P0)
**Goal**: Fix blocking issues for production deployment

### Track 2: Testing & Quality (Priority: P0)
**Goal**: Achieve 70%+ test coverage on critical paths

### Track 3: Accessibility (Priority: P1)
**Goal**: WCAG 2.1 AA compliance

### Track 4: Polish & DevOps (Priority: P2)
**Goal**: Documentation, CI/CD, developer experience

---

## Track 1: Critical Fixes

### 1.1 ThemeProvider Integration
**Time**: 15 minutes
**Files to modify**:
```
app/layout.tsx
components/WalletProvider.tsx
components/Navigation.tsx
```

**Implementation**:

```tsx
// app/layout.tsx - Add ThemeProvider wrapper
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// components/Navigation.tsx - Add ThemeToggle
import { ThemeToggle } from './ThemeToggle';

// In desktop navigation, before WalletMultiButton:
<ThemeToggle />
<WalletMultiButton />
```

**Tasks**:
- [ ] Wrap ThemeProvider around WalletProvider in layout.tsx
- [ ] Add `suppressHydrationWarning` to html tag
- [ ] Add ThemeToggle to Navigation (desktop and mobile)
- [ ] Update globals.css with dark mode CSS variables
- [ ] Test theme persistence across page reloads

### 1.2 Dark Mode CSS Variables
**Time**: 30 minutes
**File**: `app/globals.css`

**Implementation**:
```css
/* Add to globals.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --border-color: #e5e7eb;
  --card-bg: #ffffff;
  --card-border: #e5e7eb;
}

.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border-color: #374151;
  --card-bg: #1f2937;
  --card-border: #374151;
}

/* Update existing classes to use variables */
.card {
  background-color: var(--card-bg);
  border-color: var(--card-border);
}
```

### 1.3 Hooks Barrel Export
**Time**: 10 minutes
**File to create**: `hooks/index.ts`

```typescript
// hooks/index.ts
export { useActivity } from './useActivity';
export { useAuth } from './useAuth';
export { useConsent } from './useConsent';
export { useCredentials } from './useCredentials';
export { useDataRights } from './useDataRights';
export { useIdentity } from './useIdentity';
export { usePrivacy } from './usePrivacy';
export { useReputation } from './useReputation';
export { useSolana } from './useSolana';
export { useStaking } from './useStaking';
export { useVerification } from './useVerification';
```

---

## Track 2: Testing & Quality

### 2.1 Test Infrastructure Setup
**Time**: 30 minutes
**Files to create/modify**:
```
tests/
  setup.ts              # Enhanced setup
  utils.tsx             # Test utilities
  mocks/
    handlers.ts         # MSW handlers
    server.ts           # MSW server
```

**Dependencies to add**:
```bash
yarn add -D msw @testing-library/user-event
```

### 2.2 Hook Tests
**Time**: 3-4 hours
**Target Coverage**: 80%
**Files to create**:
```
tests/hooks/
  useConsent.test.tsx
  useDataRights.test.tsx
  usePrivacy.test.tsx
  useActivity.test.tsx
  useVerification.test.tsx
  useCredentials.test.tsx
  useReputation.test.tsx
  useStaking.test.tsx
  useSolana.test.tsx
```

**Test Template**:
```typescript
// tests/hooks/useConsent.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConsent } from '@/hooks/useConsent';
import { TestWrapper } from '../utils';
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('useConsent', () => {
  it('fetches consents on mount', async () => {
    const { result } = renderHook(() => useConsent(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.consents).toHaveLength(2);
  });

  it('grants consent successfully', async () => {
    const { result } = renderHook(() => useConsent(), { wrapper: TestWrapper });

    await act(async () => {
      await result.current.grantConsent('identity.creation');
    });

    expect(result.current.consents).toContainEqual(
      expect.objectContaining({ consentType: 'identity.creation' })
    );
  });

  it('revokes consent successfully', async () => {
    const { result } = renderHook(() => useConsent(), { wrapper: TestWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.revokeConsent('consent-1', 'No longer needed');
    });

    expect(result.current.consents[0].status).toBe('revoked');
  });

  it('handles API errors gracefully', async () => {
    server.use(
      rest.get('/api/v1/consent', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    const { result } = renderHook(() => useConsent(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
```

**Test Cases per Hook**:

| Hook | Test Cases |
|------|------------|
| useConsent | fetch, grant, revoke, check, receipt, error handling |
| useDataRights | submit (5 types), getById, download, cancel, error handling |
| usePrivacy | fetch notice, acknowledge, check status |
| useActivity | fetch recent, fetch audit, export, pagination |
| useVerification | initiate Aadhaar, verify OTP, verify PAN, status check |
| useCredentials | fetch all, fetch by ID, verify, filter by type |
| useReputation | fetch score, fetch history, tier calculation |
| useStaking | fetch info, stake, unstake, claim rewards |
| useSolana | get balance, send transaction, airdrop |

### 2.3 Component Tests
**Time**: 2 hours
**Target Coverage**: 70%
**Files to create**:
```
tests/components/
  ui/
    Button.test.tsx
    Modal.test.tsx
    Alert.test.tsx
    Badge.test.tsx
    Card.test.tsx
  consent/
    ConsentCard.test.tsx
    ConsentBanner.test.tsx
    ConsentModal.test.tsx
  data-rights/
    RequestCard.test.tsx
    DataCategorySelector.test.tsx
  Navigation.test.tsx
  Toast.test.tsx
  Loading.test.tsx
```

**Component Test Template**:
```typescript
// tests/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 2.4 Integration Tests
**Time**: 2 hours
**Files to create**:
```
tests/integration/
  consent-flow.test.tsx
  data-rights-flow.test.tsx
  verification-flow.test.tsx
  auth-flow.test.tsx
```

**Integration Test Template**:
```typescript
// tests/integration/consent-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentPage from '@/app/consent/page';
import { TestWrapper } from '../utils';

describe('Consent Flow Integration', () => {
  it('displays consent purposes and allows granting', async () => {
    const user = userEvent.setup();
    render(<ConsentPage />, { wrapper: TestWrapper });

    // Wait for purposes to load
    await waitFor(() => {
      expect(screen.getByText('Identity Creation')).toBeInTheDocument();
    });

    // Click grant button
    await user.click(screen.getByText('Grant Consent'));

    // Modal should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Confirm grant
    await user.click(screen.getByText('Confirm'));

    // Should show success
    await waitFor(() => {
      expect(screen.getByText('Consent granted successfully')).toBeInTheDocument();
    });
  });
});
```

### 2.5 E2E Tests (Playwright)
**Time**: 3 hours
**Files to create**:
```
e2e/
  playwright.config.ts
  tests/
    auth.spec.ts
    consent.spec.ts
    data-rights.spec.ts
    verification.spec.ts
    settings.spec.ts
  fixtures/
    auth.ts
  pages/
    consent.page.ts
    data-rights.page.ts
```

**Setup**:
```bash
yarn add -D @playwright/test
npx playwright install
```

**Playwright Config**:
```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Test Template**:
```typescript
// e2e/tests/consent.spec.ts
import { test, expect } from '@playwright/test';
import { ConsentPage } from '../pages/consent.page';

test.describe('Consent Management', () => {
  test('user can view and manage consents', async ({ page }) => {
    const consentPage = new ConsentPage(page);

    await consentPage.goto();
    await consentPage.connectWallet();

    // Check page loads
    await expect(page.getByRole('heading', { name: 'Consent Management' })).toBeVisible();

    // Grant consent
    await consentPage.grantConsent('Identity Creation');
    await expect(page.getByText('Consent granted successfully')).toBeVisible();

    // Revoke consent
    await consentPage.revokeConsent('Identity Creation');
    await expect(page.getByText('Consent revoked successfully')).toBeVisible();
  });
});
```

---

## Track 3: Accessibility (WCAG 2.1 AA)

### 3.1 Semantic HTML Audit
**Time**: 1 hour
**Files to modify**: All page files

**Tasks**:
- [ ] Ensure proper heading hierarchy (h1 → h2 → h3)
- [ ] Use semantic elements (main, nav, aside, section, article)
- [ ] Add landmark roles where needed
- [ ] Ensure lists use proper ul/ol/li elements

**Example Fix**:
```tsx
// Before
<div className="card">
  <div className="text-xl font-bold">Title</div>
  <div>Content</div>
</div>

// After
<article className="card">
  <h2 className="text-xl font-bold">Title</h2>
  <p>Content</p>
</article>
```

### 3.2 Form Accessibility
**Time**: 2 hours
**Files to create/modify**:
```
components/forms/
  FormField.tsx
  Input.tsx
  Select.tsx
  Checkbox.tsx
  TextArea.tsx
  index.ts
```

**FormField Component**:
```tsx
// components/forms/FormField.tsx
'use client';

import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>

      {description && (
        <p id={descriptionId} className="text-xs text-gray-500">
          {description}
        </p>
      )}

      <div
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      >
        {children}
      </div>

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

**Accessible Input Component**:
```tsx
// components/forms/Input.tsx
'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          input w-full
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
```

### 3.3 Focus Management
**Time**: 1 hour
**Files to modify**:
```
components/ui/Modal.tsx
components/consent/ConsentModal.tsx
```

**Focus Trap Implementation**:
```tsx
// components/ui/Modal.tsx - Add focus trap
import { useEffect, useRef } from 'react';

export function Modal({ isOpen, onClose, children, ... }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus first focusable element
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements?.[0]) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      // Restore focus
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Trap focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <div ref={modalRef} onKeyDown={handleKeyDown} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### 3.4 ARIA Labels & Live Regions
**Time**: 1 hour
**Files to modify**: Various page files

**Tasks**:
- [ ] Add `aria-label` to icon-only buttons
- [ ] Add `aria-live="polite"` for dynamic content
- [ ] Add `aria-busy` for loading states
- [ ] Add `aria-expanded` for collapsible sections

**Example Fixes**:
```tsx
// Icon button
<button aria-label="Copy to clipboard" onClick={copy}>
  <CopyIcon />
</button>

// Loading state
<div aria-busy={loading} aria-live="polite">
  {loading ? <Spinner /> : <Content />}
</div>

// Dynamic updates
<div aria-live="polite" aria-atomic="true">
  {message && <p>{message}</p>}
</div>
```

### 3.5 Color Contrast & Visual
**Time**: 30 minutes

**Tasks**:
- [ ] Audit color contrast ratios (4.5:1 minimum)
- [ ] Ensure focus indicators are visible
- [ ] Add `prefers-reduced-motion` support
- [ ] Test with browser zoom (200%)

**Reduced Motion Support**:
```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3.6 Skip Links
**Time**: 15 minutes
**File to modify**: `app/layout.tsx`

```tsx
// Add skip link at top of body
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded"
>
  Skip to main content
</a>

// Add id to main content
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

---

## Track 4: Polish & DevOps

### 4.1 Documentation
**Time**: 1 hour
**Files to create**:
```
packages/web/README.md
packages/web/CONTRIBUTING.md
```

**README Template**:
```markdown
# AadhaarChain Web Frontend

Self-sovereign identity platform built with Next.js 14, React 18, and Tailwind CSS.

## Quick Start

\`\`\`bash
# Install dependencies
yarn install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
yarn dev

# Run tests
yarn test

# Build for production
yarn build
\`\`\`

## Project Structure

\`\`\`
packages/web/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # Core UI components
│   ├── consent/        # Consent management
│   ├── data-rights/    # Data rights module
│   └── ...
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API client
├── contexts/           # React contexts
├── types/              # TypeScript definitions
└── tests/              # Test files
\`\`\`

## Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn test` | Run unit tests |
| `yarn test:coverage` | Run tests with coverage |
| `yarn lint` | Lint code |
| `yarn e2e` | Run E2E tests |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC endpoint | Yes |
| `NEXT_PUBLIC_NETWORK` | Solana network | Yes |

## Testing

We use Vitest for unit/integration tests and Playwright for E2E tests.

\`\`\`bash
# Unit tests
yarn test

# E2E tests
yarn e2e

# Coverage report
yarn test:coverage
\`\`\`

## Deployment

\`\`\`bash
# Build production bundle
yarn build

# Start production server
yarn start
\`\`\`

## License

Proprietary - All rights reserved.
\`\`\`

### 4.2 CI/CD Pipeline
**Time**: 1 hour
**Files to create**:
```
.github/
  workflows/
    ci.yml
    deploy.yml
```

**CI Workflow**:
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn test:coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: yarn e2e
```

### 4.3 Error Monitoring Setup
**Time**: 30 minutes
**Files to modify**:
```
app/layout.tsx
lib/monitoring.ts
```

**Monitoring Setup** (Sentry example):
```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function initMonitoring() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  console.error(error);
  Sentry.captureException(error, { extra: context });
}
```

---

## File Structure Summary

### New Files to Create
```
packages/web/
├── hooks/
│   └── index.ts                    # Barrel exports
├── components/
│   └── forms/
│       ├── FormField.tsx           # Accessible form field wrapper
│       ├── Input.tsx               # Accessible input
│       ├── Select.tsx              # Accessible select
│       ├── Checkbox.tsx            # Accessible checkbox
│       ├── TextArea.tsx            # Accessible textarea
│       └── index.ts                # Exports
├── tests/
│   ├── hooks/
│   │   ├── useConsent.test.tsx
│   │   ├── useDataRights.test.tsx
│   │   ├── usePrivacy.test.tsx
│   │   ├── useActivity.test.tsx
│   │   ├── useVerification.test.tsx
│   │   ├── useCredentials.test.tsx
│   │   ├── useReputation.test.tsx
│   │   ├── useStaking.test.tsx
│   │   └── useSolana.test.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.test.tsx
│   │   │   ├── Modal.test.tsx
│   │   │   ├── Alert.test.tsx
│   │   │   └── ...
│   │   ├── consent/
│   │   │   └── ...
│   │   └── data-rights/
│   │       └── ...
│   ├── integration/
│   │   ├── consent-flow.test.tsx
│   │   ├── data-rights-flow.test.tsx
│   │   └── ...
│   └── mocks/
│       ├── handlers.ts
│       └── server.ts
├── e2e/
│   ├── playwright.config.ts
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── consent.spec.ts
│   │   └── ...
│   ├── fixtures/
│   │   └── auth.ts
│   └── pages/
│       ├── consent.page.ts
│       └── ...
├── README.md
└── CONTRIBUTING.md
```

### Files to Modify
```
app/layout.tsx                      # ThemeProvider, skip link
app/globals.css                     # Dark mode variables, reduced motion
components/Navigation.tsx           # ThemeToggle
components/ui/Modal.tsx             # Focus trap
components/WalletProvider.tsx       # Theme integration
[All page files]                    # Semantic HTML, ARIA
```

---

## Implementation Priority Order

### Day 1: Critical Fixes (2 hours)
1. ✅ Integrate ThemeProvider into layout
2. ✅ Add dark mode CSS variables
3. ✅ Add ThemeToggle to Navigation
4. ✅ Create hooks barrel export
5. ✅ Test theme switching

### Day 2: Testing Infrastructure (3 hours)
1. Set up MSW for API mocking
2. Create test utilities and wrappers
3. Write hook tests (prioritize consent, data rights)

### Day 3: More Tests (3 hours)
1. Complete hook tests
2. Write component tests for UI library
3. Write component tests for consent/data-rights

### Day 4: Accessibility (4 hours)
1. Create form components library
2. Audit and fix semantic HTML
3. Add ARIA labels and live regions
4. Implement focus management in modals
5. Add skip links

### Day 5: E2E & Polish (3 hours)
1. Set up Playwright
2. Write critical E2E tests
3. Create README documentation
4. Set up CI/CD pipeline

---

## Success Metrics

### Testing
- [ ] Unit test coverage: 70%+
- [ ] All critical paths have integration tests
- [ ] E2E tests pass on Chrome, Firefox, Safari
- [ ] All tests pass in CI

### Accessibility
- [ ] No WCAG 2.1 AA violations (automated check)
- [ ] Manual keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast passes (4.5:1)

### Performance
- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 100
- [ ] Lighthouse Best Practices: 90+
- [ ] Lighthouse SEO: 90+

### DevOps
- [ ] CI pipeline passes all checks
- [ ] Build completes without errors
- [ ] Documentation complete

---

## Dependencies to Add

```bash
# Testing
yarn add -D msw @testing-library/user-event

# E2E
yarn add -D @playwright/test

# Monitoring (optional)
yarn add @sentry/nextjs

# Accessibility testing (optional)
yarn add -d @axe-core/react jest-axe
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Test flakiness | Use MSW for deterministic API mocking |
| Theme flash | Add `suppressHydrationWarning`, use CSS variables |
| Accessibility regressions | Add axe-core to test suite |
| CI failures | Run tests locally before push |
| Dark mode color issues | Systematic CSS variable approach |

---

## Notes

- All accessibility fixes should be tested with VoiceOver/NVDA
- Dark mode should be tested across all pages
- E2E tests should cover critical user journeys
- CI should block PRs with failing tests
- Coverage reports should be tracked over time
