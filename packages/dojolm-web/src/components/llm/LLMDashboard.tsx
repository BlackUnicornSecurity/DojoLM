/**
 * File: LLMDashboard.tsx
 * Purpose: Main LLM Testing Dashboard component
 * Index:
 * - LLMDashboard component (line 23)
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModelList } from './ModelList';
import { TestExecution } from './TestExecution';
import { ResultsView } from './ResultsView';
import { Leaderboard } from './Leaderboard';
import { LLMModelProvider, LLMExecutionProvider, LLMResultsProvider } from '@/lib/contexts';
import { Brain, Play, BarChart3, Trophy } from 'lucide-react';

export interface LLMDashboardProps {
  /** Optional initial tab to display */
  initialTab?: 'models' | 'tests' | 'results' | 'leaderboard';
}

/**
 * Main LLM Testing Dashboard
 *
 * Provides comprehensive testing interface for LLM models including:
 * - Model configuration and management
 * - Test execution (single and batch)
 * - Results analysis and reporting
 * - Model comparison leaderboard
 */
export function LLMDashboard({ initialTab = 'models' }: LLMDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">LLM Testing Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure, test, and analyze LLM models against security test cases
        </p>
      </div>

      {/* Nested tabs for dashboard sections */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full h-auto gap-2 bg-muted/50 p-2">
          <TabsTrigger value="models" className="gap-2">
            <Brain className="h-4 w-4" />
            <span>Models</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-2">
            <Play className="h-4 w-4" />
            <span>Tests</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span>Leaderboard</span>
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

        <TabsContent value="leaderboard" className="space-y-4">
          <Leaderboard />
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
