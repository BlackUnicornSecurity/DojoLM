/**
 * S62: THREATFEED Auto-Fixture Import + Alert System
 * Auto-converts threat entries to branded fixtures with quarantine.
 * Per SME CRIT-06: quarantine + human approval + PII gate.
 */

import { randomUUID } from 'crypto';
import type { ThreatEntry } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

// --- Auto-Fixture Types ---

export type FixtureStatus = 'quarantined' | 'approved' | 'rejected' | 'promoted';

export interface GeneratedFixture {
  readonly id: string;
  readonly threatEntryId: string;
  readonly category: string;
  readonly brand: string;
  readonly content: string;
  readonly filename: string;
  readonly clean: boolean;
  readonly status: FixtureStatus;
  readonly createdAt: string;
  readonly approvedAt: string | null;
  readonly rejectedReason: string | null;
}

export interface AlertConfig {
  readonly severityThreshold: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly deduplicationWindowMs: number;
  readonly dailyCap: number;
  readonly enabled: boolean;
}

export interface Alert {
  readonly id: string;
  readonly threatEntryId: string;
  readonly severity: string;
  readonly title: string;
  readonly message: string;
  readonly createdAt: string;
  readonly acknowledged: boolean;
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  severityThreshold: 'WARNING',
  deduplicationWindowMs: 3600_000,
  dailyCap: 50,
  enabled: true,
};

// --- Category-to-brand mapping ---
const CATEGORY_BRANDS: Record<string, string> = {
  'prompt-injection': 'dojolm',
  'agent': 'marfaak',
  'mcp': 'dojolm',
  'dos': 'basileak',
  'supply-chain': 'bonklm',
  'model-theft': 'basileak',
  'bias': 'pantheonlm',
  'web': 'dojolm',
  'output': 'marfaak',
  'social': 'bonklm',
  'multimodal': 'blackunicorn',
  'encoded': 'dojolm',
  'vec': 'pantheonlm',
  'session': 'marfaak',
  'environmental': 'blackunicorn',
  'document-attacks': 'basileak',
  'token-attacks': 'dojolm',
};

// --- Fixture generation stores ---

const fixtureStore = new Map<string, GeneratedFixture>();
const MAX_FIXTURE_STORE_SIZE = 10_000;
const alertStore: Alert[] = [];
const MAX_ALERT_STORE_SIZE = 1_000;
let todayAlertCount = 0;
let lastAlertDate = '';

/**
 * Auto-generate a fixture from a threat entry.
 * Per SME CRIT-06: always starts in quarantine.
 */
export function generateFixtureFromThreat(entry: ThreatEntry): GeneratedFixture {
  if (entry.rawContent.length > MAX_INPUT_LENGTH) {
    throw new Error('Threat content exceeds maximum length');
  }
  if (fixtureStore.size >= MAX_FIXTURE_STORE_SIZE) {
    throw new Error('Fixture store capacity exceeded');
  }

  const category = entry.classifiedType ?? 'prompt-injection';
  const brand = CATEGORY_BRANDS[category] ?? 'blackunicorn';

  // Generate filename
  const sanitizedTitle = entry.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const filename = `threatfeed-${sanitizedTitle}-${entry.id.slice(0, 8)}.txt`;

  const fixture: GeneratedFixture = {
    id: randomUUID(),
    threatEntryId: entry.id,
    category,
    brand,
    content: entry.rawContent,
    filename,
    clean: false,
    status: 'quarantined', // Always quarantine per SME CRIT-06
    createdAt: new Date().toISOString(),
    approvedAt: null,
    rejectedReason: null,
  };

  fixtureStore.set(fixture.id, fixture);
  return fixture;
}

/**
 * Approve a quarantined fixture for promotion.
 */
export function approveFixture(fixtureId: string): GeneratedFixture | null {
  const fixture = fixtureStore.get(fixtureId);
  if (!fixture || fixture.status !== 'quarantined') return null;

  const updated: GeneratedFixture = {
    ...fixture,
    status: 'approved',
    approvedAt: new Date().toISOString(),
  };

  fixtureStore.set(fixtureId, updated);
  return updated;
}

/**
 * Reject a quarantined fixture.
 */
export function rejectFixture(fixtureId: string, reason: string): GeneratedFixture | null {
  const fixture = fixtureStore.get(fixtureId);
  if (!fixture || fixture.status !== 'quarantined') return null;

  const updated: GeneratedFixture = {
    ...fixture,
    status: 'rejected',
    rejectedReason: reason,
  };

  fixtureStore.set(fixtureId, updated);
  return updated;
}

/**
 * Promote an approved fixture (mark as ready for integration).
 */
export function promoteFixture(fixtureId: string): GeneratedFixture | null {
  const fixture = fixtureStore.get(fixtureId);
  if (!fixture || fixture.status !== 'approved') return null;

  const updated: GeneratedFixture = {
    ...fixture,
    status: 'promoted',
  };

  fixtureStore.set(fixtureId, updated);
  return updated;
}

/**
 * Get fixtures by status.
 */
export function getFixturesByStatus(status: FixtureStatus): GeneratedFixture[] {
  return Array.from(fixtureStore.values())
    .filter((f) => f.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all generated fixtures.
 */
export function getAllGeneratedFixtures(): GeneratedFixture[] {
  return Array.from(fixtureStore.values());
}

// --- Alert System ---

const SEVERITY_RANK: Record<string, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

/**
 * Create an alert for a high-severity threat.
 * Per SME S62 amendments: dedup window 1hr, daily cap 50.
 */
export function createAlert(
  entry: ThreatEntry,
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Alert | null {
  if (!config.enabled) return null;

  const entrySeverity = entry.severity ?? 'INFO';
  const thresholdRank = SEVERITY_RANK[config.severityThreshold] ?? 0;
  const entryRank = SEVERITY_RANK[entrySeverity] ?? 0;

  if (entryRank < thresholdRank) return null;

  // Daily cap check
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastAlertDate) {
    todayAlertCount = 0;
    lastAlertDate = today;
  }
  if (todayAlertCount >= config.dailyCap) return null;

  // Dedup check
  const now = Date.now();
  const recent = alertStore.filter(
    (a) => now - new Date(a.createdAt).getTime() < config.deduplicationWindowMs
  );
  const isDuplicate = recent.some(
    (a) => a.threatEntryId === entry.id || a.title === entry.title
  );
  if (isDuplicate) return null;

  const alert: Alert = {
    id: randomUUID(),
    threatEntryId: entry.id,
    severity: entrySeverity,
    title: `New ${entrySeverity} threat: ${entry.title.slice(0, 100)}`,
    message: entry.description.slice(0, 500),
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };

  alertStore.push(alert);
  todayAlertCount++;
  return alert;
}

/**
 * Get recent alerts.
 */
export function getAlerts(filter?: {
  severity?: string;
  acknowledged?: boolean;
  limit?: number;
}): Alert[] {
  let alerts = [...alertStore];

  if (filter?.severity) {
    alerts = alerts.filter((a) => a.severity === filter.severity);
  }
  if (filter?.acknowledged !== undefined) {
    alerts = alerts.filter((a) => a.acknowledged === filter.acknowledged);
  }

  alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filter?.limit) {
    alerts = alerts.slice(0, filter.limit);
  }

  return alerts;
}

/**
 * Acknowledge an alert.
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = alertStore.find((a) => a.id === alertId);
  if (!alert) return false;
  (alert as { acknowledged: boolean }).acknowledged = true;
  return true;
}

/**
 * Clear all stores (for testing).
 */
export function clearAutoFixtureStores(): void {
  fixtureStore.clear();
  alertStore.length = 0;
  todayAlertCount = 0;
}
