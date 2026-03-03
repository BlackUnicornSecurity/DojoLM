/**
 * S61: THREATFEED - Live Threat Intelligence Feed
 * Barrel export for all THREATFEED modules.
 */

// Types
export type {
  SourceType,
  IndicatorType,
  ThreatSource,
  ThreatEntry,
  ThreatIndicator,
  ThreatClassification,
  SourceConfig,
  FeedStats,
  URLAllowlist,
  ContentSanitizationResult,
  ThreatPipeline,
} from './types.js';

export {
  DEFAULT_SOURCE_CONFIG,
  DEFAULT_URL_ALLOWLIST,
} from './types.js';

// URL Validator
export {
  isInternalIP,
  validateSourceURL,
} from './url-validator.js';

// Content Sanitizer
export {
  stripXMLEntities,
  stripScriptTags,
  stripControlCharacters,
  normalizeWhitespace,
  sanitizeContent,
} from './content-sanitizer.js';

// Classifier
export {
  classifyThreat,
  extractIndicators,
  assessConfidence,
  assessSeverity,
} from './classifier.js';

// Deduplicator
export type { ThreatDeduplicator } from './deduplicator.js';
export {
  createDeduplicator,
  isDuplicate,
  addEntry as addDeduplicatorEntry,
  getDeduplicatorStats,
  clearDeduplicator,
} from './deduplicator.js';

// Source Pipeline
export {
  createPipeline,
  addSource,
  removeSource,
  parseRSS,
  parseAPI,
  validateWebhook,
  processItems,
  ingestEntries,
  getPipelineStats,
  getEntries,
} from './source-pipeline.js';

// Auto-Fixture Import + Alerts (S62)
export type {
  FixtureStatus,
  GeneratedFixture,
  AlertConfig,
  Alert,
} from './auto-fixture.js';

export {
  DEFAULT_ALERT_CONFIG,
  generateFixtureFromThreat,
  approveFixture,
  rejectFixture,
  promoteFixture,
  getFixturesByStatus,
  getAllGeneratedFixtures,
  createAlert,
  getAlerts,
  acknowledgeAlert,
  clearAutoFixtureStores,
} from './auto-fixture.js';
