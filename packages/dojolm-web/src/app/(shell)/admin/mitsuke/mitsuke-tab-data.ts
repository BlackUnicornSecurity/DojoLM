// SPDX-License-Identifier: Apache-2.0
/** Bounded record contracts and sanitizers for the Mitsuke tabs. */

import { cap } from "@/design/primitives/_caps";
import type { AivssScore } from "bu-tpi/aivss";

export type MitsukeSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type IndicatorType =
  | "ip"
  | "domain"
  | "hash"
  | "url"
  | "email"
  | "pattern"
  | "ttp";
export type SourceType = "rss" | "api" | "webhook";
export type SourceStatus = "active" | "paused" | "error";
export type MitsukeTabId = "entries" | "sources" | "indicators" | "triage";

export const SEVERITIES: readonly MitsukeSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

export const SEVERITY_LABEL: Record<MitsukeSeverity, string> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO",
};

// §1.4 severity-word tiers (SKIN-SPEC): crit --torii-text · high --ember ·
// med --gold · low --steel · info neutral. Entry rows render these instead
// of chip tones — chip.red on HIGH was the audited legacy violation.
export const SEVERITY_SEVW: Record<MitsukeSeverity, string> = {
  CRITICAL: "crit",
  HIGH: "high",
  MEDIUM: "med",
  LOW: "low",
  INFO: "info",
};

export const INDICATOR_TYPES: readonly IndicatorType[] = [
  "ip",
  "domain",
  "hash",
  "url",
  "email",
  "pattern",
  "ttp",
];

export const INDICATOR_TYPE_LABEL: Record<IndicatorType, string> = {
  ip: "IP",
  domain: "Domain",
  hash: "Hash",
  url: "URL",
  email: "Email",
  pattern: "Pattern",
  ttp: "TTP",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  rss: "RSS",
  api: "API",
  webhook: "Webhook",
};

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  active: "Active",
  paused: "Paused",
  error: "Error",
};

export const SOURCE_STATUS_TONE: Record<SourceStatus, "jade" | "gold" | "red"> =
  {
    active: "jade",
    paused: "gold",
    error: "red",
  };

export interface ThreatEntry {
  readonly id: string;
  readonly source: string;
  readonly threatType: string;
  readonly title: string;
  readonly severity: MitsukeSeverity;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly indicators: readonly string[];
}

export interface ThreatIndicator {
  readonly id: string;
  readonly type: IndicatorType;
  readonly value: string;
  readonly severity: MitsukeSeverity;
  readonly source: string;
  readonly confidence: number;
  /**
   * Optional AIVSS score per ADR-0097 §7. Server may emit later
   * (TICKET-G3-API); for now the client derives via
   * `findingToAivssMetrics` + `calculate` at row-render time.
   * If absent and derivation also fails, the row falls back to
   * band 'none'.
   */
  readonly aivss?: AivssScore;
}

export interface ThreatSource {
  readonly id: string;
  readonly name: string;
  readonly type: SourceType;
  readonly enabled: boolean;
  readonly refreshIntervalMinutes: number;
  readonly lastFetched: string | null;
}

export interface TriageStep {
  readonly title: string;
  readonly instruction: string;
}

export interface TriageTemplate {
  readonly id: string;
  readonly name: string;
  readonly severity: MitsukeSeverity;
  readonly triggerTypes: readonly IndicatorType[];
  readonly description: string;
  readonly steps: readonly TriageStep[];
  readonly expectedOutcome: string;
  readonly tags: readonly string[];
}

export const MAX_INDICATORS_PER_ENTRY = 8;
export const MAX_SOURCE_CHIPS = 8;
const ID_MAX = 64;
const NAME_MAX = 120;
const TITLE_MAX = 200;
const SOURCE_MAX = 64;
const VALUE_MAX = 240;
const TS_MAX = 32;

export function isMitsukeSeverity(v: unknown): v is MitsukeSeverity {
  return SEVERITIES.includes(v as MitsukeSeverity);
}

export function isIndicatorType(v: unknown): v is IndicatorType {
  return INDICATOR_TYPES.includes(v as IndicatorType);
}

function isSourceType(v: unknown): v is SourceType {
  return v === "rss" || v === "api" || v === "webhook";
}

function safeNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function sanitizeEntry(raw: unknown): ThreatEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.source !== "string") return null;
  if (typeof r.threatType !== "string") return null;
  if (typeof r.title !== "string") return null;
  if (!isMitsukeSeverity(r.severity)) return null;
  if (typeof r.firstSeen !== "string") return null;
  if (typeof r.lastSeen !== "string") return null;
  let indicators: readonly string[] = [];
  if (Array.isArray(r.indicators)) {
    indicators = r.indicators
      .filter((s): s is string => typeof s === "string")
      .slice(0, MAX_INDICATORS_PER_ENTRY)
      .map((s) => cap(s, VALUE_MAX));
  }
  return {
    id: cap(r.id, ID_MAX),
    source: cap(r.source, SOURCE_MAX),
    threatType: cap(r.threatType, NAME_MAX),
    title: cap(r.title, TITLE_MAX),
    severity: r.severity,
    firstSeen: cap(r.firstSeen, TS_MAX),
    lastSeen: cap(r.lastSeen, TS_MAX),
    indicators,
  };
}

export function sanitizeIndicator(raw: unknown): ThreatIndicator | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (!isIndicatorType(r.type)) return null;
  if (typeof r.value !== "string") return null;
  if (!isMitsukeSeverity(r.severity)) return null;
  if (typeof r.source !== "string") return null;
  return {
    id: cap(r.id, ID_MAX),
    type: r.type,
    value: cap(r.value, VALUE_MAX),
    severity: r.severity,
    source: cap(r.source, SOURCE_MAX),
    confidence: Math.max(0, Math.min(100, safeNum(r.confidence))),
  };
}

export function sanitizeSource(raw: unknown): ThreatSource | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.name !== "string") return null;
  if (!isSourceType(r.type)) return null;
  return {
    id: cap(r.id, ID_MAX),
    name: cap(r.name, NAME_MAX),
    type: r.type,
    enabled: r.enabled === true,
    refreshIntervalMinutes: Math.max(
      0,
      Math.min(1440, Math.floor(safeNum(r.refreshIntervalMinutes))),
    ),
    lastFetched:
      typeof r.lastFetched === "string" ? cap(r.lastFetched, TS_MAX) : null,
  };
}

const STEP_TITLE_MAX = 80;
const STEP_INSTRUCTION_MAX = 280;
const EXPECTED_OUTCOME_MAX = 400;
const TAG_MAX = 32;
const MAX_STEPS_PER_TEMPLATE = 8;
const MAX_TAGS_PER_TEMPLATE = 8;

function sanitizeStepEntry(raw: unknown): TriageStep | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as { title?: unknown; instruction?: unknown };
  if (typeof s.title !== "string" || typeof s.instruction !== "string")
    return null;
  if (s.title.trim().length === 0 || s.instruction.trim().length === 0)
    return null;
  return {
    title: cap(s.title, STEP_TITLE_MAX),
    instruction: cap(s.instruction, STEP_INSTRUCTION_MAX),
  };
}

export function sanitizeTriageTemplate(raw: unknown): TriageTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.name !== "string") return null;
  if (!isMitsukeSeverity(r.severity)) return null;
  let triggerTypes: readonly IndicatorType[] = [];
  if (Array.isArray(r.triggerTypes)) {
    triggerTypes = r.triggerTypes
      .filter(isIndicatorType)
      .slice(0, INDICATOR_TYPES.length);
  }
  const description =
    typeof r.description === "string" ? cap(r.description, TITLE_MAX) : "";
  let steps: readonly TriageStep[] = [];
  if (Array.isArray(r.steps)) {
    const safe: TriageStep[] = [];
    for (const s of r.steps) {
      const step = sanitizeStepEntry(s);
      if (step) safe.push(step);
      if (safe.length >= MAX_STEPS_PER_TEMPLATE) break;
    }
    steps = safe;
  }
  const expectedOutcome =
    typeof r.expectedOutcome === "string"
      ? cap(r.expectedOutcome, EXPECTED_OUTCOME_MAX)
      : "";
  let tags: readonly string[] = [];
  if (Array.isArray(r.tags)) {
    tags = r.tags
      .filter((t): t is string => typeof t === "string")
      .slice(0, MAX_TAGS_PER_TEMPLATE)
      .map((t) => cap(t, TAG_MAX));
  }
  return {
    id: cap(r.id, ID_MAX),
    name: cap(r.name, NAME_MAX),
    severity: r.severity,
    triggerTypes,
    description,
    steps,
    expectedOutcome,
    tags,
  };
}

/**
 * Closed-map source-status derivation. `enabled=false` → 'paused'.
 * `enabled=true` AND `lastFetched=null` → 'error' so any source that
 * hasn't pulled at least once is highlighted.
 */
export function deriveSourceStatus(source: ThreatSource): SourceStatus {
  if (!source.enabled) return "paused";
  if (!source.lastFetched) return "error";
  return "active";
}
