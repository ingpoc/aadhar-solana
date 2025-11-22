'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConsent } from '@/hooks/useConsent';
import { ConsentCard, ConsentModal } from '@/components/consent';
import { ConsentPurposeResponse } from '@/lib/api/endpoints';
import { ConsentType, ConsentStatus } from '@/types';
import { LoadingScreen } from '@/components/Loading';

type FilterTab = 'all' | 'active' | 'revoked' | 'expired';

export default function ConsentPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const {
    consents,
    purposes,
    loading,
    grantConsent,
    revokeConsent,
    getReceipt,
    activeConsentsCount,
    revokedConsentsCount,
  } = useConsent();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<ConsentPurposeResponse | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) return null;
  if (loading && consents.length === 0) return <LoadingScreen message="Loading consents..." />;

  const filteredConsents = consents.filter((consent) => {
    switch (activeTab) {
      case 'active':
        return consent.status === ConsentStatus.ACTIVE;
      case 'revoked':
        return consent.status === ConsentStatus.REVOKED;
      case 'expired':
        return consent.status === ConsentStatus.EXPIRED;
      default:
        return true;
    }
  });

  const expiredCount = consents.filter((c) => c.status === ConsentStatus.EXPIRED).length;

  const handleViewReceipt = async (consentId: string) => {
    const receipt = await getReceipt(consentId);
    if (receipt) {
      // Open receipt in new window or modal
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`<pre style="font-family: monospace; padding: 20px;">${receipt}</pre>`);
      }
    }
  };

  const handleGrantConsent = async (
    consentType: ConsentType,
    options?: { dataElements?: string[]; expiresInDays?: number }
  ): Promise<boolean> => {
    const result = await grantConsent(consentType, options);
    return result !== null;
  };

  const openGrantModal = (purpose: ConsentPurposeResponse) => {
    setSelectedPurpose(purpose);
    setShowGrantModal(true);
  };

  // Get purposes that don't have active consent
  const availablePurposes = purposes.filter(
    (purpose) =>
      !consents.some(
        (consent) =>
          consent.consentType === purpose.type && consent.status === ConsentStatus.ACTIVE
      )
  );

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Consent Management</h1>
        <p className="text-gray-600">
          Manage your data processing consents under the Digital Personal Data Protection Act, 2023
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Active Consents</div>
          <div className="text-2xl font-bold text-green-600">{activeConsentsCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Revoked</div>
          <div className="text-2xl font-bold text-red-600">{revokedConsentsCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Expired</div>
          <div className="text-2xl font-bold text-gray-600">{expiredCount}</div>
        </div>
      </div>

      {/* Available Consents to Grant */}
      {availablePurposes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Available Consent Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePurposes.map((purpose) => (
              <div
                key={purpose.type}
                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openGrantModal(purpose)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{purpose.name}</h3>
                  {purpose.required && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{purpose.description}</p>
                <button className="btn-primary text-sm w-full">Grant Consent</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All', count: consents.length },
          { key: 'active', label: 'Active', count: activeConsentsCount },
          { key: 'revoked', label: 'Revoked', count: revokedConsentsCount },
          { key: 'expired', label: 'Expired', count: expiredCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as FilterTab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Consent List */}
      <div className="space-y-4">
        {filteredConsents.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500 mb-4">No consents found for this filter.</p>
            {activeTab !== 'all' && (
              <button onClick={() => setActiveTab('all')} className="btn-outline">
                View All Consents
              </button>
            )}
          </div>
        ) : (
          filteredConsents.map((consent) => (
            <ConsentCard
              key={consent.id}
              consent={consent}
              onRevoke={revokeConsent}
              onViewReceipt={handleViewReceipt}
            />
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Your Rights Under DPDP Act 2023</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>You have the right to withdraw consent at any time</li>
          <li>Withdrawal of consent will not affect lawfulness of prior processing</li>
          <li>Some consents may be required for core functionality</li>
          <li>You can request a copy of your consent receipt for your records</li>
        </ul>
      </div>

      {/* Grant Modal */}
      {selectedPurpose && (
        <ConsentModal
          isOpen={showGrantModal}
          onClose={() => {
            setShowGrantModal(false);
            setSelectedPurpose(null);
          }}
          purpose={selectedPurpose}
          onGrant={handleGrantConsent}
        />
      )}
    </div>
  );
}
