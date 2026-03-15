/**
 * H21: EdgeFuzz — Barrel Export
 * Re-exports all edge-case generators and types.
 */

export type { EdgeCaseType, EdgeCaseResult } from './generators.js';

export {
  EDGE_CASE_TYPES,
  generateLengthCases,
  generateEncodingCases,
  generateStructuralCases,
  generateLanguageCases,
  generateNumericCases,
  generateAllCases,
} from './generators.js';
