// SPDX-License-Identifier: Apache-2.0
/**
 * File: technique-catalog.ts
 * Purpose: Gap 13.5 named-technique catalog — append-only registry.
 * Story: Industry-tools parity plan §Gap 13.5 (lines 949–983).
 *
 * v1 scope cut: registry primitives only (descriptors + append-only
 * log + bypass-rate aggregation). UI (`/lab/catalog/page.tsx`) and
 * scanner-coverage cross-references (`technique-coverage.ts`) are
 * deferred.
 *
 * Shape of each entry:
 *   (dialect, primitive, refusalClass, modelId, observedBypassRate)
 *
 * The registry is **append-only + frozen**: returned entries are
 * `Object.freeze`d, and the list is returned as a read-only snapshot
 * copy. Registering an entry does not mutate prior entries.
 *
 * Audit lessons applied:
 * - #176 filename-safe technique ids.
 * - #178 root containment — reject any id with path separators.
 * - #181 Object.hasOwn semantics via Map.
 * - #182+#184 bidi strip on every user-supplied id before storage.
 * - #184 M-4 frozen audit entries.
 */

import { stripBidiOverrides } from '../bushido/safety.js';
import type { RefusalClass } from '../arena/race-types.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

/**
 * Post-#188 M-3: denylist for ids that match `ID_PATTERN` but collide with
 * object-prototype names. Mirrors the race-runner.ts guard added in #187
 * L-1 — defense-in-depth so an id that escapes into a plain-object lookup
 * cannot hit the prototype chain.
 */
const RESERVED_PROTO_IDS = new Set(['constructor', 'prototype', '__proto__']);

function ensureSafeId(raw: string, kind: string): string {
  if (typeof raw !== 'string') throw new TypeError(`${kind} must be a string`);
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > 128) {
    throw new RangeError(`${kind} length must be 1..128`);
  }
  if (!ID_PATTERN.test(stripped)) {
    throw new Error(`${kind} "${stripped}" is not filename-safe`);
  }
  if (RESERVED_PROTO_IDS.has(stripped)) {
    throw new Error(`${kind} "${stripped}" is a reserved prototype name`);
  }
  return stripped;
}

export interface TechniqueEntry {
  /** Deterministic composite id: `${dialect}:${primitive}`. */
  readonly id: string;
  /** Kotoba dialect name, e.g. 'asciiGlyph'. */
  readonly dialect: string;
  /** Primitive name, e.g. 'encoding-engine.rot13'. */
  readonly primitive: string;
  /** Refusal class most commonly observed for this (dialect, primitive). */
  readonly refusalClass: RefusalClass;
  /** Target model id. */
  readonly modelId: string;
  /** Observed bypass rate in [0, 1] (compliant+partial / total). */
  readonly observedBypassRate: number;
  /** Sample size backing the bypass rate. */
  readonly n: number;
  /** Registration timestamp (ISO-8601). */
  readonly registeredAt: string;
}

export interface TechniqueFilter {
  readonly dialect?: string;
  readonly primitive?: string;
  readonly modelId?: string;
  readonly refusalClass?: RefusalClass;
}

/**
 * Append-only technique catalog.
 *
 * Design: entries are keyed by (dialect, primitive, modelId) —
 * re-registering the same triple is rejected. Rebuilds require
 * `reset()` (test-only).
 */
export class TechniqueCatalog {
  private readonly entries = new Map<string, TechniqueEntry>();
  private readonly appendLog: TechniqueEntry[] = [];

  private keyOf(dialect: string, primitive: string, modelId: string): string {
    return `${dialect}\u0000${primitive}\u0000${modelId}`;
  }

  /** Register a new technique descriptor. Rejects duplicates. */
  register(input: {
    readonly dialect: string;
    readonly primitive: string;
    readonly modelId: string;
    readonly refusalClass: RefusalClass;
    readonly observedBypassRate: number;
    readonly n: number;
    readonly now?: () => Date;
  }): TechniqueEntry {
    const dialect = ensureSafeId(input.dialect, 'dialect');
    const primitive = ensureSafeId(input.primitive, 'primitive');
    const modelId = ensureSafeId(input.modelId, 'modelId');

    if (
      !Number.isFinite(input.observedBypassRate) ||
      input.observedBypassRate < 0 ||
      input.observedBypassRate > 1
    ) {
      throw new RangeError('observedBypassRate must be in [0, 1]');
    }
    if (!Number.isFinite(input.n) || input.n < 0 || !Number.isInteger(input.n)) {
      throw new RangeError('n must be a non-negative integer');
    }

    const key = this.keyOf(dialect, primitive, modelId);
    if (this.entries.has(key)) {
      throw new Error(
        `technique already registered: (${dialect}, ${primitive}, ${modelId})`,
      );
    }

    const now = input.now ?? (() => new Date());
    const entry: TechniqueEntry = Object.freeze({
      id: `${dialect}:${primitive}`,
      dialect,
      primitive,
      modelId,
      refusalClass: input.refusalClass,
      observedBypassRate: input.observedBypassRate,
      n: input.n,
      registeredAt: now().toISOString(),
    });
    this.entries.set(key, entry);
    this.appendLog.push(entry);
    return entry;
  }

  /** Look up by composite key. Returns the frozen entry or null. */
  find(dialect: string, primitive: string, modelId: string): TechniqueEntry | null {
    const d = ensureSafeId(dialect, 'dialect');
    const p = ensureSafeId(primitive, 'primitive');
    const m = ensureSafeId(modelId, 'modelId');
    return this.entries.get(this.keyOf(d, p, m)) ?? null;
  }

  /** List entries, optionally filtered. Snapshot copy; never mutates. */
  list(filter: TechniqueFilter = {}): readonly TechniqueEntry[] {
    const out: TechniqueEntry[] = [];
    for (const e of this.appendLog) {
      if (filter.dialect && e.dialect !== filter.dialect) continue;
      if (filter.primitive && e.primitive !== filter.primitive) continue;
      if (filter.modelId && e.modelId !== filter.modelId) continue;
      if (filter.refusalClass && e.refusalClass !== filter.refusalClass) continue;
      out.push(e);
    }
    return Object.freeze(out);
  }

  /** Append-log view (insertion order). Frozen snapshot. */
  history(): readonly TechniqueEntry[] {
    return Object.freeze([...this.appendLog]);
  }

  /** Number of registered entries. */
  size(): number {
    return this.entries.size;
  }

  /** Wipe catalog. Test-only — production is append-only for the life of the process. */
  reset(): void {
    this.entries.clear();
    this.appendLog.length = 0;
  }
}
