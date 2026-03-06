'use client';

/**
 * File: GuardDashboard.tsx
 * Purpose: Main Guard dashboard with metrics, mode selector, and audit log
 * Story: TPI-UIP-11
 */

import { useEffect } from 'react';
import { useGuard } from '@/lib/contexts/GuardContext';
import { GuardModeSelector } from './GuardModeSelector';
import { GuardAuditLog } from './GuardAuditLog';
import { MetricCard } from '@/components/ui/MetricCard';
import { GUARD_MODES } from '@/lib/guard-constants';
import { ShieldAlert, ShieldCheck, ShieldOff, BarChart3, Eye } from 'lucide-react';
import { GuardProvider } from '@/lib/contexts/GuardContext';

function GuardDashboardInner() {
  const { stats, isLoading, error, refreshStats, config } = useGuard();

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse motion-reduce:animate-none" aria-busy="true">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--dojo-primary)]/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-[var(--dojo-primary)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Hattori Guard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configurable input/output guard for LLM test execution with audit trail
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--status-block-bg)] border border-[var(--status-block)]/30 text-sm text-[var(--status-block)]" role="alert">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Events"
          value={stats?.totalEvents ?? 0}
          icon={Eye}
          accent="primary"
        />
        <MetricCard
          label="Blocked"
          value={stats?.byAction.block ?? 0}
          icon={ShieldOff}
          accent="danger"
          sparklineData={
            stats?.recentTimestamps
              .slice(-20)
              .map(() => 1) ?? []
          }
        />
        <MetricCard
          label="Block Rate"
          value={`${stats?.blockRate ?? 0}%`}
          icon={BarChart3}
          accent="warning"
        />
        <MetricCard
          label="Active Mode"
          value={config.enabled ? (GUARD_MODES.find(m => m.id === config.mode)?.name ?? config.mode) : 'Off'}
          icon={ShieldAlert}
          accent="success"
        />
      </div>

      {/* Mode Selector */}
      <section aria-label="Guard mode configuration">
        <h3 className="text-lg font-semibold mb-3">Guard Mode</h3>
        <GuardModeSelector />
      </section>

      {/* Audit Log */}
      <section aria-label="Guard audit log">
        <h3 className="text-lg font-semibold mb-3">Audit Log</h3>
        <GuardAuditLog />
      </section>
    </div>
  );
}

/** Guard dashboard with provider wrapper */
export function GuardDashboard() {
  return (
    <GuardProvider>
      <GuardDashboardInner />
    </GuardProvider>
  );
}
