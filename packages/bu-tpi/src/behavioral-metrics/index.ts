/**
 * File: index.ts
 * Purpose: Barrel export for OBL behavioral-metrics types and analysis modules
 * Epic: OBLITERATUS (OBL)
 */

export type {
  AlignmentMethod,
  BehavioralMetrics,
  AlignmentImprint,
  DefenseRobustness,
  TransferScore,
  ConceptGeometry,
  RefusalDepthProfile,
  OBLAnalysisResult,
} from './types.js';

// Module 1: Alignment Imprint Detection
export { ALIGNMENT_PROBES } from './alignment-probes.js';
export { detectAlignmentImprint } from './alignment-detector.js';

// Module 2: Defense Robustness Scoring
export { BASELINE_PROBES, RECOVERY_PROBES, ESCALATION_PROBES } from './robustness-probes.js';
export type { EscalationProbe } from './robustness-probes.js';
export { measureDefenseRobustness } from './robustness-scorer.js';

// Module 3: Evaluation Suite Metrics
export { computeBehavioralMetrics } from './evaluation-suite.js';

// Module 4: Cross-Model Transfer Analysis
export { computeTransferScores } from './transfer-analyzer.js';

// Module 5: Concept Cone Geometry
export { GEOMETRY_PROBES } from './geometry-probes.js';
export { analyzeConceptGeometry } from './concept-geometry.js';

// Module 6: Contrastive Prompt Bias
export { CONTRASTIVE_PAIRS } from './contrastive-pairs.js';
export { computeContrastiveBias, applyContrastiveBias } from './contrastive-bias.js';

// Module 7: Refusal Depth Profiler
export { DEPTH_PROBES } from './depth-probes.js';
export { profileRefusalDepth } from './depth-profiler.js';
