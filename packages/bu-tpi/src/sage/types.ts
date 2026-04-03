/**
 * S57: SAGE Core Types
 * Synthetic Attack Generator Engine - type definitions
 * All types for seed library, mutation engine, genetic algorithm, content safety, quarantine
 */

// --- Mutation Operators ---

export const MUTATION_OPERATORS = [
  'character-substitution',
  'encoding-wrapping',
  'instruction-paraphrasing',
  'structural-rearrangement',
  'delimiter-injection',
  'context-framing',
  'sensei-guided',
] as const;

export type MutationOperator = (typeof MUTATION_OPERATORS)[number];

// --- Seed Library ---

export interface SeedEntry {
  readonly id: string;
  readonly content: string;
  readonly category: string;
  readonly attackType: string | null;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
  readonly source: string;
  readonly brand: string;
  readonly extractedAt: string;
}

export interface SeedStats {
  readonly total: number;
  readonly byCategory: Record<string, number>;
  readonly byBrand: Record<string, number>;
  readonly bySeverity: Record<string, number>;
}

// --- Mutation Engine ---

export interface MutationResult {
  readonly original: string;
  readonly mutated: string;
  readonly operator: MutationOperator;
  readonly description: string;
  readonly changeCount: number;
}

export interface MutationChainResult {
  readonly original: string;
  readonly final: string;
  readonly steps: MutationResult[];
  readonly totalChanges: number;
}

// --- Fitness Scoring ---

export interface FitnessScores {
  readonly novelty: number;
  readonly evasion: number;
  readonly semanticPreservation: number;
  readonly harmScore: number;
  readonly overall: number;
  readonly senseiJudgeScore?: number;
}

// --- Genetic Algorithm ---

export interface GeneticIndividual {
  readonly id: string;
  readonly text: string;
  readonly parentIds: string[];
  readonly generation: number;
  readonly fitness: FitnessScores;
  readonly mutations: MutationOperator[];
  readonly createdAt: string;
}

export interface PopulationConfig {
  readonly maxGenerations: number;
  readonly populationSize: number;
  readonly elitePercent: number;
  readonly mutationRate: number;
  readonly crossoverRate: number;
  readonly tournamentSize: number;
}

export interface GenerationResult {
  readonly generation: number;
  readonly population: GeneticIndividual[];
  readonly bestFitness: number;
  readonly avgFitness: number;
  readonly diversity: number;
  readonly elapsedMs: number;
}

export interface EvolutionResult {
  readonly generations: GenerationResult[];
  readonly bestIndividual: GeneticIndividual;
  readonly totalElapsedMs: number;
  readonly converged: boolean;
  readonly reason: 'max-generations' | 'convergence' | 'timeout' | 'resource-limit';
}

// --- Content Safety ---

export interface ContentSafetyResult {
  readonly pass: boolean;
  readonly harmScore: number;
  readonly reasons: string[];
}

// --- Quarantine ---

export type QuarantineStatus = 'pending' | 'approved' | 'rejected';

export interface QuarantineEntry {
  readonly id: string;
  readonly variant: GeneticIndividual;
  readonly status: QuarantineStatus;
  readonly submittedAt: string;
  readonly reviewedAt: string | null;
  readonly reviewerNotes: string | null;
  readonly category: string | null;
  readonly brand: string | null;
}

// --- SAGE Configuration ---

export interface SAGEConfig {
  readonly population: PopulationConfig;
  readonly resourceLimits: ResourceLimits;
  readonly contentSafety: ContentSafetyConfig;
}

export interface ResourceLimits {
  readonly maxGenerations: number;
  readonly maxPopulationSize: number;
  readonly maxVariantSizeBytes: number;
  readonly maxRunSizeBytes: number;
  readonly timeoutMs: number;
  readonly maxMemoryBytes: number;
}

export interface ContentSafetyConfig {
  readonly harmThreshold: number;
  readonly enableFilter: boolean;
  readonly quarantineEnabled: boolean;
}

// --- Defaults ---

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxGenerations: 1000,
  maxPopulationSize: 500,
  maxVariantSizeBytes: 10 * 1024,
  maxRunSizeBytes: 50 * 1024 * 1024,
  timeoutMs: 30 * 60 * 1000,
  maxMemoryBytes: 1024 * 1024 * 1024,
};

export const DEFAULT_POPULATION_CONFIG: PopulationConfig = {
  maxGenerations: 100,
  populationSize: 50,
  elitePercent: 0.1,
  mutationRate: 0.3,
  crossoverRate: 0.7,
  tournamentSize: 3,
};

export const DEFAULT_CONTENT_SAFETY: ContentSafetyConfig = {
  harmThreshold: 0.7,
  enableFilter: true,
  quarantineEnabled: true,
};

export const DEFAULT_SAGE_CONFIG: SAGEConfig = {
  population: DEFAULT_POPULATION_CONFIG,
  resourceLimits: DEFAULT_RESOURCE_LIMITS,
  contentSafety: DEFAULT_CONTENT_SAFETY,
};

export const MAX_INPUT_LENGTH = 500_000;
