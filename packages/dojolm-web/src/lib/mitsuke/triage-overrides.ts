// SPDX-License-Identifier: Apache-2.0
/**
 * File: triage-overrides.ts
 * Purpose: T8.1 / #354 — per-user override store for Mitsuke triage
 *          templates. Mirrors `guard/forge-defense/applied` (ADR-0021)
 *          per-user-scoped JSON-file model.
 *
 * Two record kinds:
 *   - `override`: partial-shape patch for a bundled default. The
 *     bundled template remains immutable; the patch is layered on top
 *     of it for the caller via `applyOverrides`.
 *   - `authored`: full operator-authored template added to the caller's
 *     view of the corpus with a server-synthesized id.
 *
 * DELETE on either kind drops the record from the file. For
 * `override`: the bundled default re-emerges. For `authored`: the
 * template disappears entirely.
 *
 * Closed-shape validation (R-T1) — every field is range-checked /
 * enum-checked / capped before persistence. The store NEVER trusts a
 * caller-supplied id for the authored record; ids are generated via
 * `synthesizeAuthoredId()`.
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { getDataPath } from '@/lib/runtime-paths';
import { isSafeUserIdSegment } from '@/lib/api-session';
import {
  DEFAULT_MITSUKE_TRIAGE_TEMPLATES,
  type MitsukeIndicatorType,
  type MitsukeSeverity,
  type MitsukeTriageStep,
  type MitsukeTriageTemplate,
} from '@/lib/mitsuke/fixtures';

// ---------------------------------------------------------------------------
// Constraints (closed-set discipline)
// ---------------------------------------------------------------------------

const VALID_SEVERITIES: ReadonlySet<MitsukeSeverity> = new Set([
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO',
]);

const VALID_TRIGGER_TYPES: ReadonlySet<MitsukeIndicatorType> = new Set([
  'ip', 'domain', 'hash', 'url', 'email', 'pattern', 'ttp',
]);

export const MAX_STEPS = 8;
export const MAX_TAGS = 8;
export const MAX_TRIGGER_TYPES = 7;
export const STEP_TITLE_MAX = 80;
export const STEP_INSTRUCTION_MAX = 280;
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 400;
export const EXPECTED_OUTCOME_MAX = 400;
export const TAG_MAX = 32;
export const TEMPLATE_ID_MAX = 64;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const AUTHORED_ID_PREFIX = 'auth-';

const OVERRIDES_DIR = path.join(getDataPath('mitsuke', 'triage-templates'));

// ---------------------------------------------------------------------------
// Record shapes
// ---------------------------------------------------------------------------

export interface TriagePatch {
  readonly severity?: MitsukeSeverity;
  readonly steps?: readonly MitsukeTriageStep[];
  readonly expectedOutcome?: string;
  readonly tags?: readonly string[];
}

export interface OverrideRecord {
  readonly kind: 'override';
  readonly templateId: string;
  readonly patch: TriagePatch;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthoredRecord {
  readonly kind: 'authored';
  readonly template: MitsukeTriageTemplate;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type TriageOverrideRecord = OverrideRecord | AuthoredRecord;

export interface AuthoredInput {
  readonly name: string;
  readonly description: string;
  readonly severity: MitsukeSeverity;
  readonly triggerTypes: readonly MitsukeIndicatorType[];
  readonly steps: readonly MitsukeTriageStep[];
  readonly expectedOutcome: string;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function overrideFile(userId: string): string {
  return path.join(OVERRIDES_DIR, `${userId}.json`);
}

export function getOverridesDir(): string {
  return OVERRIDES_DIR;
}

function isOverrideRecord(r: unknown): r is OverrideRecord {
  if (!r || typeof r !== 'object') return false;
  const rec = r as { kind?: unknown; templateId?: unknown; patch?: unknown };
  if (rec.kind !== 'override') return false;
  if (typeof rec.templateId !== 'string') return false;
  if (!rec.patch || typeof rec.patch !== 'object') return false;
  return true;
}

function isAuthoredRecord(r: unknown): r is AuthoredRecord {
  if (!r || typeof r !== 'object') return false;
  const rec = r as { kind?: unknown; template?: unknown };
  if (rec.kind !== 'authored') return false;
  if (!rec.template || typeof rec.template !== 'object') return false;
  return true;
}

export async function loadOverrides(userId: string): Promise<TriageOverrideRecord[]> {
  const file = overrideFile(userId);
  if (!existsSync(file)) return [];
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid: TriageOverrideRecord[] = [];
    for (const item of parsed) {
      if (isOverrideRecord(item)) {
        const patch = sanitizePatch(item.patch);
        if (patch === null) continue;
        if (!ID_PATTERN.test(item.templateId)) continue;
        valid.push({
          kind: 'override',
          templateId: item.templateId,
          patch,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
        });
      } else if (isAuthoredRecord(item)) {
        const tmpl = sanitizeAuthoredTemplate(item.template);
        if (tmpl === null) continue;
        valid.push({
          kind: 'authored',
          template: tmpl,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
        });
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export async function saveOverrides(
  userId: string,
  records: readonly TriageOverrideRecord[],
): Promise<void> {
  if (!existsSync(OVERRIDES_DIR)) {
    await mkdir(OVERRIDES_DIR, { recursive: true });
  }
  await writeFile(overrideFile(userId), JSON.stringify(records, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function capString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

function sanitizeStep(input: unknown): MitsukeTriageStep | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as { order?: unknown; title?: unknown; instruction?: unknown };
  const order = typeof s.order === 'number' && Number.isFinite(s.order) ? Math.trunc(s.order) : null;
  if (order === null || order < 1 || order > MAX_STEPS) return null;
  const title = capString(s.title, STEP_TITLE_MAX);
  if (title === null) return null;
  const instruction = capString(s.instruction, STEP_INSTRUCTION_MAX);
  if (instruction === null) return null;
  return { order, title, instruction };
}

function sanitizeSteps(input: unknown): readonly MitsukeTriageStep[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0) return null;
  if (input.length > MAX_STEPS) return null;
  const out: MitsukeTriageStep[] = [];
  for (const raw of input) {
    const step = sanitizeStep(raw);
    if (step === null) return null;
    out.push(step);
  }
  return out;
}

function sanitizeTags(input: unknown): readonly string[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_TAGS) return null;
  const out: string[] = [];
  for (const raw of input) {
    const tag = capString(raw, TAG_MAX);
    if (tag === null) return null;
    out.push(tag);
  }
  return out;
}

function sanitizeTriggerTypes(input: unknown): readonly MitsukeIndicatorType[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0) return null;
  if (input.length > MAX_TRIGGER_TYPES) return null;
  const out: MitsukeIndicatorType[] = [];
  const seen = new Set<MitsukeIndicatorType>();
  for (const raw of input) {
    if (typeof raw !== 'string') return null;
    if (!VALID_TRIGGER_TYPES.has(raw as MitsukeIndicatorType)) return null;
    if (seen.has(raw as MitsukeIndicatorType)) continue;
    seen.add(raw as MitsukeIndicatorType);
    out.push(raw as MitsukeIndicatorType);
  }
  return out;
}

/**
 * Validates a partial-update body for an override record. Each field is
 * optional but at least ONE must be present so a no-op PATCH does not
 * reach the disk. Returns a clean patch object, or null on any
 * validation failure.
 */
export function sanitizePatch(input: unknown): TriagePatch | null {
  if (!input || typeof input !== 'object') return null;
  const body = input as Record<string, unknown>;
  const patch: { -readonly [K in keyof TriagePatch]: TriagePatch[K] } = {};
  let hasField = false;

  if (Object.prototype.hasOwnProperty.call(body, 'severity')) {
    const sev = body.severity;
    if (typeof sev !== 'string' || !VALID_SEVERITIES.has(sev as MitsukeSeverity)) return null;
    patch.severity = sev as MitsukeSeverity;
    hasField = true;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'steps')) {
    const steps = sanitizeSteps(body.steps);
    if (steps === null) return null;
    patch.steps = steps;
    hasField = true;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'expectedOutcome')) {
    const outcome = capString(body.expectedOutcome, EXPECTED_OUTCOME_MAX);
    if (outcome === null) return null;
    patch.expectedOutcome = outcome;
    hasField = true;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
    const tags = sanitizeTags(body.tags);
    if (tags === null) return null;
    patch.tags = tags;
    hasField = true;
  }

  if (!hasField) return null;
  return patch;
}

/**
 * Validates a new operator-authored template body. Every field except
 * `id` is required; `id` is server-synthesized.
 */
export function sanitizeAuthoredInput(input: unknown): AuthoredInput | null {
  if (!input || typeof input !== 'object') return null;
  const body = input as Record<string, unknown>;

  const name = capString(body.name, NAME_MAX);
  if (name === null) return null;

  const description = capString(body.description, DESCRIPTION_MAX);
  if (description === null) return null;

  const severityRaw = body.severity;
  if (typeof severityRaw !== 'string' || !VALID_SEVERITIES.has(severityRaw as MitsukeSeverity)) return null;

  const triggerTypes = sanitizeTriggerTypes(body.triggerTypes);
  if (triggerTypes === null) return null;

  const steps = sanitizeSteps(body.steps);
  if (steps === null) return null;

  const expectedOutcome = capString(body.expectedOutcome, EXPECTED_OUTCOME_MAX);
  if (expectedOutcome === null) return null;

  const tags = sanitizeTags(body.tags);
  if (tags === null) return null;

  return {
    name,
    description,
    severity: severityRaw as MitsukeSeverity,
    triggerTypes,
    steps,
    expectedOutcome,
    tags,
  };
}

/**
 * Re-validates a template that was loaded from disk. Distinct from
 * `sanitizeAuthoredInput` because this one accepts a present `id`.
 */
function sanitizeAuthoredTemplate(input: unknown): MitsukeTriageTemplate | null {
  if (!input || typeof input !== 'object') return null;
  const body = input as Record<string, unknown>;
  const id = capString(body.id, TEMPLATE_ID_MAX);
  if (id === null || !ID_PATTERN.test(id)) return null;
  const fields = sanitizeAuthoredInput({ ...body });
  if (fields === null) return null;
  return {
    id,
    name: fields.name,
    description: fields.description,
    severity: fields.severity,
    triggerTypes: fields.triggerTypes,
    steps: fields.steps,
    expectedOutcome: fields.expectedOutcome,
    tags: fields.tags,
  };
}

// ---------------------------------------------------------------------------
// Id synthesis
// ---------------------------------------------------------------------------

/**
 * Server-synthesized id for operator-authored templates. Format
 * `auth-<base36 timestamp>-<8 hex>`. Never accepts a caller-supplied
 * value — the pattern excludes characters not in [A-Za-z0-9_-] so the
 * id is always safe for filesystem path concatenation and React keys.
 */
export function synthesizeAuthoredId(now: number = Date.now(), random: () => number = Math.random): string {
  const ts = now.toString(36);
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    const v = Math.floor(random() * 16);
    suffix += v.toString(16);
  }
  return `${AUTHORED_ID_PREFIX}${ts}-${suffix}`;
}

export function isAuthoredId(id: string): boolean {
  return id.startsWith(AUTHORED_ID_PREFIX);
}

// ---------------------------------------------------------------------------
// Apply overlay
// ---------------------------------------------------------------------------

/**
 * Layer the caller's override records on top of the bundled defaults
 * to produce the rendered triage-template list. Bundled defaults are
 * never mutated; an override record produces a NEW template object
 * with the patched fields applied.
 *
 * Order:
 *   1. Bundled defaults (with any matching `override` patch applied)
 *      in the original bundled order.
 *   2. Operator-authored templates appended in createdAt-ascending
 *      order so the list is stable across reloads.
 */
export function applyOverrides(
  defaults: readonly MitsukeTriageTemplate[],
  records: readonly TriageOverrideRecord[],
): readonly MitsukeTriageTemplate[] {
  const overrideById = new Map<string, OverrideRecord>();
  const authored: AuthoredRecord[] = [];
  for (const record of records) {
    if (record.kind === 'override') {
      overrideById.set(record.templateId, record);
    } else {
      authored.push(record);
    }
  }

  const merged: MitsukeTriageTemplate[] = [];
  for (const tmpl of defaults) {
    const override = overrideById.get(tmpl.id);
    if (!override) {
      merged.push(tmpl);
      continue;
    }
    const { patch } = override;
    merged.push({
      id: tmpl.id,
      name: tmpl.name,
      description: tmpl.description,
      severity: patch.severity ?? tmpl.severity,
      triggerTypes: tmpl.triggerTypes,
      steps: patch.steps ?? tmpl.steps,
      expectedOutcome: patch.expectedOutcome ?? tmpl.expectedOutcome,
      tags: patch.tags ?? tmpl.tags,
    });
  }

  authored.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const record of authored) merged.push(record.template);
  return merged;
}

// ---------------------------------------------------------------------------
// IDOR audit helper
// ---------------------------------------------------------------------------

/**
 * Returns true if any OTHER user's override file contains a record
 * matching the supplied templateId. Mirrors the
 * ADR-0049 / Wave 6 IDOR audit pattern in
 * `guard/forge-defense/applied`. Bounded to MAX_PEER_SCAN to keep the
 * worst-case 404 cost under control.
 */
const MAX_PEER_SCAN = 1000;

export async function templateOverriddenByOtherUser(
  callerUserId: string,
  templateId: string,
): Promise<boolean> {
  if (!existsSync(OVERRIDES_DIR)) return false;
  try {
    const entries = await readdir(OVERRIDES_DIR);
    let scanned = 0;
    for (const name of entries) {
      if (!name.endsWith('.json')) continue;
      const peerUserId = name.slice(0, -'.json'.length);
      if (peerUserId === callerUserId) continue;
      // Use the shared `isSafeUserIdSegment` (api-session.ts) so any
      // future hardening of the user-id allowlist (e.g., reserving
      // `api-key-user`) flows through here without manual sync. The
      // local `ID_PATTERN` constant remains the validator for
      // `templateId` and authored-template `id` — those are a distinct
      // closed set.
      if (!isSafeUserIdSegment(peerUserId)) continue;
      scanned += 1;
      if (scanned > MAX_PEER_SCAN) break;
      try {
        const raw = await readFile(path.join(OVERRIDES_DIR, name), 'utf-8');
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const record of parsed) {
          if (record === null || typeof record !== 'object') continue;
          const rec = record as { kind?: unknown; templateId?: unknown; template?: unknown };
          if (rec.kind === 'override' && rec.templateId === templateId) return true;
          if (rec.kind === 'authored' && rec.template && typeof rec.template === 'object') {
            const t = rec.template as { id?: unknown };
            if (t.id === templateId) return true;
          }
        }
      } catch {
        // ignore malformed peer files
      }
    }
  } catch {
    // best-effort
  }
  return false;
}

// ---------------------------------------------------------------------------
// Re-export the bundled defaults so the overlay applier has a single
// import path for tests.
// ---------------------------------------------------------------------------

export { DEFAULT_MITSUKE_TRIAGE_TEMPLATES };
