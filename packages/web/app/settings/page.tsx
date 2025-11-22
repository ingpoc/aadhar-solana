'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
}

function SettingsCard({ title, description, icon, href }: SettingsCardProps) {
  return (
    <Link
      href={href}
      className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { user } = useAuth();

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and security</p>
      </div>

      {/* Account Overview */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-india rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {publicKey?.toString().slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-6)}
            </h2>
            {user?.email && (
              <p className="text-gray-600">{user.email}</p>
            )}
            <p className="text-sm text-gray-500">Connected Wallet</p>
          </div>
        </div>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsCard
          title="Profile"
          description="Manage your personal information and preferences"
          icon="👤"
          href="/settings/profile"
        />
        <SettingsCard
          title="Security"
          description="Password, 2FA, and session management"
          icon="🔒"
          href="/settings/security"
        />
        <SettingsCard
          title="Privacy"
          description="Manage your privacy preferences and data"
          icon="🛡️"
          href="/privacy"
        />
        <SettingsCard
          title="Consent Management"
          description="Review and manage your data processing consents"
          icon="📝"
          href="/consent"
        />
        <SettingsCard
          title="Data Rights"
          description="Access, export, or delete your personal data"
          icon="📋"
          href="/data-rights"
        />
        <SettingsCard
          title="Activity Log"
          description="View your recent activity and audit trail"
          icon="📊"
          href="/activity"
        />
      </div>

      {/* Danger Zone */}
      <div className="mt-8 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-gray-600 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/data-rights/erasure"
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete Account
          </Link>
        </div>
      </div>
    </div>
  );
}
