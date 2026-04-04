'use client';

/**
 * File: GuardDashboard.tsx
 * Purpose: Main Guard dashboard with metrics, mode selector, and audit log
 * Story: TPI-UIP-11
 */

import { useEffect, useState } from 'react';
import { useGuard } from '@/lib/contexts/GuardContext';
import { GuardModeSelector } from './GuardModeSelector';
import { GuardAuditLog } from './GuardAuditLog';
import { SystemPromptHardener } from './SystemPromptHardener';
import { ForgeDefensePanel } from './ForgeDefensePanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { GUARD_MODES } from '@/lib/guard-constants';
import { ShieldAlert, ShieldCheck, ShieldOff, BarChart3, Eye } from 'lucide-react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { GuardProvider } from '@/lib/contexts/GuardContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type GuardTab = 'overview' | 'hardening' | 'defenses';

function GuardDashboardInner() {
  const { stats, isLoading, error, refreshStats, config } = useGuard();
  const [activeTab, setActiveTab] = useState<GuardTab>('overview');

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse motion-reduce:animate-none" aria-busy="true" role="status" aria-label="Loading guard dashboard">
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
      <ModuleHeader
        title="Hattori Guard"
        subtitle="Configurable input/output guard for LLM test execution with audit trail"
        icon={ShieldCheck}
      />

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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GuardTab)} className="space-y-4">
        <TabsList aria-label="Hattori Guard views" className="bg-muted/50">
          <TabsTrigger value="overview" className="min-h-[44px]">Overview</TabsTrigger>
          <TabsTrigger value="hardening" className="min-h-[44px]">Hardening</TabsTrigger>
          <TabsTrigger value="defenses" className="min-h-[44px]">Defense Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Mode Selector */}
          <section aria-label="Guard mode configuration">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Guard Mode</h3>
            <GuardModeSelector />
          </section>

          {/* Audit Log */}
          <section aria-label="Guard audit log">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Audit Log</h3>
            <GuardAuditLog />
          </section>
        </TabsContent>

        <TabsContent value="hardening">
          <section aria-label="System prompt hardening">
            <SystemPromptHardener />
          </section>
        </TabsContent>

        <TabsContent value="defenses">
          <section aria-label="Defense templates">
            <ForgeDefensePanel />
          </section>
        </TabsContent>
      </Tabs>
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
