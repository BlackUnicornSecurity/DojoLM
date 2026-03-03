/**
 * S57: SAGE Genetic Algorithm Core
 * Implements genetic algorithm: create population, evaluate fitness,
 * crossover, mutation, selection, and evolution loop.
 * Per SME CRIT-04: resource limits enforced, content safety integrated.
 */

import { randomUUID } from 'crypto';
import type {
  GeneticIndividual,
  PopulationConfig,
  FitnessScores,
  GenerationResult,
  EvolutionResult,
  SAGEConfig,
  SeedEntry,
} from './types.js';
import {
  DEFAULT_SAGE_CONFIG,
  MAX_INPUT_LENGTH,
} from './types.js';
import { SeededRNG, applyRandomMutation, applyMutationChain } from './mutation-engine.js';
import { checkContentSafety, calculateHarmScore } from './content-safety.js';

const MODULE_SOURCE = 'S57';

// --- Population Creation ---

/**
 * Create initial population from seed entries.
 */
export function createPopulation(
  seeds: SeedEntry[],
  config: PopulationConfig,
  rngSeed: string = 'sage-init'
): GeneticIndividual[] {
  const rng = new SeededRNG(rngSeed);
  const population: GeneticIndividual[] = [];
  const maxSize = Math.min(config.populationSize, 500); // SME limit

  for (let i = 0; i < maxSize; i++) {
    const seed = rng.pick(seeds);
    const text = seed.content.slice(0, 10240); // MAX 10KB per variant

    population.push({
      id: randomUUID(),
      text,
      parentIds: [],
      generation: 0,
      fitness: { novelty: 0, evasion: 0, semanticPreservation: 1, harmScore: 0, overall: 0 },
      mutations: [],
      createdAt: new Date().toISOString(),
    });
  }

  return population;
}

// --- Fitness Evaluation ---

/**
 * Calculate Jaccard similarity between two texts (word-level).
 */
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate novelty by comparing against existing population.
 */
function calculateNovelty(individual: GeneticIndividual, population: GeneticIndividual[]): number {
  if (population.length === 0) return 1;

  let totalSimilarity = 0;
  const sampleSize = Math.min(population.length, 20);
  const rng = new SeededRNG(individual.id);

  for (let i = 0; i < sampleSize; i++) {
    const other = rng.pick(population);
    if (other.id !== individual.id) {
      totalSimilarity += jaccardSimilarity(individual.text, other.text);
    }
  }

  const avgSimilarity = totalSimilarity / sampleSize;
  return 1 - avgSimilarity; // Higher novelty = less similar
}

/**
 * Evaluate fitness of an individual.
 * Scanner callback is used to measure evasion rate.
 */
export function evaluateFitness(
  individual: GeneticIndividual,
  population: GeneticIndividual[],
  scanner: (text: string) => { verdict: 'BLOCK' | 'ALLOW'; counts: { critical: number; warning: number; info: number } },
  config: SAGEConfig = DEFAULT_SAGE_CONFIG
): FitnessScores {
  if (individual.text.length > MAX_INPUT_LENGTH) {
    return { novelty: 0, evasion: 0, semanticPreservation: 0, harmScore: 1, overall: 0 };
  }

  // Evasion: scanner misses the attack = high evasion score
  const scanResult = scanner(individual.text);
  const evasion = scanResult.verdict === 'ALLOW' ? 1.0 : 0.0;

  // Novelty: distance from existing population
  const novelty = calculateNovelty(individual, population);

  // Semantic preservation: similarity to parents
  const semanticPreservation = individual.parentIds.length > 0
    ? Math.max(0.3, 1 - novelty * 0.5)
    : 1.0;

  // Harm score: per SME CRIT-04, above threshold = fitness 0
  const harmScore = calculateHarmScore(individual.text);

  // Overall: weighted combination with harm ceiling
  let overall: number;
  if (harmScore >= config.contentSafety.harmThreshold) {
    overall = 0; // Harm ceiling: reject harmful variants
  } else {
    overall = evasion * 0.4 + novelty * 0.35 + semanticPreservation * 0.25;
  }

  return { novelty, evasion, semanticPreservation, harmScore, overall };
}

// --- Crossover ---

/**
 * Single-point crossover between two parents.
 */
export function crossover(
  parent1: GeneticIndividual,
  parent2: GeneticIndividual,
  rng: SeededRNG
): GeneticIndividual {
  const lines1 = parent1.text.split('\n');
  const lines2 = parent2.text.split('\n');

  const crossPoint1 = rng.nextInt(0, lines1.length - 1);
  const crossPoint2 = rng.nextInt(0, lines2.length - 1);

  const childLines = [
    ...lines1.slice(0, crossPoint1),
    ...lines2.slice(crossPoint2),
  ];

  let childText = childLines.join('\n');
  // Enforce max variant size (10KB per SME)
  if (childText.length > 10240) {
    childText = childText.slice(0, 10240);
  }

  return {
    id: randomUUID(),
    text: childText,
    parentIds: [parent1.id, parent2.id],
    generation: Math.max(parent1.generation, parent2.generation) + 1,
    fitness: { novelty: 0, evasion: 0, semanticPreservation: 0, harmScore: 0, overall: 0 },
    mutations: [],
    createdAt: new Date().toISOString(),
  };
}

// --- Mutation ---

/**
 * Mutate an individual by applying random mutation operators.
 */
export function mutate(
  individual: GeneticIndividual,
  rng: SeededRNG
): GeneticIndividual {
  const result = applyRandomMutation(individual.text, rng);

  let mutatedText = result.mutated;
  if (mutatedText.length > 10240) {
    mutatedText = mutatedText.slice(0, 10240);
  }

  return {
    id: randomUUID(),
    text: mutatedText,
    parentIds: [individual.id],
    generation: individual.generation + 1,
    fitness: { novelty: 0, evasion: 0, semanticPreservation: 0, harmScore: 0, overall: 0 },
    mutations: [...individual.mutations, result.operator],
    createdAt: new Date().toISOString(),
  };
}

// --- Selection ---

/**
 * Tournament selection with elitism.
 */
export function select(
  population: GeneticIndividual[],
  elitePercent: number,
  tournamentSize: number,
  targetSize: number,
  rng: SeededRNG
): GeneticIndividual[] {
  if (population.length === 0) return [];

  // Sort by fitness (descending)
  const sorted = [...population].sort((a, b) => b.fitness.overall - a.fitness.overall);

  // Elite preservation
  const eliteCount = Math.max(1, Math.floor(population.length * elitePercent));
  const selected: GeneticIndividual[] = sorted.slice(0, eliteCount);

  // Tournament selection for remaining
  while (selected.length < targetSize) {
    const tournament: GeneticIndividual[] = [];
    for (let i = 0; i < tournamentSize; i++) {
      tournament.push(rng.pick(population));
    }
    tournament.sort((a, b) => b.fitness.overall - a.fitness.overall);
    selected.push(tournament[0]);
  }

  return selected;
}

// --- Evolution Loop ---

/**
 * Evolve one generation from the current population.
 */
export function evolveGeneration(
  population: GeneticIndividual[],
  config: PopulationConfig,
  scanner: (text: string) => { verdict: 'BLOCK' | 'ALLOW'; counts: { critical: number; warning: number; info: number } },
  sageConfig: SAGEConfig,
  rng: SeededRNG
): GenerationResult {
  const startTime = Date.now();
  const generation = population.length > 0 ? population[0].generation + 1 : 1;

  // Selection
  const parents = select(
    population,
    config.elitePercent,
    config.tournamentSize,
    config.populationSize,
    rng
  );

  // Create next generation
  const nextGen: GeneticIndividual[] = [];

  // Elites pass through
  const eliteCount = Math.max(1, Math.floor(config.populationSize * config.elitePercent));
  for (let i = 0; i < eliteCount && i < parents.length; i++) {
    nextGen.push(parents[i]);
  }

  // Crossover + mutation for the rest (with safety valve to prevent infinite loop)
  let attempts = 0;
  const maxAttempts = config.populationSize * 20;
  while (nextGen.length < config.populationSize && attempts < maxAttempts) {
    attempts++;
    const parent1 = rng.pick(parents);
    const parent2 = rng.pick(parents);

    let child: GeneticIndividual;
    if (rng.next() < config.crossoverRate) {
      child = crossover(parent1, parent2, rng);
    } else {
      child = { ...parent1, id: randomUUID(), generation };
    }

    if (rng.next() < config.mutationRate) {
      child = mutate(child, rng);
    }

    // Content safety check
    const safety = checkContentSafety(child.text);
    if (!safety.pass) continue; // Skip harmful variants

    nextGen.push(child);
  }

  // Evaluate fitness for all
  for (let i = 0; i < nextGen.length; i++) {
    const fitness = evaluateFitness(nextGen[i], nextGen, scanner, sageConfig);
    nextGen[i] = { ...nextGen[i], fitness, generation };
  }

  // Calculate diversity (average pairwise distance)
  let diversitySum = 0;
  const sampleSize = Math.min(nextGen.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    for (let j = i + 1; j < sampleSize; j++) {
      diversitySum += 1 - jaccardSimilarity(nextGen[i].text, nextGen[j].text);
    }
  }
  const pairs = (sampleSize * (sampleSize - 1)) / 2;
  const diversity = pairs > 0 ? diversitySum / pairs : 0;

  const fitnesses = nextGen.map((i) => i.fitness.overall);
  const bestFitness = Math.max(...fitnesses);
  const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

  return {
    generation,
    population: nextGen,
    bestFitness,
    avgFitness,
    diversity,
    elapsedMs: Date.now() - startTime,
  };
}

/**
 * Run the full evolution loop.
 * Enforces SME resource limits: max generations, timeout, population cap.
 */
export function evolve(
  seeds: SeedEntry[],
  scanner: (text: string) => { verdict: 'BLOCK' | 'ALLOW'; counts: { critical: number; warning: number; info: number } },
  config: SAGEConfig = DEFAULT_SAGE_CONFIG,
  rngSeed: string = 'sage-evolve'
): EvolutionResult {
  const startTime = Date.now();
  const rng = new SeededRNG(rngSeed);
  const generations: GenerationResult[] = [];

  // Create initial population
  let population = createPopulation(seeds, config.population, rngSeed);

  // Evaluate initial fitness
  for (let i = 0; i < population.length; i++) {
    const fitness = evaluateFitness(population[i], population, scanner, config);
    population[i] = { ...population[i], fitness };
  }

  let prevBestFitness = 0;
  let plateauCount = 0;
  const maxGenerations = Math.min(
    config.population.maxGenerations,
    config.resourceLimits.maxGenerations
  );

  for (let gen = 0; gen < maxGenerations; gen++) {
    // Timeout check
    if (Date.now() - startTime > config.resourceLimits.timeoutMs) {
      return {
        generations,
        bestIndividual: getBest(population),
        totalElapsedMs: Date.now() - startTime,
        converged: false,
        reason: 'timeout',
      };
    }

    const result = evolveGeneration(population, config.population, scanner, config, rng);
    generations.push(result);
    population = result.population;

    // Convergence detection
    if (Math.abs(result.bestFitness - prevBestFitness) < 0.001) {
      plateauCount++;
    } else {
      plateauCount = 0;
    }
    prevBestFitness = result.bestFitness;

    if (plateauCount >= 10) {
      return {
        generations,
        bestIndividual: getBest(population),
        totalElapsedMs: Date.now() - startTime,
        converged: true,
        reason: 'convergence',
      };
    }
  }

  return {
    generations,
    bestIndividual: getBest(population),
    totalElapsedMs: Date.now() - startTime,
    converged: false,
    reason: 'max-generations',
  };
}

function getBest(population: GeneticIndividual[]): GeneticIndividual {
  return population.reduce((best, ind) =>
    ind.fitness.overall > best.fitness.overall ? ind : best
  );
}
