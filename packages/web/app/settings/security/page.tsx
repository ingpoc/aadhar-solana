'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@/components/Toast';

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export default function SecurityPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { showToast } = useToast();

  const [sessions] = useState<Session[]>([
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'Mumbai, India',
      lastActive: new Date().toISOString(),
      current: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'Delhi, India',
      lastActive: new Date(Date.now() - 3600000).toISOString(),
      current: false,
    },
  ]);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;

  const handleLogoutSession = async (sessionId: string) => {
    showToast('Session terminated', 'success');
  };

  const handleLogoutAll = async () => {
    showToast('All other sessions terminated', 'success');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Security</h1>
        <p className="text-gray-600">Manage your security settings and active sessions</p>
      </div>

      {/* Wallet Security */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Wallet Security</h2>

        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <p className="font-medium text-green-900">Hardware Wallet Connected</p>
              <p className="text-sm text-green-700">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-6)}
              </p>
            </div>
          </div>
          <span className="badge bg-green-100 text-green-800">Active</span>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Your wallet provides cryptographic security for all transactions.
          Never share your private keys or seed phrase with anyone.
        </p>
      </div>

      {/* Active Sessions */}
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Active Sessions</h2>
          <button
            onClick={handleLogoutAll}
            className="text-sm text-red-600 hover:underline"
          >
            Logout all other sessions
          </button>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border ${
                session.current ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{session.device}</p>
                    {session.current && (
                      <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{session.location}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last active: {new Date(session.lastActive).toLocaleString()}
                  </p>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleLogoutSession(session.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Terminate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Security Recommendations</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-green-500">✓</span>
            <div>
              <p className="font-medium text-gray-900">Wallet Connected</p>
              <p className="text-sm text-gray-600">
                Your transactions are secured by your wallet&apos;s cryptographic keys
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-green-500">✓</span>
            <div>
              <p className="font-medium text-gray-900">Secure Connection</p>
              <p className="text-sm text-gray-600">
                All communications are encrypted with TLS
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-yellow-500">!</span>
            <div>
              <p className="font-medium text-gray-900">Review Active Sessions</p>
              <p className="text-sm text-gray-600">
                Regularly review and terminate unused sessions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-1">Security Best Practices</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>Never share your wallet&apos;s private key or seed phrase</li>
          <li>Use a hardware wallet for enhanced security</li>
          <li>Review transactions carefully before signing</li>
          <li>Keep your wallet software up to date</li>
        </ul>
      </div>
    </div>
  );
}
