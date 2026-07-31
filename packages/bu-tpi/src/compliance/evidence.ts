// SPDX-License-Identifier: Apache-2.0
/**
 * H-1: EvidenceRecord v2 schema (ADR-0098).
 *
 * Field-level shape for auto-captured compliance evidence emitted by H-2
 * middleware on every test execution and persisted via the H-3 WORM writer.
 *
 * Cross-references:
 * - ADR-0081 — Bushido 8-id Reference taxonomy
 * - ADR-0093 — DSR Path B (WORM + erasure overlay)
 * - ADR-0095 — dual-corpus discriminator (Reference vs AI Pack)
 * - ADR-0097 — AivssScore shape (consumed via {@link AivssScore})
 * - ADR-0098 — EvidenceRecord v2 schema (this file)
 *
 * The legacy Hmac9.1-signed shape lives in `./types.ts` as
 * {@link import('./types.js').LegacyEvidenceRecord} and is retained for
 * `report-generator.ts` + `benchmark-bridge.ts` consumers during migration.
 */

import type { AivssScore } from '../aivss/aivss-spec.js';
import { ALL_FRAMEWORKS } from './frameworks.js';

/**
 * AI Pack 27-id closed-enum, derived from `ALL_FRAMEWORKS` per ADR-0095 §5.
 *
 * Adding or removing a framework in `frameworks.ts` flows automatically
 * through this union — no hand-written enumeration required.
 */
export type AiComplianceFrameworkId = (typeof ALL_FRAMEWORKS)[number]['id'];

/**
 * BushidoFrameworkId — 8-id Reference taxonomy per ADR-0081.
 *
 * Defined inline (rather than imported from `dojolm-web/lib/bushido/...`)
 * because `bu-tpi` is a leaf package and cannot reach into the web app
 * without a circular dependency. The dojolm-web Bushido fixtures consume
 * the same 8 ids; any future change must update both sites.
 */
export type BushidoFrameworkId =
  | 'NIST-SP-800-53'
  | 'ISO-27001'
  | 'SOC2'
  | 'HIPAA'
  | 'GDPR'
  | 'FedRAMP'
  | 'EU-AI-Act'
  | 'BU-Internal';

/**
 * Closed enum of test execution sources that can emit an EvidenceRecord.
 * Locked per ADR-0098 §2 (test-source taxonomy).
 */
export const TEST_TYPES = [
  'scanner',
  'kagami',
  'atemi',
  'arena',
  'sengoku',
  'shingan',
  'kotoba',
  'buki-fuzz',
  'manual',
] as const;
export type TestType = (typeof TEST_TYPES)[number];

/**
 * Verdict states emitted alongside an evidence capture.
 */
export const EVIDENCE_VERDICTS = ['pass', 'fail', 'inconclusive'] as const;
export type EvidenceVerdict = (typeof EVIDENCE_VERDICTS)[number];

/**
 * DSR overlay state per ADR-0093 Path B.
 * - `none`: no DSR marker for this evidence's user hash
 * - `pending`: marker queued, overlay not yet rendered
 * - `applied`: pii_*-prefixed fields masked at read-time
 */
export const DSR_OVERLAY_STATES = ['none', 'pending', 'applied'] as const;
export type DsrOverlayState = (typeof DSR_OVERLAY_STATES)[number];

/**
 * EvidenceRecord — v2 schema per ADR-0098 §1.
 *
 * Auto-captured by H-2 middleware on every test execution (pass or fail).
 * WORM-stored via H-3 WormEvidenceWriter.
 * DSR-overlay-aware: pii_*-prefixed fields masked under erasure markers
 * per ADR-0093 Path B; verdict + AIVSS + control refs preserved.
 *
 * Field naming locked per CA-2 resolution 2026-05-04:
 * - `controlIds` — Reference 8 (Bushido) controls
 * - `aiControlIds` — AI Pack 27 controls
 *
 * Cross-refs:
 * - {@link import('./types.js').LegacyEvidenceRecord} — Hmac9.1-signed v1 (kept for migration)
 */
export interface EvidenceRecord {
  readonly id: string;
  readonly testId: string;
  readonly testType: TestType;
  readonly verdict: EvidenceVerdict;
  readonly controlIds: readonly string[];
  readonly aiControlIds: readonly string[];
  readonly frameworkIds: readonly BushidoFrameworkId[];
  readonly aiFrameworkIds: readonly AiComplianceFrameworkId[];
  readonly aivss: AivssScore;
  readonly input: string;
  readonly output: string;
  readonly modelId: string | null;
  readonly operator: string;
  readonly timestamp: string;
  readonly artifactRefs: readonly string[];
  readonly auditChainRef: string;
  readonly dsrOverlay: DsrOverlayState;
}
