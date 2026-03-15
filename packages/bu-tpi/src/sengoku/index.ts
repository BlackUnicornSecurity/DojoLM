/**
 * H17: Sengoku — Continuous Red Teaming
 * Barrel export for all Sengoku modules.
 */

// ===========================================================================
// Types
// ===========================================================================

export type {
  Campaign,
  AuthConfig,
  ScheduleConfig,
  CampaignRun,
  SengokuFinding,
  RegressionAlert,
  CampaignState,
  FindingDiff,
  SengokuReport,
} from './types.js';

export {
  MAX_CONCURRENT_CAMPAIGNS,
  MAX_RATE_RPS,
  DEFAULT_RATE_RPS,
  MAX_PAYLOAD_LENGTH,
  VALID_FREQUENCIES,
  VALID_AUTH_TYPES,
} from './types.js';

// ===========================================================================
// Target Connector
// ===========================================================================

export {
  validateTargetUrl,
  healthCheck,
  sendRequest,
  sanitizeCredentials,
} from './target-connector.js';

// ===========================================================================
// Scheduler
// ===========================================================================

export { CampaignScheduler } from './scheduler.js';

// ===========================================================================
// Finding Tracker
// ===========================================================================

export {
  hashFinding,
  deduplicateFindings,
  compareRuns,
  detectRegressions,
} from './finding-tracker.js';

// ===========================================================================
// Reporter
// ===========================================================================

export {
  generateReport,
  formatReportMarkdown,
  formatReportJSON,
} from './reporter.js';
