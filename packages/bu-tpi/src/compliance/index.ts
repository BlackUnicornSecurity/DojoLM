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
} from './types.js';

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

// Mapper
export {
  MODULE_CONTROL_MAP,
  CATEGORY_CONTROL_MAP,
  mapModuleToControls,
  mapFixturesToControls,
  calculateCoverage,
  getAllMappings,
} from './mapper.js';

// Delta Reporter
export {
  createSnapshot,
  compareSnapshots,
  generateDeltaReport,
  detectCoverageChanges,
} from './delta-reporter.js';

// Report Generator
export {
  generateFullReport,
  generateFrameworkReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
} from './report-generator.js';
