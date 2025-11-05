'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/useIdentity';
import { useToast } from '@/components/Toast';
import { Spinner, LoadingScreen } from '@/components/Loading';
import { generateDID, classifyError } from '@/lib/utils';

export default function CreateIdentityPage() {
  const { connected, publicKey } = useWallet();
  const { createIdentity, loading: identityLoading, hasIdentity } = useIdentity();
  const { showToast } = useToast();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (hasIdentity) {
      router.push('/dashboard');
    }
  }, [connected, hasIdentity, router]);

  if (!connected || identityLoading) {
    return <LoadingScreen message="Checking identity..." />;
  }

  if (hasIdentity) {
    return <LoadingScreen message="Redirecting to dashboard..." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      showToast('error', 'Wallet not connected');
      return;
    }

    setLoading(true);

    try {
      await createIdentity(phoneNumber);
      showToast('success', 'Identity created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMsg = classifyError(error);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const did = publicKey ? generateDID(publicKey) : '';

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom max-w-2xl">
        <div className="card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-india rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
              🆔
            </div>
            <h1 className="text-3xl font-bold mb-2">Create Your Identity</h1>
            <p className="text-neutral-600">
              Create your decentralized identifier (DID) on the Solana blockchain
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Info */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Connected Wallet
              </label>
              <div className="px-4 py-3 bg-neutral-100 rounded-md font-mono text-sm">
                {publicKey?.toBase58()}
              </div>
            </div>

            {/* DID Preview */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Your DID (will be generated)
              </label>
              <div className="px-4 py-3 bg-primary-light/10 border-2 border-primary-light rounded-md font-mono text-sm text-primary">
                {did}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                This is your unique decentralized identifier on Solana
              </p>
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                Phone Number <span className="text-neutral-500">(Optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className="input"
              />
              <p className="text-xs text-neutral-500 mt-1">
                You can verify your phone number later
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Your DID will be created on Solana blockchain</li>
                <li>✓ You&apos;ll receive a default reputation score of 500</li>
                <li>✓ You can start getting verified with Aadhaar, PAN, etc.</li>
                <li>✓ You can issue and receive verifiable credentials</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Creating Identity...
                </>
              ) : (
                <>Create Identity</>
              )}
            </button>

            <p className="text-xs text-center text-neutral-500">
              By creating an identity, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🔐</div>
            <h3 className="font-semibold mb-1">Self-Sovereign</h3>
            <p className="text-sm text-neutral-600">You own and control your identity</p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🌐</div>
            <h3 className="font-semibold mb-1">Global</h3>
            <p className="text-sm text-neutral-600">Works anywhere in the world</p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold mb-1">Private</h3>
            <p className="text-sm text-neutral-600">Your data stays encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
