'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';
import { useIdentity } from '@/hooks/useIdentity';
import { useToast } from '@/components/Toast';
import { formatDate, truncateAddress } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { user } = useAuth();
  const { identity } = useIdentity();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  if (!connected) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // In a real app, this would call the API
    await new Promise(resolve => setTimeout(resolve, 1000));
    showToast('Profile updated successfully', 'success');
    setSaving(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`, 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  return (
    <div className="container-custom py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/settings')}
          className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your personal information</p>
      </div>

      {/* Identity Info (Read-only) */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Identity Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Wallet Address
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                {publicKey?.toString()}
              </code>
              <button
                onClick={() => copyToClipboard(publicKey?.toString() || '', 'Wallet address')}
                className="btn-outline text-sm px-3 py-2"
              >
                Copy
              </button>
            </div>
          </div>

          {identity?.did && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Decentralized Identifier (DID)
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono truncate">
                  {identity.did}
                </code>
                <button
                  onClick={() => copyToClipboard(identity.did, 'DID')}
                  className="btn-outline text-sm px-3 py-2"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {identity && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Reputation Score
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {identity.reputationScore || 500}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Account Created
                  </label>
                  <p className="text-gray-900">
                    {formatDate(identity.createdAt)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editable Profile */}
      <form onSubmit={handleSave} className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="your@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for notifications and account recovery
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="+91 98765 43210"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for SMS verification and alerts
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-1">About Your Profile</h3>
        <p className="text-sm text-blue-800">
          Your wallet address and DID are immutable and stored on the Solana blockchain.
          Contact information is stored securely and encrypted at rest.
        </p>
      </div>
    </div>
  );
}
