/**
 * File: providers.tsx
 * Purpose: Client-side providers wrapper for the app
 * Story: S106 (Auth UI)
 */

'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
