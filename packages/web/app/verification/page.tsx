'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/hooks/useIdentity';
import { useToast } from '@/components/Toast';
import { LoadingScreen, Spinner } from '@/components/Loading';
import { verificationApi } from '@/lib/api';
import { validateAadhaar, validatePAN, classifyError } from '@/lib/utils';
import { VerificationType } from '@/types';

export default function VerificationPage() {
  const { connected } = useWallet();
  const { identity, loading: identityLoading, hasIdentity } = useIdentity();
  const { showToast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [loading, setLoading] = useState(false);

  // Aadhaar form
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarConsent, setAadhaarConsent] = useState(false);

  // PAN form
  const [panNumber, setPanNumber] = useState('');
  const [panConsent, setPanConsent] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!identityLoading && !hasIdentity) {
      router.push('/identity/create');
    }
  }, [connected, identityLoading, hasIdentity, router]);

  if (!connected || identityLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!identity) {
    return <LoadingScreen message="Redirecting..." />;
  }

  const handleAadhaarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAadhaar(aadhaarNumber)) {
      showToast('error', 'Invalid Aadhaar number. Must be 12 digits.');
      return;
    }

    if (!aadhaarConsent) {
      showToast('error', 'Please provide consent to proceed');
      return;
    }

    setLoading(true);

    try {
      await verificationApi.verifyAadhaar({
        identityId: identity.id,
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
        consent: aadhaarConsent,
      });

      showToast('success', 'Aadhaar verification request submitted successfully!');
      setAadhaarNumber('');
      setAadhaarConsent(false);
    } catch (error: any) {
      const errorMsg = classifyError(error);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePANSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePAN(panNumber)) {
      showToast('error', 'Invalid PAN number. Format: ABCDE1234F');
      return;
    }

    if (!panConsent) {
      showToast('error', 'Please provide consent to proceed');
      return;
    }

    setLoading(true);

    try {
      await verificationApi.verifyPAN({
        identityId: identity.id,
        panNumber: panNumber.toUpperCase().replace(/\s/g, ''),
        consent: panConsent,
      });

      showToast('success', 'PAN verification request submitted successfully!');
      setPanNumber('');
      setPanConsent(false);
    } catch (error: any) {
      const errorMsg = classifyError(error);
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Request Verification</h1>
          <p className="text-neutral-600">
            Verify your identity with government-issued credentials
          </p>
        </div>

        {/* Tabs */}
        <div className="card mb-8">
          <div className="flex border-b border-neutral-200 mb-6">
            <button
              onClick={() => setActiveTab('aadhaar')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'aadhaar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-600 hover:text-primary'
              }`}
            >
              Aadhaar Verification
            </button>
            <button
              onClick={() => setActiveTab('pan')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'pan'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-600 hover:text-primary'
              }`}
            >
              PAN Verification
            </button>
          </div>

          {/* Aadhaar Form */}
          {activeTab === 'aadhaar' && (
            <form onSubmit={handleAadhaarSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="aadhaar"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  id="aadhaar"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                  className="input"
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Enter your 12-digit Aadhaar number
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Important Information</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Your Aadhaar data will be verified through API Setu (Government of India)</li>
                  <li>• Only verification status will be stored on blockchain</li>
                  <li>• Your actual Aadhaar number will NOT be stored on blockchain</li>
                  <li>• This process is secure and privacy-preserving</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="aadhaar-consent"
                  checked={aadhaarConsent}
                  onChange={(e) => setAadhaarConsent(e.target.checked)}
                  className="mt-1"
                  required
                />
                <label htmlFor="aadhaar-consent" className="text-sm text-neutral-700">
                  I consent to verify my Aadhaar with API Setu (Government of India) for the
                  purpose of identity verification on AadhaarChain. I understand that only the
                  verification status will be recorded on the blockchain.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Verifying...
                  </>
                ) : (
                  <>Verify Aadhaar</>
                )}
              </button>
            </form>
          )}

          {/* PAN Form */}
          {activeTab === 'pan' && (
            <form onSubmit={handlePANSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="pan"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  PAN Number
                </label>
                <input
                  type="text"
                  id="pan"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="input uppercase"
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Enter your 10-character PAN (Permanent Account Number)
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Important Information</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Your PAN will be verified through official government APIs</li>
                  <li>• Only verification status will be stored on blockchain</li>
                  <li>• Your actual PAN number will NOT be stored on blockchain</li>
                  <li>• This process is secure and privacy-preserving</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="pan-consent"
                  checked={panConsent}
                  onChange={(e) => setPanConsent(e.target.checked)}
                  className="mt-1"
                  required
                />
                <label htmlFor="pan-consent" className="text-sm text-neutral-700">
                  I consent to verify my PAN with government APIs for the purpose of identity
                  verification on AadhaarChain. I understand that only the verification status
                  will be recorded on the blockchain.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Verifying...
                  </>
                ) : (
                  <>Verify PAN</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold mb-1">Secure</h3>
            <p className="text-sm text-neutral-600">Government-grade security</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold mb-1">Fast</h3>
            <p className="text-sm text-neutral-600">Instant verification</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">🔐</div>
            <h3 className="font-semibold mb-1">Private</h3>
            <p className="text-sm text-neutral-600">Your data stays private</p>
          </div>
        </div>
      </div>
    </div>
  );
}
