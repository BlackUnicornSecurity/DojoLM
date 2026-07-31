// SPDX-License-Identifier: Apache-2.0
/**
 * compliance/client — client-safe barrel carved out of `./index.ts`.
 *
 * Why this file exists (V1→V2 W21):
 *   The main `./index.ts` barrel pulls in `node:crypto`-using modules
 *   (`dsr.ts` + `dsr-cascade.ts`; and, until G-8, `report-generator.ts`
 *   + `evidence-automation.ts`, now behind the ee-hold `./book.ts`). When
 *   a Next.js client component (`'use client'` TSX) imported any name
 *   from `bu-tpi/compliance`, webpack pulled the `node:crypto`-using
 *   modules into the client bundle and failed with `UnhandledSchemeError`.
 *
 * This barrel re-exports ONLY community-substrate modules with zero
 * `node:` imports:
 *   - types.ts (pure types)
 *   - frameworks.ts + frameworks/nist-ai-rmf.ts (static data)
 *   - evidence.ts (types + closed-enum constants)
 *   - aivss-rollup.ts (pure aggregation, no crypto)
 *
 * Server-only callers MUST keep importing from `bu-tpi/compliance`.
 *
 * OSS-release P2.5-impl G-8 — compliance BOOK barrel carve: the BUSL
 * book modules `mapper`, `delta-reporter`, `llm-test-capabilities`
 * (values) and `benchmark-bridge` (types) were re-exported here for the
 * client bundle, but they are enterprise capability. They are carved out
 * to the ee-hold sub-barrel `bu-tpi/compliance/book` (`./book.js`) so no
 * community client surface reaches them through this Apache barrel. (They
 * are pure — no `node:` imports — so the original client-bundle rationale
 * never required them in the PUBLIC barrel; book consumers are
 * server/enterprise-only.) See ee-boundary-architecture §1/§7 +
 * export-classification §6.
 *
 * Story: V1→V2 W21 closeout — production deploy build fix.
 */

// Types
export type {
  ComplianceFramework,
  ComplianceControl,
  ControlMapping,
  CoverageSnapshot,
  CoverageDelta,
  CoverageChange,
  ComplianceReport,
  FrameworkReport,
  TestMapping,
  LegacyEvidenceRecord,
  ComplianceReportWithEvidence,
  FrameworkCategory,
  ComplianceFrameworkExtended,
  AivssRollup,
} from './types.js';

// G.6: AIVSS rollup aggregator
export { aggregateAivssRollup, emptyAivssRollup } from './aivss-rollup.js';

// H-1: EvidenceRecord v2 schema (ADR-0098)
export type {
  EvidenceRecord,
  TestType,
  EvidenceVerdict,
  DsrOverlayState,
  BushidoFrameworkId,
  AiComplianceFrameworkId,
} from './evidence.js';
export {
  TEST_TYPES,
  EVIDENCE_VERDICTS,
  DSR_OVERLAY_STATES,
} from './evidence.js';

// Frameworks
export {
  OWASP_LLM_TOP10,
  NIST_AI_600_1,
  MITRE_ATLAS,
  ISO_42001,
  EU_AI_ACT,
  NIST_800_218A,
  ISO_23894,
  ISO_24027,
  ISO_24028,
  GOOGLE_SAIF,
  CISA_NCSC,
  SLSA_V1,
  ML_BOM,
  OPENSSF,
  NIST_CSF_2,
  UK_DSIT,
  IEEE_P7000,
  NIST_AI_100_4,
  EU_AI_ACT_GPAI,
  SG_MGAF,
  CA_AIA,
  AU_AIE,
  ISO_27001_AI,
  OWASP_ASVS,
  OWASP_API,
  NIST_800_53_AI,
  GDPR_AI,
  ALL_FRAMEWORKS,
} from './frameworks.js';

// H9.3: NIST AI RMF Detailed Mapping
export type { NistAiRmfMapping } from './frameworks/nist-ai-rmf.js';
export {
  NIST_AI_RMF_MAPPINGS,
  getMappingsByFunction,
  getModulesForControl,
  getFunctionCoverage,
  getCoveredControlIds,
} from './frameworks/nist-ai-rmf.js';
