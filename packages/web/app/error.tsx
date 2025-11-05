'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full card text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
        <p className="text-neutral-600 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-4">
          <button onClick={() => reset()} className="btn-primary flex-1">
            Try Again
          </button>
          <button onClick={() => (window.location.href = '/')} className="btn-outline flex-1">
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
