import { PublicKey } from '@solana/web3.js';
import { VerificationBitmap } from '@/types';

/**
 * Truncate a public key or address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format SOL amount from lamports
 */
export function formatSOL(lamports: number | bigint | string): string {
  const amount = typeof lamports === 'bigint' ? Number(lamports) : Number(lamports);
  const sol = amount / 1_000_000_000;
  return sol.toFixed(4);
}

/**
 * Parse SOL amount to lamports
 */
export function parseSOL(sol: number | string): number {
  const amount = typeof sol === 'string' ? parseFloat(sol) : sol;
  return Math.floor(amount * 1_000_000_000);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (includeTime) {
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return formatDate(d);
}

/**
 * Parse verification bitmap (u64) to object
 */
export function parseVerificationBitmap(bitmap: bigint | string | number): VerificationBitmap {
  const bits = typeof bitmap === 'bigint' ? bitmap : BigInt(bitmap);

  return {
    aadhaar: (bits & (1n << 0n)) !== 0n,
    pan: (bits & (1n << 1n)) !== 0n,
    educational: (bits & (1n << 2n)) !== 0n,
    email: (bits & (1n << 3n)) !== 0n,
    phone: (bits & (1n << 4n)) !== 0n,
    bankAccount: (bits & (1n << 5n)) !== 0n,
  };
}

/**
 * Count number of verifications completed
 */
export function countVerifications(bitmap: VerificationBitmap): number {
  return Object.values(bitmap).filter(Boolean).length;
}

/**
 * Generate a DID from public key
 */
export function generateDID(publicKey: string | PublicKey): string {
  const pubkeyStr = typeof publicKey === 'string' ? publicKey : publicKey.toBase58();
  return `did:sol:${pubkeyStr}`;
}

/**
 * Validate Aadhaar number (12 digits)
 */
export function validateAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
}

/**
 * Validate PAN number (ABCDE1234F format)
 */
export function validatePAN(pan: string): boolean {
  const cleaned = pan.toUpperCase().replace(/\s/g, '');
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(cleaned);
}

/**
 * Format Aadhaar for display (XXXX XXXX 1234)
 */
export function formatAadhaar(aadhaar: string, mask: boolean = true): string {
  const cleaned = aadhaar.replace(/\s/g, '');
  if (cleaned.length !== 12) return aadhaar;

  if (mask) {
    return `XXXX XXXX ${cleaned.slice(-4)}`;
  }

  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)}`;
}

/**
 * Format PAN for display
 */
export function formatPAN(pan: string, mask: boolean = true): string {
  const cleaned = pan.toUpperCase().replace(/\s/g, '');
  if (cleaned.length !== 10) return pan;

  if (mask) {
    return `${cleaned.slice(0, 2)}XXX${cleaned.slice(5, 9)}X`;
  }

  return cleaned;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format reputation score with color
 */
export function getReputationColor(score: number): string {
  if (score >= 800) return 'text-green-600';
  if (score >= 600) return 'text-blue-600';
  if (score >= 400) return 'text-yellow-600';
  if (score >= 200) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get reputation badge text
 */
export function getReputationBadge(score: number): string {
  if (score >= 900) return 'Excellent';
  if (score >= 800) return 'Very Good';
  if (score >= 600) return 'Good';
  if (score >= 400) return 'Fair';
  if (score >= 200) return 'Poor';
  return 'Very Poor';
}

/**
 * Calculate time until unlock
 */
export function getTimeUntilUnlock(unlockTime: Date | string): string {
  const unlock = typeof unlockTime === 'string' ? new Date(unlockTime) : unlockTime;
  const now = new Date();
  const diffMs = unlock.getTime() - now.getTime();

  if (diffMs <= 0) return 'Unlocked';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
  return `${diffMins}m`;
}

/**
 * Classify error for user-friendly display
 */
export function classifyError(error: any): string {
  if (typeof error === 'string') return error;

  if (error?.message) {
    // Solana errors
    if (error.message.includes('User rejected')) return 'Transaction was cancelled';
    if (error.message.includes('Insufficient funds')) return 'Insufficient SOL balance';
    if (error.message.includes('Network request failed')) return 'Network error. Please try again';

    return error.message;
  }

  return 'An unexpected error occurred';
}
