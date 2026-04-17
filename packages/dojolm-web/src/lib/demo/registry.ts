/**
 * File: src/lib/demo/registry.ts
 * Purpose: Authoritative list of API routes that branch on `isDemoMode()`.
 *
 * Every entry pairs a route path with the demo handler(s) it invokes when
 * `isDemoMode()` returns true. The companion test (registry.test.ts) walks
 * src/app/api/** and fails the build if a route gains or loses an
 * `isDemoMode()` call without a matching registry update. This prevents drift
 * between demo-mode coverage and the real app surface.
 *
 * Governance contract:
 *   - Every `isDemoMode()` branch in src/app/api/** MUST be listed here.
 *   - Every handler referenced here MUST be exported from mock-api-handlers.ts
 *     or declared in the `inline` list for routes that inline their demo path.
 *   - New demo handlers added to mock-api-handlers.ts without a registry entry
 *     are unreachable from production routes and will flag in the test.
 */
export interface DemoRouteEntry {
  /** Route path relative to /api (e.g. '/stats', '/llm/models/[id]'). */
  route: string;
  /**
   * Demo handler function names imported from './mock-api-handlers'. Empty
   * array when the route inlines its demo response (see `inline`).
   */
  handlers: ReadonlyArray<string>;
  /**
   * True when the route implements its demo branch inline (no named handler
   * from mock-api-handlers.ts). Used for routes that return minimal static
   * JSON without crossing the handler boundary.
   */
  inline?: boolean;
}

/**
 * Exhaustive demo-mode route registry. Keep sorted by route path to make
 * diffs reviewable. When adding a new route that reads `isDemoMode()`, add
 * the entry here in the same PR.
 */
export const DEMO_ROUTE_REGISTRY: ReadonlyArray<DemoRouteEntry> = [
  { route: '/admin/health', handlers: [], inline: true },
  { route: '/admin/settings', handlers: [], inline: true },
  { route: '/arena', handlers: ['demoArenaGet', 'demoArenaPost'] },
  { route: '/arena/[id]', handlers: ['demoArenaMatchById'] },
  { route: '/arena/warriors', handlers: ['demoArenaWarriorsGet'] },
  { route: '/attackdna/analyze', handlers: ['demoNoOp'] },
  { route: '/attackdna/ingest', handlers: ['demoNoOp'] },
  { route: '/attackdna/query', handlers: ['demoAttackDnaQueryGet'] },
  { route: '/attackdna/sync', handlers: ['demoNoOp'] },
  { route: '/auth/login', handlers: [], inline: true },
  { route: '/auth/logout', handlers: [], inline: true },
  { route: '/auth/me', handlers: [], inline: true },
  { route: '/auth/users', handlers: ['demoUsersGet', 'demoNoOpCreated'] },
  { route: '/compliance', handlers: [], inline: true },
  { route: '/compliance/export', handlers: [], inline: true },
  { route: '/compliance/frameworks', handlers: [], inline: true },
  { route: '/ecosystem/findings', handlers: ['demoEcosystemGet'] },
  { route: '/fixtures', handlers: ['demoFixturesGet'] },
  { route: '/health', handlers: ['demoHealthGet'] },
  { route: '/llm/batch', handlers: [], inline: true },
  { route: '/llm/batch/[id]', handlers: [], inline: true },
  { route: '/llm/batch/[id]/executions', handlers: [], inline: true },
  { route: '/llm/batch/cleanup', handlers: [], inline: true },
  { route: '/llm/coverage', handlers: ['demoCoverageGet'] },
  { route: '/llm/fingerprint', handlers: ['demoFingerprintGet', 'demoNoOpAccepted'] },
  { route: '/llm/guard', handlers: [], inline: true },
  { route: '/llm/guard/audit', handlers: [], inline: true },
  { route: '/llm/guard/stats', handlers: [], inline: true },
  { route: '/llm/leaderboard', handlers: ['demoLeaderboardGet'] },
  { route: '/llm/local-models', handlers: [], inline: true },
  { route: '/llm/models', handlers: ['demoModelsGet', 'demoModelsPost'] },
  { route: '/llm/models/[id]', handlers: ['demoModelById', 'demoNoOp'] },
  { route: '/llm/obl/alignment', handlers: [], inline: true },
  { route: '/llm/obl/depth', handlers: [], inline: true },
  { route: '/llm/obl/geometry', handlers: [], inline: true },
  { route: '/llm/obl/robustness', handlers: [], inline: true },
  { route: '/llm/providers', handlers: ['demoProvidersGet', 'demoProvidersPost'] },
  { route: '/llm/reports', handlers: ['demoReportsGet'] },
  { route: '/llm/results', handlers: [], inline: true },
  { route: '/llm/test-cases', handlers: [], inline: true },
  { route: '/mcp/status', handlers: [], inline: true },
  { route: '/ronin/programs', handlers: ['demoRoninProgramsGet'] },
  { route: '/ronin/submissions', handlers: ['demoRoninSubmissionsGet'] },
  { route: '/scan', handlers: [], inline: true },
  { route: '/sengoku/campaigns', handlers: [], inline: true },
  { route: '/sengoku/campaigns/[id]', handlers: [], inline: true },
  { route: '/sengoku/campaigns/[id]/run', handlers: ['demoNoOpAccepted'] },
  { route: '/sengoku/campaigns/[id]/runs', handlers: ['demoCampaignRunsGet'] },
  { route: '/setup/admin', handlers: [], inline: true },
  { route: '/setup/status', handlers: [], inline: true },
  { route: '/shingan/formats', handlers: ['demoShinganFormatsGet'] },
  { route: '/shingan/scan', handlers: ['demoShinganScansGet'] },
  { route: '/stats', handlers: ['demoStatsGet'] },
  { route: '/tests', handlers: [], inline: true },
];

/** Number of API routes gated by `isDemoMode()`. */
export const DEMO_ROUTE_COUNT: number = DEMO_ROUTE_REGISTRY.length;

/** All handler names referenced by the registry, deduplicated. */
export const DEMO_REGISTERED_HANDLERS: ReadonlyArray<string> = Array.from(
  new Set(DEMO_ROUTE_REGISTRY.flatMap((entry) => entry.handlers)),
).sort();

/** Lookup by route path. Returns undefined if route is not in registry. */
export function getDemoRouteEntry(route: string): DemoRouteEntry | undefined {
  return DEMO_ROUTE_REGISTRY.find((entry) => entry.route === route);
}
