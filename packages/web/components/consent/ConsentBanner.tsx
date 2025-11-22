'use client';

import { useState, useEffect } from 'react';
import { useConsent } from '@/hooks/useConsent';
import { ConsentType } from '@/types';

interface ConsentBannerProps {
  onAcceptEssential?: () => void;
  onAcceptAll?: () => void;
  onManagePreferences?: () => void;
}

const ESSENTIAL_CONSENTS: ConsentType[] = [
  ConsentType.IDENTITY_CREATION,
  ConsentType.GOVERNMENT_VERIFICATION,
];

export function ConsentBanner({
  onAcceptEssential,
  onAcceptAll,
  onManagePreferences,
}: ConsentBannerProps) {
  const { consents, grantConsent, hasActiveConsent, loading } = useConsent();
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't granted essential consents
    const hasEssentialConsents = ESSENTIAL_CONSENTS.every((type) => hasActiveConsent(type));
    const dismissed = localStorage.getItem('consent_banner_dismissed');
    setVisible(!hasEssentialConsents && !dismissed);
  }, [consents, hasActiveConsent]);

  const handleAcceptEssential = async () => {
    setAccepting(true);
    for (const type of ESSENTIAL_CONSENTS) {
      if (!hasActiveConsent(type)) {
        await grantConsent(type);
      }
    }
    setAccepting(false);
    setVisible(false);
    localStorage.setItem('consent_banner_dismissed', 'true');
    onAcceptEssential?.();
  };

  const handleAcceptAll = async () => {
    setAccepting(true);
    const allTypes = Object.values(ConsentType);
    for (const type of allTypes) {
      if (!hasActiveConsent(type)) {
        await grantConsent(type);
      }
    }
    setAccepting(false);
    setVisible(false);
    localStorage.setItem('consent_banner_dismissed', 'true');
    onAcceptAll?.();
  };

  const handleManagePreferences = () => {
    onManagePreferences?.();
  };

  if (!visible || loading) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 animate-slide-up">
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="container-custom py-4 px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                We Value Your Privacy
              </h3>
              <p className="text-sm text-gray-600">
                AadhaarChain requires your consent for identity verification and data processing
                in compliance with the Digital Personal Data Protection Act, 2023.
                Your data is encrypted and you maintain full control.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleManagePreferences}
                className="btn-outline text-sm"
                disabled={accepting}
              >
                Manage Preferences
              </button>
              <button
                onClick={handleAcceptEssential}
                disabled={accepting}
                className="btn-outline text-sm"
              >
                {accepting ? 'Processing...' : 'Accept Essential'}
              </button>
              <button
                onClick={handleAcceptAll}
                disabled={accepting}
                className="btn-primary text-sm"
              >
                {accepting ? 'Processing...' : 'Accept All'}
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            <p>
              By clicking &quot;Accept All&quot;, you consent to all processing purposes.
              Click &quot;Manage Preferences&quot; to customize your choices.{' '}
              <a href="/privacy" className="text-primary underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;
