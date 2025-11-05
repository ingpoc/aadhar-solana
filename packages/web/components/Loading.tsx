export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-neutral-600 text-lg animate-fade-in">{message}</p>
      )}
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="animate-shimmer h-4 rounded w-3/4 mb-4"></div>
      <div className="animate-shimmer h-4 rounded w-1/2 mb-4"></div>
      <div className="animate-shimmer h-4 rounded w-5/6"></div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <Spinner size="lg" />
    </div>
  );
}
