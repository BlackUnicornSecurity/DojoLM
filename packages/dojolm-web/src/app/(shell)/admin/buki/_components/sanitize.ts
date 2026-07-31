// SPDX-License-Identifier: Apache-2.0
/**
 * Wire-shape sanitizers + criticity ribbon helper extracted from
 * BukiClient.tsx for the PR-2 split. Pure / no React. The functions
 * here form the trust boundary between the `/api/buki/sage/*` JSON
 * payloads and the typed `SeedRecord` / `MutationOperatorRecord` /
 * `QuarantineRecord` / `AivssScore` shapes consumed by the render
 * panels — every fetched array is mapped through one of these before
 * being assigned to state.
 *
 * Returns `null` for any malformed row so the caller can drop it from
 * the collection rather than crashing the whole list. Conservative
 * narrowing: required string fields fail the row outright; optional
 * numeric fields default to 0 on shape mismatch.
 */

import type { AivssScore } from 'bu-tpi/aivss';
import type { RibbonSegment } from '@/design/primitives/Ribbon';
import type {
  MutationOperatorRecord,
  QuarantineRecord,
  QuarantineStatus,
  SageCriticity,
  SeedRecord,
} from './types';

export function isCriticity(value: unknown): value is SageCriticity {
  return value === 'CRITICAL'
    || value === 'HIGH'
    || value === 'MEDIUM'
    || value === 'LOW'
    || value === 'INFO';
}

export function isQuarantineStatus(value: unknown): value is QuarantineStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}

/**
 * Wire-shape validator for `AivssScore`. Without this, `SeedRecord.aivss`
 * would be unreachable and the BukiSeedRow's `s.aivss ?? null` guard
 * would always fall through to client-side derivation — making the
 * optional field dead code that would silently stay broken when the
 * server emits a malformed value. Returns null on any shape mismatch
 * so consumers fall back to the client-side derivation.
 */
export function isAivssSeverity(value: unknown): value is AivssScore['severity'] {
  return (
    value === 'critical'
    || value === 'high'
    || value === 'medium'
    || value === 'low'
    || value === 'none'
  );
}

export function sanitizeAivss(raw: unknown): AivssScore | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.base !== 'number' || !Number.isFinite(r.base)) return null;
  if (!isAivssSeverity(r.severity)) return null;
  if (typeof r.vector !== 'string') return null;
  const temporal = typeof r.temporal === 'number' && Number.isFinite(r.temporal) ? r.temporal : null;
  const environmental = typeof r.environmental === 'number' && Number.isFinite(r.environmental) ? r.environmental : null;
  return {
    base: r.base,
    temporal,
    environmental,
    severity: r.severity,
    vector: r.vector,
  };
}

export function sanitizeSeed(raw: unknown): SeedRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  if (typeof r.category !== 'string') return null;
  if (typeof r.description !== 'string') return null;
  if (!isCriticity(r.criticity)) return null;
  const fitness = typeof r.fitness === 'number' && Number.isFinite(r.fitness) ? r.fitness : 0;
  const usageCount = typeof r.usageCount === 'number' && Number.isFinite(r.usageCount) ? r.usageCount : 0;
  const successRate = typeof r.successRate === 'number' && Number.isFinite(r.successRate) ? r.successRate : 0;
  const generation = typeof r.generation === 'number' && Number.isFinite(r.generation) ? r.generation : 0;
  // Forward `aivss` from wire when present. Server-side AIVSS lands
  // here via TICKET-G3-API-BUKI (PR #843 squash sha `1f5d0ec84f`)
  // and is the canonical source after PR-3 of the Buki Phase 2 wave
  // removed the BukiSeedRow client-side derivation fallback. When the
  // server omits the field (older stored seeds) or returns null
  // (criticity outside the closed enum), BukiSeedRow renders a
  // `band='none'` chip as the explicit "no signal" slot.
  const aivss = sanitizeAivss(r.aivss);
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    fitness,
    usageCount,
    successRate,
    generation,
    criticity: r.criticity,
    ...(aivss !== null ? { aivss } : {}),
  };
}

export function sanitizeMutation(raw: unknown): MutationOperatorRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  if (typeof r.category !== 'string') return null;
  const description = typeof r.description === 'string' ? r.description : '';
  const weight = typeof r.weight === 'number' && Number.isFinite(r.weight) ? r.weight : 0;
  return { id: r.id, name: r.name, category: r.category, description, weight };
}

export function sanitizeQuarantine(raw: unknown): QuarantineRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  if (typeof r.seedName !== 'string') return null;
  const reason = typeof r.reason === 'string' ? r.reason : '';
  if (!isQuarantineStatus(r.status)) return null;
  const criticity = isCriticity(r.criticity) ? r.criticity : undefined;
  const submittedAt = typeof r.submittedAt === 'string' ? r.submittedAt : undefined;
  return {
    id: r.id,
    seedName: r.seedName,
    reason,
    status: r.status,
    criticity,
    submittedAt,
  };
}

export function buildCriticityRibbon(seeds: readonly SeedRecord[]): readonly RibbonSegment[] {
  let crit = 0;
  let warn = 0;
  let pass = 0;
  for (const s of seeds) {
    if (s.criticity === 'CRITICAL') crit += 1;
    else if (s.criticity === 'HIGH' || s.criticity === 'MEDIUM') warn += 1;
    else pass += 1;
  }
  return [
    { k: 'fail', v: crit },
    { k: 'warn', v: warn },
    { k: 'pass', v: pass },
  ];
}
