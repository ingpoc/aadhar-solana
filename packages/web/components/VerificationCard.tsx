import Link from 'next/link';

interface VerificationCardProps {
  title: string;
  type: 'aadhaar' | 'pan' | 'itr' | 'employment' | 'bank';
  status: 'verified' | 'pending' | 'expired';
  last4?: string;
  verifiedAt?: string;
  expiresAt?: string;
  verifyLink: string;
  onRefresh?: () => void;
}

export default function VerificationCard({
  title,
  type,
  status,
  last4,
  verifiedAt,
  expiresAt,
  verifyLink,
  onRefresh,
}: VerificationCardProps) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const daysUntilExpiry = expiresAt
    ? Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="border border-neutral-200 bg-white hover-lift">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
            <div className="flex items-center gap-2">
              <div
                className={`status-indicator ${
                  status === 'verified'
                    ? 'bg-success'
                    : status === 'expired'
                    ? 'bg-error'
                    : 'bg-secondary'
                }`}
              ></div>
              <span
                className={`text-sm font-medium ${
                  status === 'verified'
                    ? 'text-success'
                    : status === 'expired'
                    ? 'text-error'
                    : 'text-secondary'
                }`}
              >
                {status === 'verified' ? 'Verified' : status === 'expired' ? 'Expired' : 'Not Verified'}
              </span>
            </div>
          </div>
          {status === 'verified' && (
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          )}
        </div>

        {status === 'verified' ? (
          <div className="space-y-3">
            {last4 && (
              <div className="data-row">
                <span className="data-label">{type.toUpperCase()} Last 4</span>
                <span className="data-value font-mono">{last4}</span>
              </div>
            )}
            {verifiedAt && (
              <div className="data-row">
                <span className="data-label">Verified</span>
                <span className="data-value text-xs">{new Date(verifiedAt).toLocaleDateString()}</span>
              </div>
            )}
            {expiresAt && (
              <div className="data-row">
                <span className="data-label">Expires</span>
                <span
                  className={`data-value text-xs ${
                    isExpired
                      ? 'text-error'
                      : daysUntilExpiry && daysUntilExpiry < 30
                      ? 'text-secondary'
                      : 'text-success'
                  }`}
                >
                  {new Date(expiresAt).toLocaleDateString()}
                  {daysUntilExpiry !== null && !isExpired && ` (${daysUntilExpiry}d left)`}
                </span>
              </div>
            )}

            {onRefresh && (
              <button onClick={onRefresh} className="btn-secondary w-full text-sm mt-3">
                Refresh Data
              </button>
            )}
          </div>
        ) : (
          <Link href={verifyLink} className="btn-primary w-full text-center inline-block mt-3">
            Verify {title}
          </Link>
        )}
      </div>
    </div>
  );
}
