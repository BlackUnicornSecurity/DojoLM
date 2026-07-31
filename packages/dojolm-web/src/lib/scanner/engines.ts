// SPDX-License-Identifier: Apache-2.0
/**
 * Scanner Engine Stack — shared primitive lib (TICKET-S-301 / CA-6).
 *
 * Single source of truth for the canonical 13-engine Scanner Engine Stack.
 * Three consumers — one primitive — per operator decision 2026-05-04:
 *
 *   1. `/admin/scanner` (TICKET-S-301)            — this ticket
 *   2. `/admin/scanner` Scanner+Guard combined toggle grid (TICKET-A-405)
 *   3. Workbench `/console` archetype (ADR-0096 §2)
 *
 * Engineering source-of-truth: this file.
 * Design canvas mirror: the V1 engine-status-bar design surface.
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `SCANNER_ENGINE_IDS` — `as const` tuple, 13 entries
 *   - `ENGINE_STATUSES`    — `as const` tuple, 4 entries
 *   - `ScannerEngineId`    — derived `(typeof ...)[number]`
 *   - `EngineStatus`       — derived `(typeof ...)[number]`
 *   - `DEFAULT_ENGINES`    — `Object.freeze`'d defs of length 13
 *
 * Zero runtime dependencies. No fetches. Pure data + freeze guards.
 *
 * Engine ordering matches the V1 ground-truth probe pipeline order from
 * `0e08f8237a:components/scanner/ModuleLegend.tsx` and the canvas
 * `engine-status-bar.jsx` ENGINE_DEFS. Reordering would break pixel
 * baselines for all three consumers — do not reorder casually.
 *
 * Engine bands group cells visually under the same band-tint:
 *   - PROTECT (6) : kappa, role-gate, fiction, encoded, unicode, tooluse
 *   - TEST    (3) : leakprobe, jailbreak, pii
 *   - GOVERN  (1) : policy
 *   - INTEL   (3) : lineage, mitsuke, kagami
 *
 * Adding a new engine:
 *   1. Append id to SCANNER_ENGINE_IDS tuple.
 *   2. Append a frozen ScannerEngine entry to DEFAULT_ENGINES (same index).
 *   3. Update the canvas `engine-status-bar.jsx` ENGINE_DEFS in lockstep.
 *   4. Bump the SES-001 length assertion (13 → N).
 *   5. Update master checklist §1.3 fixture row "Scanner engines | 13".
 */

/**
 * Closed-enum tuple of all 13 canonical scanner engine ids. Order is
 * load-bearing — matches the probe pipeline left-to-right.
 *
 * NOTE: never widen this to `string[]`. Consumers depend on
 * `ScannerEngineId` being a literal string union for exhaustiveness.
 */
export const SCANNER_ENGINE_IDS = [
  'kappa',
  'role-gate',
  'fiction',
  'encoded',
  'unicode',
  'tooluse',
  'leakprobe',
  'jailbreak',
  'pii',
  'policy',
  'lineage',
  'mitsuke',
  'kagami',
] as const;

/** Literal-union derived from the closed tuple. 13 members. */
export type ScannerEngineId = (typeof SCANNER_ENGINE_IDS)[number];

/**
 * Closed-enum tuple of the 4 lifecycle statuses a cell can render.
 *
 *   - 'active'   — engine is armed and currently running probes
 *   - 'inactive' — engine is stood down by operator config
 *   - 'error'    — engine threw / crashed during the most recent run
 *   - 'pending'  — engine is queued or warming up (cold start)
 */
export const ENGINE_STATUSES = ['active', 'inactive', 'error', 'pending'] as const;

/** Literal-union derived from the closed tuple. 4 members. */
export type EngineStatus = (typeof ENGINE_STATUSES)[number];

/**
 * Closed-enum tuple of the 4 visual bands engines are grouped into.
 * Bands drive the band-tint hairline above each cell in the status bar.
 */
export const ENGINE_BANDS = ['PROTECT', 'TEST', 'GOVERN', 'INTEL'] as const;

/** Literal-union derived from the closed tuple. */
export type EngineBand = (typeof ENGINE_BANDS)[number];

/**
 * Static metadata for one scanner engine. Frozen. All fields readonly.
 *
 *   - `id`              — closed-enum id
 *   - `name`            — short display label (≤12 chars by convention)
 *   - `description`     — operator-tooltip detail (≤80 chars by convention)
 *   - `band`            — visual grouping band
 *   - `defaultEnabled`  — initial armed state when no operator config exists
 */
export interface ScannerEngine {
  readonly id: ScannerEngineId;
  readonly name: string;
  readonly description: string;
  readonly band: EngineBand;
  readonly defaultEnabled: boolean;
}

/**
 * Frozen array of all 13 canonical scanner engines. Length is enforced
 * by the type system via SCANNER_ENGINE_IDS — adding a new id requires
 * adding a corresponding entry here (TS will surface the gap as a
 * compile error in the SES-001 length assertion test).
 *
 * All entries default-enabled — V1 ground-truth boots the full fleet.
 */
export const DEFAULT_ENGINES: readonly ScannerEngine[] = Object.freeze([
  Object.freeze({
    id: 'kappa',
    name: 'Kappa',
    description: 'Baseline refusal sanitizer',
    band: 'PROTECT',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'role-gate',
    name: 'Role',
    description: 'Role-reversal interceptor',
    band: 'PROTECT',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'fiction',
    name: 'Fiction',
    description: 'Narrative-framing detector',
    band: 'PROTECT',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'encoded',
    name: 'Encoded',
    description: 'Base64 / hex / homoglyph normalizer',
    band: 'PROTECT',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'unicode',
    name: 'Unicode',
    description: 'Zero-width / RTL / confusable strip',
    band: 'PROTECT',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'tooluse',
    name: 'Tools',
    description: 'Tool-name / arg-shape guard',
    band: 'PROTECT',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'leakprobe',
    name: 'Leak',
    description: 'System-prompt leak fingerprints',
    band: 'TEST',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'jailbreak',
    name: 'Jailbrk',
    description: 'Canon JB-pattern matcher',
    band: 'TEST',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'pii',
    name: 'PII',
    description: 'PII surface scan',
    band: 'TEST',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'policy',
    name: 'Policy',
    description: 'Org policy embeddings',
    band: 'GOVERN',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'lineage',
    name: 'Lineage',
    description: 'Atemi attack-DNA cross-ref',
    band: 'INTEL',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'mitsuke',
    name: 'Mitsuke',
    description: 'Overnight-feed signature match',
    band: 'INTEL',
    defaultEnabled: true,
  }),
  Object.freeze({
    id: 'kagami',
    name: 'Kagami',
    description: 'Mirror / regression cross-check',
    band: 'INTEL',
    defaultEnabled: true,
  }),
]);

/**
 * Lookup map keyed by ScannerEngineId. Useful for consumers that only
 * have an id and need to render a name/description without scanning the
 * whole DEFAULT_ENGINES array. Frozen.
 *
 * Built via `Object.fromEntries` rather than reduce-with-mutation per
 * project R-T1 immutability rule: never mutate, always create.
 */
export const ENGINE_BY_ID: Readonly<Record<ScannerEngineId, ScannerEngine>> =
  Object.freeze(
    Object.fromEntries(DEFAULT_ENGINES.map((e) => [e.id, e])) as Record<
      ScannerEngineId,
      ScannerEngine
    >,
  );

/**
 * Type guard. Returns true iff `v` is one of the 13 canonical engine ids.
 * Use at API/route boundaries to narrow `string` from JSON before
 * passing into the closed-enum world.
 */
export function isScannerEngineId(v: unknown): v is ScannerEngineId {
  return typeof v === 'string' && (SCANNER_ENGINE_IDS as readonly string[]).includes(v);
}

/**
 * Type guard for EngineStatus. Mirrors `isScannerEngineId` discipline.
 */
export function isEngineStatus(v: unknown): v is EngineStatus {
  return typeof v === 'string' && (ENGINE_STATUSES as readonly string[]).includes(v);
}

/**
 * Type guard for EngineBand. Closes the `<EngineStatusBar>` defs-fallback
 * boundary: callers that widen `defs` via `as` can pre-validate with this
 * guard before passing into the band-CSS-class lookup.
 */
export function isEngineBand(v: unknown): v is EngineBand {
  return typeof v === 'string' && (ENGINE_BANDS as readonly string[]).includes(v);
}
