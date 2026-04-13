/**
 * File: Providers.tsx
 * Purpose: Consolidated provider wrapper for all application contexts (ARCH-4)
 * Story: TPI-NODA-8.2
 * Index:
 * - Providers component (line 16)
 *
 * Consolidates: NavigationProvider, ActivityProvider, ScannerProvider,
 *               GuardProvider, EcosystemProvider
 */

'use client'

import type { ReactNode } from 'react'
import { NavigationProvider } from './NavigationContext'
import { ActivityProvider } from './contexts/ActivityContext'
import { ScannerProvider } from './ScannerContext'
import { GuardProvider } from './contexts/GuardContext'
import { EcosystemProvider } from './contexts/EcosystemContext'
import { ModuleVisibilityProvider } from './contexts/ModuleVisibilityContext'
import { BehavioralAnalysisProvider } from './contexts/BehavioralAnalysisContext'

/**
 * Root provider stack for the NODA application.
 * Order matters — inner providers can depend on outer ones.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <ModuleVisibilityProvider>
        <ActivityProvider>
          <ScannerProvider>
            <GuardProvider>
              <EcosystemProvider>
                <BehavioralAnalysisProvider>
                  {children}
                </BehavioralAnalysisProvider>
              </EcosystemProvider>
            </GuardProvider>
          </ScannerProvider>
        </ActivityProvider>
      </ModuleVisibilityProvider>
    </NavigationProvider>
  )
}
