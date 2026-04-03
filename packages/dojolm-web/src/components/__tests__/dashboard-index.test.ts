/**
 * Tests for dashboard barrel export — verifies all re-exports are accessible.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock all widget/component dependencies to avoid heavy imports
vi.mock('../dashboard/NODADashboard', () => ({ NODADashboard: () => null }));
vi.mock('../dashboard/DashboardConfigContext', () => ({
  DashboardConfigProvider: ({ children }: { children: unknown }) => children,
  useDashboardConfig: () => ({}),
  WIDGET_CATALOG: [],
}));
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: () => null }));
vi.mock('../dashboard/DashboardCustomizer', () => ({ DashboardCustomizer: () => null }));

// Mock all widget imports
const widgetNames = [
  'SystemHealthGauge', 'GuardStatsCard', 'AttackOfTheDay', 'FixtureRoulette',
  'SessionPulse', 'EngineToggleGrid', 'LLMModelsWidget', 'QuickScanWidget',
  'ActivityFeedWidget', 'ThreatTrendWidget', 'ModuleGridWidget', 'PlatformStatsWidget',
  'CoverageHeatmapWidget', 'GuardAuditWidget', 'KillCount', 'QuickLaunchPad',
  'LLMBatchProgress', 'ThreatRadar', 'ComplianceBarsWidget', 'QuickLLMTestWidget',
  'SAGEStatusWidget', 'ArenaLeaderboardWidget', 'MitsukeAlertWidget', 'GuardQuickPanel',
  'EcosystemPulseWidget', 'RoninHubWidget', 'LLMJutsuWidget',
];
for (const name of widgetNames) {
  vi.mock(`../dashboard/widgets/${name}`, () => ({ [name]: () => null }));
}

import * as barrel from '../dashboard/index';

describe('dashboard barrel export', () => {
  it('exports NODADashboard', () => {
    expect(barrel.NODADashboard).toBeDefined();
  });

  it('exports DashboardConfigProvider and hook', () => {
    expect(barrel.DashboardConfigProvider).toBeDefined();
    expect(barrel.useDashboardConfig).toBeDefined();
    expect(barrel.WIDGET_CATALOG).toBeDefined();
  });

  it('exports WidgetCard and DashboardCustomizer', () => {
    expect(barrel.WidgetCard).toBeDefined();
    expect(barrel.DashboardCustomizer).toBeDefined();
  });

  it('exports all 27 widget components', () => {
    for (const name of widgetNames) {
      expect((barrel as Record<string, unknown>)[name]).toBeDefined();
    }
  });
});
