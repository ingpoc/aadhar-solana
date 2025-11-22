# CLAUDE.md - Web Frontend (Next.js)

## Overview

Next.js 14 web application for AadhaarChain using the App Router. Provides a web-based interface for identity management, credential verification, and Solana wallet integration. Currently ~30% complete (skeleton/boilerplate stage).

## Quick Commands

```bash
# Development
yarn dev              # Start dev server (port 3000)
yarn build            # Production build
yarn start            # Start production server
yarn lint             # Run ESLint

# Type checking
yarn type-check       # Run TypeScript compiler check
```

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 14.2.23 |
| UI Library | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4.1 |
| Language | TypeScript | 5.0+ |
| HTTP Client | Axios | 1.7.9 |
| Web3 | @solana/web3.js | 1.91.0 |
| Wallet | Solana Wallet Adapter | Latest |

## Directory Structure

```
packages/web/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page (/)
│   ├── globals.css                # Global styles
│   ├── dashboard/
│   │   └── page.tsx               # Dashboard (/dashboard)
│   ├── identity/
│   │   ├── page.tsx               # Identity list (/identity)
│   │   └── [id]/
│   │       └── page.tsx           # Identity detail (/identity/:id)
│   ├── credentials/
│   │   └── page.tsx               # Credentials (/credentials)
│   ├── verification/
│   │   └── page.tsx               # Verification (/verification)
│   ├── reputation/
│   │   └── page.tsx               # Reputation (/reputation)
│   ├── staking/
│   │   └── page.tsx               # Staking (/staking)
│   ├── error.tsx                  # Error boundary
│   └── not-found.tsx              # 404 page
├── components/                    # Reusable components
│   ├── Navigation.tsx             # Top navigation bar
│   ├── Footer.tsx                 # Page footer
│   ├── WalletProvider.tsx         # Solana wallet context
│   ├── Loading.tsx                # Loading spinner
│   └── Toast.tsx                  # Toast notifications
├── hooks/                         # Custom React hooks
│   ├── useSolana.ts               # Solana integration
│   └── useIdentity.ts             # Identity management
├── lib/                           # Utility libraries
│   └── solana.ts                  # Solana helpers
├── types/                         # TypeScript definitions
│   └── index.ts
├── public/                        # Static assets
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS config
├── postcss.config.js              # PostCSS config
├── tsconfig.json                  # TypeScript config
└── package.json
```

## Code Conventions

### File Naming
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Layouts**: `layout.tsx`
- **Components**: PascalCase (`Navigation.tsx`)
- **Hooks**: camelCase with `use` prefix (`useSolana.ts`)
- **Utilities**: camelCase (`solana.ts`)

### Component Pattern (Server Components - default)
```typescript
// app/dashboard/page.tsx
import { Metadata } from 'next';
import { DashboardContent } from '@/components/DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard | AadhaarChain',
  description: 'Manage your decentralized identity',
};

export default async function DashboardPage() {
  // Server-side data fetching
  const data = await fetchDashboardData();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-700">Dashboard</h1>
      <DashboardContent data={data} />
    </main>
  );
}
```

### Client Component Pattern
```typescript
// components/WalletButton.tsx
'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export const WalletButton: FC = () => {
  const { connected, publicKey, connect, disconnect } = useWallet();

  if (connected) {
    return (
      <button
        onClick={disconnect}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Disconnect ({publicKey?.toBase58().slice(0, 4)}...)
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      Connect Wallet
    </button>
  );
};
```

### Hook Pattern
```typescript
// hooks/useIdentity.ts
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchIdentity } from '@/lib/api';

export const useIdentity = () => {
  const { publicKey } = useWallet();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setIdentity(null);
      return;
    }

    const loadIdentity = async () => {
      setLoading(true);
      try {
        const data = await fetchIdentity(publicKey.toBase58());
        setIdentity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load identity');
      } finally {
        setLoading(false);
      }
    };

    loadIdentity();
  }, [publicKey]);

  return { identity, loading, error };
};
```

## App Router Patterns

### Layouts
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { WalletProvider } from '@/components/WalletProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <Navigation />
          <div className="min-h-screen">{children}</div>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
```

### Loading States
```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
    </div>
  );
}
```

### Error Handling
```typescript
// app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}
```

## Tailwind CSS

### Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Indian flag colors
        saffron: '#FF9933',
        'indian-green': '#138808',
        'navy-blue': '#000080',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Common Utility Classes
```typescript
// Design system utilities
const styles = {
  // Containers
  container: 'container mx-auto px-4',
  section: 'py-8 md:py-12',

  // Cards
  card: 'bg-white rounded-lg shadow-md p-6',
  cardHover: 'hover:shadow-lg transition-shadow',

  // Buttons
  btnPrimary: 'px-4 py-2 bg-indian-green text-white rounded-lg hover:bg-green-700',
  btnSecondary: 'px-4 py-2 bg-saffron text-white rounded-lg hover:bg-orange-600',
  btnOutline: 'px-4 py-2 border-2 border-indian-green text-indian-green rounded-lg hover:bg-green-50',

  // Text
  heading: 'text-2xl md:text-3xl font-bold text-gray-900',
  subheading: 'text-lg text-gray-600',

  // Forms
  input: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indian-green focus:border-transparent',
  label: 'block text-sm font-medium text-gray-700 mb-1',
};
```

## Solana Wallet Integration

### Wallet Provider Setup
```typescript
// components/WalletProvider.tsx
'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
```

### Using Wallet in Components
```typescript
'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  return (
    <div>
      <WalletMultiButton />
      {connected && publicKey && (
        <p className="text-sm text-gray-600 mt-2">
          Connected: {publicKey.toBase58().slice(0, 8)}...
        </p>
      )}
    </div>
  );
};
```

## API Integration

### API Client
```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchIdentity = async (walletAddress: string) => {
  const response = await api.get(`/identity/wallet/${walletAddress}`);
  return response.data;
};

export const createIdentity = async (data: CreateIdentityDto) => {
  const response = await api.post('/identity', data);
  return response.data;
};

export const fetchCredentials = async (identityId: string) => {
  const response = await api.get(`/credentials/identity/${identityId}`);
  return response.data;
};
```

### Server-Side Data Fetching
```typescript
// app/identity/[id]/page.tsx
import { notFound } from 'next/navigation';

async function getIdentity(id: string) {
  const res = await fetch(`${process.env.API_URL}/identity/${id}`, {
    cache: 'no-store', // or 'force-cache' for static
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch identity');
  }

  return res.json();
}

export default async function IdentityPage({
  params,
}: {
  params: { id: string };
}) {
  const identity = await getIdentity(params.id);

  if (!identity) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{identity.did}</h1>
      {/* ... */}
    </div>
  );
}
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=http://localhost:8899
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Server-only (no NEXT_PUBLIC_ prefix)
API_URL=http://localhost:3001
```

## Page Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page |
| `/dashboard` | Dashboard | Main user dashboard |
| `/identity` | Identity List | View all identities |
| `/identity/[id]` | Identity Detail | Single identity view |
| `/credentials` | Credentials | Manage credentials |
| `/verification` | Verification | Start verification process |
| `/reputation` | Reputation | View reputation score |
| `/staking` | Staking | Manage SOL staking |

## Development Status

Current status: **~30% complete** (skeleton/boilerplate)

### Completed
- [x] Project setup with Next.js 14 App Router
- [x] Tailwind CSS configuration
- [x] Basic page structure
- [x] Navigation component
- [x] Wallet provider setup

### TODO
- [ ] Complete dashboard with real data
- [ ] Identity management UI
- [ ] Credential display and verification
- [ ] Verification workflow UI
- [ ] Reputation dashboard
- [ ] Staking interface
- [ ] Responsive design polish
- [ ] Error handling improvements
- [ ] Loading states
- [ ] Form validation
- [ ] Toast notifications

## Testing

```bash
# Run tests (when implemented)
yarn test

# Run E2E tests
yarn test:e2e
```

### Test Pattern (Jest + React Testing Library)
```typescript
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

describe('DashboardPage', () => {
  it('renders dashboard heading', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });
});
```

## Security Notes

- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Validate all user inputs on server components
- Implement CSRF protection for mutations
- Use `next/headers` for secure cookie handling
- Never expose private keys or API secrets to the client
