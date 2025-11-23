'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard', requiresWallet: true },
    { name: 'Verify', href: '/verification', requiresWallet: true },
    { name: 'Credentials', href: '/credentials', requiresWallet: true },
    { name: 'Reputation', href: '/reputation', requiresWallet: true },
    { name: 'Staking', href: '/staking', requiresWallet: true },
  ];

  const complianceNav = [
    { name: 'Consent', href: '/consent', requiresWallet: true },
    { name: 'Data Rights', href: '/data-rights', requiresWallet: true },
    { name: 'Privacy', href: '/privacy', requiresWallet: true },
    { name: 'Activity', href: '/activity', requiresWallet: true },
    { name: 'Settings', href: '/settings', requiresWallet: true },
  ];

  const filteredNavigation = navigation.filter(
    (item) => !item.requiresWallet || connected
  );

  const filteredComplianceNav = complianceNav.filter(
    (item) => !item.requiresWallet || connected
  );

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-900/50 sticky top-0 z-40 transition-colors">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-india rounded-md"></div>
            <span className="text-xl font-bold text-gradient">AadhaarChain</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-neutral-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light'
                }`}
              >
                {item.name}
              </Link>
            ))}

            <ThemeToggle />
            <WalletMultiButton className="!bg-primary hover:!bg-primary-dark" />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <div className="scale-75">
              <WalletMultiButton className="!bg-primary hover:!bg-primary-dark !text-xs" />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200 dark:border-gray-700 animate-slide-up">
            <div className="flex flex-col space-y-3">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === item.href
                      ? 'bg-primary-light/10 text-primary'
                      : 'text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {filteredComplianceNav.length > 0 && (
                <>
                  <div className="border-t border-neutral-200 dark:border-gray-700 my-2" />
                  <span className="px-4 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Compliance & Settings
                  </span>
                  {filteredComplianceNav.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        pathname === item.href
                          ? 'bg-primary-light/10 text-primary'
                          : 'text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
