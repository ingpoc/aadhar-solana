'use client';

import { useAuth as useAuthContext } from '@/contexts/AuthContext';

// Re-export the hook from context
export const useAuth = useAuthContext;
