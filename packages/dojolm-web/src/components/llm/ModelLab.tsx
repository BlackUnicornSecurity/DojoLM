/**
 * File: ModelLab.tsx
 * Purpose: Model Lab (Jutsu) — post-decomposition replacement for the monolithic
 *          LLMDashboard shell. Hosts the model-centric subset of the old dashboard:
 *          Models | Compare | Jutsu | Custom. TestExecution moved to Atemi Test Cases,
 *          Leaderboard + AnalyticsWorkspace moved to Bushido Insights, Results demoted
 *          to Dashboard Activity + topbar drawer.
 * Stories: Train 2 PR-4b.6 part 3
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModelList } from './ModelList';
import { ComparisonView } from './ComparisonView';
import { CustomProviderBuilder } from './CustomProviderBuilder';
import { JutsuTab } from './JutsuTab';
import { LLMModelProvider, LLMExecutionProvider, LLMResultsProvider } from '@/lib/contexts';
import { Brain, GitCompare, Wrench, ScrollText, Crosshair } from 'lucide-react';
import { TestFlowBanner } from '@/components/ui/TestFlowBanner';
import { GuardBadge } from '@/components/guard';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { ConsolidatedReportButton } from '@/components/reports/ConsolidatedReportButton';
import { ReportGenerator } from './ReportGenerator';
import { useNavigation } from '@/lib/NavigationContext';

type ModelLabTab = 'models' | 'compare' | 'jutsu' | 'custom';

export interface ModelLabProps {
  /** Optional initial tab to display. Defaults to 'models'. */
  initialTab?: ModelLabTab;
}

const VALID_TABS: readonly ModelLabTab[] = ['models', 'compare', 'jutsu', 'custom'];

/**
 * ModelLab — the new Model Lab (Jutsu) surface.
 *
 * Four tabs covering the model-centric half of the old LLM Dashboard:
 * - **Models** (`ModelList`) — provider config, add/edit/delete, test connection
 * - **Compare** (`ComparisonView`) — side-by-side provider compliance heatmap
 * - **Jutsu** (`JutsuTab`) — per-model aggregated resilience cards with belt scoring
 * - **Custom** (`CustomProviderBuilder`) — preset-backed or fully custom API providers
 *
 * Test execution, batch runs, SSE progress, real-time results live in Atemi Lab
 * Test Cases (PR-4b.6 part 4). Leaderboard + Analytics surface in Bushido Book
 * Insights (PR-4b.6 part 5).
 */
export function ModelLab({ initialTab = 'models' }: ModelLabProps) {
  const [activeTab, setActiveTab] = useState<ModelLabTab>(initialTab);
  const { setActiveTab: navigateTo } = useNavigation();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Model Lab"
        subtitle="Configure providers, compare coverage, and review per-model resilience"
        icon={Brain}
        actions={
          <>
            <ConsolidatedReportButton />
            <ReportGenerator compact />
            <GuardBadge />
          </>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if ((VALID_TABS as readonly string[]).includes(v)) {
            setActiveTab(v as ModelLabTab);
          }
        }}
        className="space-y-4"
      >
        <TabsList className="flex w-full h-auto gap-1 bg-muted/50 p-1 rounded-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="models" className="flex-1 min-w-[120px] gap-1.5">
            <Brain className="h-4 w-4" aria-hidden="true" />
            Models
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex-1 min-w-[120px] gap-1.5">
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="jutsu" className="flex-1 min-w-[120px] gap-1.5">
            <ScrollText className="h-4 w-4" aria-hidden="true" />
            Jutsu
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1 min-w-[120px] gap-1.5">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <ModelList />
        </TabsContent>
        <TabsContent value="compare">
          <ComparisonView />
        </TabsContent>
        <TabsContent value="jutsu">
          <JutsuTab onNavigateToTests={() => navigateTo('adversarial')} />
        </TabsContent>
        <TabsContent value="custom">
          <CustomProviderBuilder />
        </TabsContent>
      </Tabs>

      <TestFlowBanner
        show={true}
        message="Model configured. Run adversarial attacks against it?"
        actionLabel="Open Atemi Lab"
        targetNavId="adversarial"
        storageKey="flow-jutsu-to-atemi"
        icon={Crosshair}
      />
    </div>
  );
}

/**
 * ModelLabWithProviders — ModelLab wrapped in the LLM context providers.
 *
 * Same provider tree as the old LLMDashboardWithProviders so child components
 * (ModelList, ComparisonView, CustomProviderBuilder) can consume useModelContext,
 * useExecutionContext, and useResultsContext without changes.
 */
export function ModelLabWithProviders({ initialTab }: ModelLabProps) {
  return (
    <LLMModelProvider>
      <LLMExecutionProvider>
        <LLMResultsProvider>
          <ModelLab initialTab={initialTab} />
        </LLMResultsProvider>
      </LLMExecutionProvider>
    </LLMModelProvider>
  );
}
