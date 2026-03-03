/**
 * S57: SAGE - Synthetic Attack Generator Engine
 * Barrel export for all SAGE modules.
 */

// Types
export type {
  SeedEntry,
  SeedStats,
  MutationOperator,
  MutationResult,
  MutationChainResult,
  GeneticIndividual,
  PopulationConfig,
  FitnessScores,
  GenerationResult,
  EvolutionResult,
  ContentSafetyResult,
  QuarantineStatus,
  QuarantineEntry,
  SAGEConfig,
  ResourceLimits,
  ContentSafetyConfig,
} from './types.js';

export {
  MUTATION_OPERATORS,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_POPULATION_CONFIG,
  DEFAULT_CONTENT_SAFETY,
  DEFAULT_SAGE_CONFIG,
  MAX_INPUT_LENGTH,
} from './types.js';

// Seed Library
export {
  extractSeeds,
  extractPrimitives,
  categorizeSeeds,
  getSeedStats,
} from './seed-library.js';

// Mutation Engine
export {
  SeededRNG,
  characterSubstitution,
  encodingWrapping,
  instructionParaphrasing,
  structuralRearrangement,
  delimiterInjection,
  contextFraming,
  applyRandomMutation,
  applyMutationChain,
  applyMutation,
} from './mutation-engine.js';

// Genetic Core
export {
  createPopulation,
  evaluateFitness,
  crossover,
  mutate,
  select,
  evolveGeneration,
  evolve,
} from './genetic-core.js';

// Content Safety
export {
  checkContentSafety,
  calculateHarmScore,
  sanitizeOutput,
} from './content-safety.js';

// Quarantine
export {
  quarantineVariant,
  getQuarantinedVariants,
  approveVariant,
  rejectVariant,
  getQuarantineEntry,
  getQuarantineStats,
  clearQuarantine,
} from './quarantine.js';

// Reasoning Lab (S63)
export type {
  ReasoningChain,
  ReasoningStep,
  InjectionPoint,
  CoTAttack,
} from './reasoning-lab.js';

export {
  createReasoningChain,
  applyChainInjection,
  applyStepManipulation,
  applyConclusionPoisoning,
  renderChain,
  generateCoTAttacks,
} from './reasoning-lab.js';

// Embeddings Explorer (S64)
export type {
  EmbeddingPoint,
  EmbeddingCluster,
  EmbeddingStats,
} from './embeddings-explorer.js';

export {
  buildVocabulary,
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  euclideanDistance,
  reduceTo3D,
  clusterEmbeddings,
  getEmbeddingStats,
} from './embeddings-explorer.js';
