/**
 * File: /app/setup/page.tsx
 * Purpose: First-startup setup wizard entry point
 * Story: Setup Wizard
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SetupWizard } from '@/components/setup/SetupWizard';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/setup/status');
        if (res.ok) {
          const data = await res.json();
          if (data.needsSetup) {
            setNeedsSetup(true);
          } else {
            router.replace('/login');
            return;
          }
        } else {
          router.replace('/login');
          return;
        }
      } catch {
        router.replace('/login');
        return;
      }
      setChecking(false);
    }
    checkStatus();
  }, [router]);

  if (checking || !needsSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <SetupWizard />;
}
