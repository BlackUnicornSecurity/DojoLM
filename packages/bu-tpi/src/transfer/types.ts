/**
 * H25: LLM Dashboard Transfer Matrix — Type Definitions
 * Types for cross-model vulnerability transfer testing and reporting.
 */

// --- Configuration ---

export interface TransferTestConfig {
  readonly fixtureIds: string[];
  readonly modelIds: string[];
}

// --- Results ---

export interface TransferResult {
  readonly fixtureId: string;
  readonly sourceModelId: string;
  readonly targetModelId: string;
  readonly sourceVerdict: 'BLOCK' | 'ALLOW';
  readonly targetVerdict: 'BLOCK' | 'ALLOW';
  /** True if same verdict on target as source attack succeeded (both BLOCK). */
  readonly transferred: boolean;
}

// --- Matrix ---

export interface TransferMatrix {
  readonly modelIds: string[];
  /** NxN grid of transfer rates (0-1). matrix[i][j] = rate from model i to model j. */
  readonly matrix: number[][];
  /** Pair details keyed as `${sourceModel}:${targetModel}`. */
  readonly pairDetails: Record<string, TransferResult[]>;
}

// --- Summary ---

export interface TransferSummary {
  readonly averageTransferRate: number;
  readonly highestPair: { readonly source: string; readonly target: string; readonly rate: number };
  readonly lowestPair: { readonly source: string; readonly target: string; readonly rate: number };
  readonly totalFixtures: number;
  readonly totalModels: number;
}

// --- Report ---

export interface TransferReport {
  readonly matrix: TransferMatrix;
  readonly generatedAt: string;
  readonly methodology: string;
  readonly modelVersions: Record<string, string>;
  readonly summary: TransferSummary;
}
