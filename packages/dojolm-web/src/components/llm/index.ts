/**
 * LLM Dashboard Components
 */

export { LLMDashboard, LLMDashboardWithProviders } from './LLMDashboard';
export { ModelList } from './ModelList';
export { ModelForm } from './ModelForm';
export { TestExecution } from './TestExecution';
export { ResultsView } from './ResultsView';
export { Leaderboard } from './Leaderboard';
export { LocalModelSelector } from './LocalModelSelector';
export { TestSummary } from './TestSummary';
export { TestExporter } from './TestExporter';
export { ChatBubble } from './ChatBubble';
export { TypingIndicator } from './TypingIndicator';
export { ComparisonView } from './ComparisonView';
export { CustomProviderBuilder } from './CustomProviderBuilder';
export { ExecutiveSummary } from './ExecutiveSummary';
export { VulnerabilityPanel } from './VulnerabilityPanel';
export { ReportGenerator } from './ReportGenerator';
export { BenchmarkPanel } from './BenchmarkPanel';
export { TransferMatrixPanel } from './TransferMatrixPanel';
// Train 2 PR-4b.6 (2026-04-09): AnalyticsWorkspace extracted from LLMDashboard.tsx
// so Bushido Book's Insights tab can mount it without importing LLMDashboard shell.
export { AnalyticsWorkspace } from './AnalyticsWorkspace';

// Jutsu components (merged from components/jutsu/ — DAITENGUYAMA M1)
export { JutsuTab } from './JutsuTab';
export { JutsuModelCard } from './JutsuModelCard';
export { ModelDetailView } from './ModelDetailView';
export { aggregateByModel, calculateTrend } from './JutsuAggregation';
export type { AggregatedModel, TestExecution as JutsuTestExecution } from './JutsuAggregation';

// Types
export type { LLMDashboardProps } from './LLMDashboard';
export type { ModelFormProps } from './ModelForm';
export type { ChatBubbleProps } from './ChatBubble';
export type { LocalModelSelectorProps, LocalModelInfo } from './LocalModelSelector';
export type { TestSummaryProps } from './TestSummary';
export type { TestExporterProps, ExportFormat } from './TestExporter';
