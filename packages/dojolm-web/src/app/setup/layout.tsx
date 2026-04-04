/**
 * File: /app/setup/layout.tsx
 * Purpose: Minimal layout for setup wizard — no sidebar, no nav
 * Story: Setup Wizard
 */

import type { ReactNode } from 'react';

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
