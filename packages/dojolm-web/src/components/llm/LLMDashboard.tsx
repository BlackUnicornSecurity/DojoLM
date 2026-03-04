/**
 * File: LLMDashboard.tsx
 * Purpose: Main LLM Testing Dashboard component
 * Index:
 * - LLMDashboard component (line 28)
 * - LLMDashboardWithProviders (line 130)
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModelList } from './ModelList';
import { TestExecution } from './TestExecution';
import { ResultsView } from './ResultsView';
import { Leaderboard } from './Leaderboard';
import { ComparisonView } from './ComparisonView';
import { CustomProviderBuilder } from './CustomProviderBuilder';
import { ExecutiveSummary } from './ExecutiveSummary';
import { VulnerabilityPanel } from './VulnerabilityPanel';
import { ReportGenerator } from './ReportGenerator';
import { LLMModelProvider, LLMExecutionProvider, LLMResultsProvider } from '@/lib/contexts';
import { Brain, Play, BarChart3, Trophy, GitCompare, Wrench, FileText, ShieldAlert, Download } from 'lucide-react';
import { GuardBadge } from '@/components/guard';

type DashboardTab = 'models' | 'tests' | 'results' | 'summary' | 'vulnerabilities' | 'leaderboard' | 'compare' | 'custom';

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
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  const validTabs: readonly DashboardTab[] = [
    'models', 'tests', 'results', 'summary', 'vulnerabilities',
    'leaderboard', 'compare', 'custom',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">LLM Testing Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure, test, and analyze LLM models against security test cases
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportGenerator compact />
          <GuardBadge />
        </div>
      </div>

      {/* Nested tabs for dashboard sections */}
      <Tabs value={activeTab} onValueChange={(v) => {
        if ((validTabs as readonly string[]).includes(v)) setActiveTab(v as DashboardTab);
      }} className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full h-auto gap-2 bg-muted/50 p-2">
          <TabsTrigger value="models" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Models</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="vulnerabilities" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Vulns</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Board</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Custom</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <ModelList />
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <TestExecution />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <ResultsView />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <ExecutiveSummary />
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <VulnerabilityPanel />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Leaderboard />
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <ComparisonView />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <CustomProviderBuilder />
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
