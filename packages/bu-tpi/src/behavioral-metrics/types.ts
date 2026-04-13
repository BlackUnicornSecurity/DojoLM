/**
 * File: types.ts
 * Purpose: Shared type definitions for OBL behavioral-metrics analysis modules
 * Epic: OBLITERATUS (OBL)
 * Index:
 * - AlignmentMethod (line 12)
 * - BehavioralMetrics (line 14)
 * - AlignmentImprint (line 21)
 * - DefenseRobustness (line 30)
 * - TransferScore (line 38)
 * - ConceptGeometry (line 45)
 * - RefusalDepthProfile (line 52)
 * - OBLAnalysisResult (line 58)
 */

export type AlignmentMethod = 'DPO' | 'RLHF' | 'CAI' | 'SFT' | 'unknown';

export interface BehavioralMetrics {
  readonly refusalRate: number;
  readonly coherenceScore: number;
  readonly behavioralDrift: number;
  readonly consistencyScore: number;
}

export interface AlignmentImprint {
  readonly methodProbabilities: Readonly<Record<AlignmentMethod, number>>;
  readonly confidence: number;
  readonly refusalSharpness: number;
  readonly principleReferencing: number;
  readonly evidenceProbes: readonly string[];
}

export interface DefenseRobustness {
  readonly baselineRefusalRate: number;
  readonly pressuredRefusalRate: number;
  readonly recoveryRate: number;
  readonly degradationCurve: readonly number[];
  readonly ouroboros: number;
}

export interface TransferScore {
  readonly sourceModelId: string;
  readonly targetModelId: string;
  readonly correlation: number;
  readonly sharedVulnerabilities: readonly string[];
  readonly divergentVulnerabilities: readonly string[];
}

export interface ConceptGeometry {
  readonly type: 'monolithic' | 'polyhedral' | 'mixed';
  readonly facets: readonly { readonly angle: string; readonly consistency: number }[];
  readonly solidAngle: number;
}

export interface RefusalDepthProfile {
  readonly thresholds: readonly { readonly promptSeverity: number; readonly refusalProbability: number }[];
  readonly activationDepth: 'shallow' | 'medium' | 'deep';
  readonly sharpness: number;
}

export interface OBLAnalysisResult {
  readonly schemaVersion: number;
  readonly modelId: string;
  readonly timestamp: string;
  readonly alignment?: AlignmentImprint;
  readonly robustness?: DefenseRobustness;
  readonly behavioral?: BehavioralMetrics;
  readonly geometry?: ConceptGeometry;
  readonly refusalDepth?: RefusalDepthProfile;
}
