// SPDX-License-Identifier: Apache-2.0

import {
  REGRESSION_LOG_MAX_ENTRIES,
  cap,
  type DiffLine,
  type FeedTagKind,
  type GoldenDiffStatus,
  type HattoriMode,
  type HattoriModeDef,
  type Severity as FeedSeverity,
} from "@/design";

export type HardeningSeverity = "critical" | "high" | "medium" | "low";
export type DefenseCriticity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface HardeningWeakness {
  readonly id: string;
  readonly severity: HardeningSeverity;
  readonly description: string;
  readonly line?: string;
}

export interface HardeningResponse {
  readonly weaknesses: readonly HardeningWeakness[];
  readonly hardened: string;
}

export interface DefenseTemplateRecord {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly criticity: DefenseCriticity;
}

export interface AppliedRecord {
  readonly templateId: string;
  readonly appliedAt: string;
}

export interface TemplatesResponse {
  readonly templates?: readonly unknown[];
}

export interface AppliedResponse {
  readonly applied?: readonly unknown[];
}

export const HATTORI_MODE_LABEL: Readonly<Record<HattoriMode, string>> =
  Object.freeze({
    shinobi: "Observe · log only",
    samurai: "Shadow · block inbound",
    sensei: "Enforce · block outbound",
    hattori: "Hardened · block both",
  });

export const HATTORI_MODE_DEFS: readonly HattoriModeDef[] = Object.freeze([
  {
    mode: "shinobi",
    title: "Observe",
    summary: "Log only",
    detail: "In + out logged · nothing blocked",
  },
  {
    mode: "samurai",
    title: "Shadow",
    summary: "Block inbound",
    detail: "Injection candidates rejected on the way in",
  },
  {
    mode: "sensei",
    title: "Enforce",
    summary: "Block outbound",
    detail: "Responses gated for PII, leaks, and scope",
  },
  {
    mode: "hattori",
    title: "Hardened",
    summary: "Block both",
    detail: "Full bilateral enforcement, audit-trailed",
  },
]);

export const COVERAGE_COLUMNS: readonly string[] = Object.freeze([
  "Observe · log",
  "Shadow · block in",
  "Enforce · block out",
  "Hardened · both",
]);

export const CATEGORY_DIRECTION: Readonly<
  Record<string, ReadonlySet<HattoriMode>>
> = {
  "system-prompt": new Set<HattoriMode>(["shinobi", "samurai", "hattori"]),
  "input-validation": new Set<HattoriMode>(["shinobi", "samurai", "hattori"]),
  "output-filtering": new Set<HattoriMode>(["shinobi", "sensei", "hattori"]),
  "rate-limiting": new Set<HattoriMode>(["shinobi", "samurai", "hattori"]),
  "context-isolation": new Set<HattoriMode>([
    "shinobi",
    "samurai",
    "sensei",
    "hattori",
  ]),
  "audit-logging": new Set<HattoriMode>([
    "shinobi",
    "samurai",
    "sensei",
    "hattori",
  ]),
  "encoding-defense": new Set<HattoriMode>(["shinobi", "samurai", "hattori"]),
  "boundary-enforcement": new Set<HattoriMode>([
    "shinobi",
    "samurai",
    "sensei",
    "hattori",
  ]),
};

export const SEVERITY_TO_TICKER_SEV: Readonly<
  Record<HardeningSeverity, FeedSeverity>
> = {
  critical: "crit",
  high: "high",
  medium: "med",
  low: "low",
};

export const SEVERITY_TO_FEED_KIND: Readonly<
  Record<HardeningSeverity, FeedTagKind>
> = {
  critical: "block",
  high: "block",
  medium: "warn",
  low: "log",
};

export const SEVERITY_TO_FEED_LABEL: Readonly<
  Record<HardeningSeverity, string>
> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

const WEAKNESS_TO_DIFF_STATUS: Readonly<
  Record<HardeningSeverity, GoldenDiffStatus>
> = {
  critical: "fail",
  high: "fail",
  medium: "drift",
  low: "drift",
};

export const CRITICITY_TO_FEED_SEV: Readonly<
  Record<DefenseCriticity, FeedSeverity>
> = {
  CRITICAL: "crit",
  HIGH: "high",
  MEDIUM: "med",
  LOW: "low",
  INFO: "low",
};

export const CRITICITY_TO_FEED_KIND: Readonly<
  Record<DefenseCriticity, FeedTagKind>
> = {
  CRITICAL: "block",
  HIGH: "block",
  MEDIUM: "warn",
  LOW: "allow",
  INFO: "log",
};

export const CRITICITY_TO_FEED_LABEL: Readonly<
  Record<DefenseCriticity, string>
> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO",
};

export const CRITICITY_TONE_CLASS: Readonly<Record<DefenseCriticity, string>> =
  Object.freeze({
    CRITICAL: "chip red",
    HIGH: "chip red",
    MEDIUM: "chip gold",
    LOW: "chip steel",
    INFO: "chip steel",
  });

export const MAX_TEMPLATES_DISPLAYED = 256;
export const MAX_APPLIED_DISPLAYED = 64;
export const MAX_HATTORI_WEAKNESS_LOG = REGRESSION_LOG_MAX_ENTRIES;
export const MAX_PROMPT_INPUT = 10_000;
export const ID_MAX = 64;
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 240;
export const CATEGORY_MAX = 64;
export const TS_MAX = 32;
const HARDENED_MAX = MAX_PROMPT_INPUT * 2;

function isHardeningSeverity(value: unknown): value is HardeningSeverity {
  return (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}

function isDefenseCriticity(value: unknown): value is DefenseCriticity {
  return (
    value === "CRITICAL" ||
    value === "HIGH" ||
    value === "MEDIUM" ||
    value === "LOW" ||
    value === "INFO"
  );
}

function sanitizeWeakness(raw: unknown): HardeningWeakness | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.description !== "string")
    return null;
  if (!isHardeningSeverity(record.severity)) return null;
  return {
    id: cap(record.id, ID_MAX),
    severity: record.severity,
    description: cap(record.description, DESCRIPTION_MAX),
    line:
      typeof record.line === "string"
        ? cap(record.line, DESCRIPTION_MAX)
        : undefined,
  };
}

export function sanitizeHardeningResponse(
  raw: unknown,
): HardeningResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.hardened !== "string") return null;
  const weaknesses: HardeningWeakness[] = [];
  if (Array.isArray(record.weaknesses)) {
    for (const item of record.weaknesses) {
      const weakness = sanitizeWeakness(item);
      if (weakness) weaknesses.push(weakness);
    }
  }
  return { weaknesses, hardened: record.hardened.slice(0, HARDENED_MAX) };
}

export function sanitizeTemplate(raw: unknown): DefenseTemplateRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string")
    return null;
  if (
    typeof record.description !== "string" ||
    typeof record.category !== "string"
  )
    return null;
  if (!isDefenseCriticity(record.criticity)) return null;
  return {
    id: cap(record.id, ID_MAX),
    name: cap(record.name, NAME_MAX),
    description: cap(record.description, DESCRIPTION_MAX),
    category: cap(record.category, CATEGORY_MAX),
    criticity: record.criticity,
  };
}

export function sanitizeApplied(raw: unknown): AppliedRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (
    typeof record.templateId !== "string" ||
    typeof record.appliedAt !== "string"
  )
    return null;
  return {
    templateId: cap(record.templateId, ID_MAX),
    appliedAt: cap(record.appliedAt, TS_MAX),
  };
}

export function buildHardeningDiff(
  original: string,
  hardened: string,
): readonly DiffLine[] {
  const originalLines = original.split(/\r?\n/);
  const hardenedLines = hardened.split(/\r?\n/);
  const output: DiffLine[] = [];
  const originalSet = new Set(originalLines);
  for (const line of hardenedLines) {
    if (!originalSet.has(line))
      output.push({ kind: "add", text: cap(line, DESCRIPTION_MAX) });
  }
  const hardenedSet = new Set(hardenedLines);
  for (const line of originalLines) {
    if (!hardenedSet.has(line))
      output.push({ kind: "rm", text: cap(line, DESCRIPTION_MAX) });
  }
  return output;
}

export function diffStatusFor(
  weaknesses: readonly HardeningWeakness[],
): GoldenDiffStatus {
  const order: readonly HardeningSeverity[] = [
    "critical",
    "high",
    "medium",
    "low",
  ];
  const top = order.find((severity) =>
    weaknesses.some((item) => item.severity === severity),
  );
  return top ? WEAKNESS_TO_DIFF_STATUS[top] : "match";
}

export function hardeningScoreFor(
  weaknesses: readonly HardeningWeakness[],
): number {
  const score =
    100 -
    weaknesses.reduce((total, item) => {
      if (item.severity === "critical") return total + 30;
      if (item.severity === "high") return total + 18;
      if (item.severity === "medium") return total + 8;
      return total + 3;
    }, 0);
  return Math.max(0, Math.min(100, score));
}

export function buildHashFor(prompt: string): string {
  let hash = 0;
  for (let index = 0; index < prompt.length; index += 1) {
    hash = (hash * 31 + prompt.charCodeAt(index)) | 0;
  }
  return `sha-local:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function humanizeCategory(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
