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
