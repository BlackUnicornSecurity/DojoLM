/**
 * File: LLMDashboard.tsx
 * Purpose: Main LLM Testing Dashboard component
 * Index:
 * - LLMDashboard component (line 26)
 * - LLMDashboardWithProviders (line 118)
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModelList } from './ModelList';
import { TestExecution } from './TestExecution';
import { ResultsView } from './ResultsView';
import { Leaderboard } from './Leaderboard';
import { ComparisonView } from './ComparisonView';
import { CustomProviderBuilder } from './CustomProviderBuilder';
import { ReportGenerator } from './ReportGenerator';
import { AnalyticsWorkspace } from './AnalyticsWorkspace';
import { LLMModelProvider, LLMExecutionProvider, LLMResultsProvider } from '@/lib/contexts';
import { Brain, Play, BarChart3, Trophy, GitCompare, Wrench, ScrollText, FlaskConical } from 'lucide-react';
import { GuardBadge } from '@/components/guard';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ConsolidatedReportButton } from '@/components/reports/ConsolidatedReportButton';
import { JutsuTab } from './JutsuTab';

type DashboardTab = 'models' | 'tests' | 'results' | 'leaderboard' | 'compare' | 'analytics' | 'custom' | 'jutsu';

export interface LLMDashboardProps {
  /** Optional initial tab to display */
  initialTab?: DashboardTab;
}

/**
 * Main LLM Testing Dashboard
 *
 * Provides comprehensive testing interface for LLM models including:
 * - Model configuration and management
 * - Test execution (single and batch) with real-time SSE progress
 * - Results analysis with vulnerability grouping
 * - Executive summary with risk tier and recommendations
 * - Deliverable downloads (JSON, CSV, SARIF, PDF)
 * - Model comparison leaderboard with sparklines
 */
export function LLMDashboard({ initialTab = 'models' }: LLMDashboardProps) {
  // Migrate legacy tab positions from localStorage (H7.2)
  const migratedTab = (() => {
    if (initialTab === ('summary' as string) || initialTab === ('vulnerabilities' as string)) {
      return 'results' as DashboardTab;
    }
    return initialTab;
  })();

  const [activeTab, setActiveTab] = useState<DashboardTab>(migratedTab);

  // One-time localStorage migration for persisted tab state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('llm-dashboard-tab');
      if (stored === 'summary' || stored === 'vulnerabilities') {
        localStorage.setItem('llm-dashboard-tab', 'results');
      }
    } catch {
      // localStorage unavailable or QuotaExceededError — ignore
    }
  }, []);

  const validTabs: readonly DashboardTab[] = [
    'models', 'tests', 'results',
    'leaderboard', 'compare', 'analytics', 'custom', 'jutsu',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModuleHeader
        title="LLM Testing Dashboard"
        subtitle="Configure, test, and analyze LLM models against security test cases"
        icon={Brain}
        actions={
          <>
            <ConsolidatedReportButton />
            <ReportGenerator compact />
            <GuardBadge />
          </>
        }
      />

      {/* Nested tabs for dashboard sections */}
      <Tabs value={activeTab} onValueChange={(v) => {
        if ((validTabs as readonly string[]).includes(v)) setActiveTab(v as DashboardTab);
      }} className="space-y-4">
        <TabsList className="flex w-full h-auto gap-1 bg-muted/50 p-1 rounded-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="models" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Models">
            <Brain className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Models</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Tests">
            <Play className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Results">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Leaderboard">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Board</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Compare">
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Analytics">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Custom Models">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Custom Models</span>
          </TabsTrigger>
          <TabsTrigger value="jutsu" className="gap-2 min-h-[44px] flex-shrink-0 px-3" aria-label="Jutsu">
            <ScrollText className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Jutsu</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <ModelList />
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <TestExecution onNavigateToResults={() => setActiveTab('results')} />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <ResultsView />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Leaderboard />
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <ComparisonView />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsWorkspace />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <CustomProviderBuilder />
        </TabsContent>

        <TabsContent value="jutsu" className="space-y-4">
          <JutsuTab onNavigateToTests={() => setActiveTab('tests')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * LLM Dashboard with all providers
 * Use this component to wrap the dashboard with necessary contexts
 */
export function LLMDashboardWithProviders({ initialTab }: LLMDashboardProps) {
  return (
    <LLMModelProvider>
      <LLMExecutionProvider>
        <LLMResultsProvider>
          <LLMDashboard initialTab={initialTab} />
        </LLMResultsProvider>
      </LLMExecutionProvider>
    </LLMModelProvider>
  );
}
