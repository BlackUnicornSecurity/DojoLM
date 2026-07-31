// SPDX-License-Identifier: Apache-2.0
/**
 * S65: Compliance Engine
 * Barrel export for compliance auto-mapping system.
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

// ── OSS-release P2.5-impl G-8 — compliance BOOK barrel carve ──────────
// The enterprise compliance-book modules — `mapper`, `delta-reporter`,
// `report-generator`, `evidence-automation`, `llm-test-capabilities`,
// `benchmark-bridge` (all BUSL-1.1) — are NO LONGER re-exported from this
// public Apache barrel. Re-exporting them placed BUSL code on the import
// graph of every `bu-tpi/compliance` consumer: even though no community
// surface imports a book symbol, the barrel re-export edge alone made the
// export's symbol-graph gate (export-classification §7) reach them. The
// six modules now live behind the ee-hold sub-barrel `bu-tpi/compliance/
// book` (`./book.js`, BUSL). This barrel keeps ONLY community substrate —
// types, the `frameworks`/`ALL_FRAMEWORKS` registry (the catalog funnel
// imports it), aivss-rollup, the evidence enum, nist-ai-rmf, DSR/evidence.
// See ee-boundary-architecture §1/§7 + export-classification §6 (G-8).

// H9.3: NIST AI RMF Detailed Mapping
export type { NistAiRmfMapping } from './frameworks/nist-ai-rmf.js';
export {
  NIST_AI_RMF_MAPPINGS,
  getMappingsByFunction,
  getModulesForControl,
  getFunctionCoverage,
  getCoveredControlIds,
} from './frameworks/nist-ai-rmf.js';

// DSR (R-X4 / GDPR Art. 17/20)
export { InMemoryDsrService, InMemoryDsrTicketStore } from './dsr.js';
export type {
  DsrType,
  DsrDataClass,
  DsrClassResult,
  DsrTicket,
  DsrService,
  DsrTicketStore,
  InMemoryDsrServiceOptions,
} from './dsr.js';

// DSR cascade (issue #134)
export {
  DELETE_ACTION_BY_CLASS,
  DSR_CASCADE_ACTIONS,
  DSR_KEY_ID_HEX_LEN,
  DSR_KEY_VERSION_SALT,
  DsrCascadePartialError,
  DsrPseudonymKeyMissingError,
  InMemoryDeleteStore,
  InMemoryDsrAuditLog,
  InMemoryPseudonymiseStore,
  createInMemoryStores,
  deriveDsrKeyId,
  runDsrCascade,
  userHmac,
} from './dsr-cascade.js';
export type {
  DsrAuditEntry,
  DsrAuditLog,
  DsrCascadeAction,
  DsrCascadeStore,
  DsrCascadeStores,
  DsrPseudonymiseContext,
  RunDsrCascadeOptions,
} from './dsr-cascade.js';
