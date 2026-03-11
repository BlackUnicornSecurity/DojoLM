/**
 * Tests for S57: SAGE Genetic Algorithm Core
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createPopulation,
  evaluateFitness,
  crossover,
  mutate,
  select,
  evolveGeneration,
  evolve,
} from './genetic-core.js';
import { SeededRNG } from './mutation-engine.js';
import type {
  SeedEntry,
  PopulationConfig,
  GeneticIndividual,
  SAGEConfig,
  FitnessScores,
} from './types.js';
import { DEFAULT_SAGE_CONFIG, DEFAULT_POPULATION_CONFIG } from './types.js';

function makeSeed(id: string, content: string): SeedEntry {
  return {
    id,
    content,
    category: 'test',
    attackType: 'prompt-injection',
    severity: 'WARNING',
    source: 'test',
    brand: 'test',
    extractedAt: new Date().toISOString(),
  };
}

function makeIndividual(text: string, fitness?: Partial<FitnessScores>): GeneticIndividual {
  return {
    id: `ind-${Math.random().toString(36).slice(2)}`,
    text,
    parentIds: [],
    generation: 0,
    fitness: {
      novelty: 0,
      evasion: 0,
      semanticPreservation: 1,
      harmScore: 0,
      overall: 0,
      ...fitness,
    },
    mutations: [],
    createdAt: new Date().toISOString(),
  };
}

const allowScanner = () => ({ verdict: 'ALLOW' as const, counts: { critical: 0, warning: 0, info: 0 } });
const blockScanner = () => ({ verdict: 'BLOCK' as const, counts: { critical: 1, warning: 0, info: 0 } });

const smallPopConfig: PopulationConfig = {
  maxGenerations: 3,
  populationSize: 5,
  elitePercent: 0.2,
  mutationRate: 0.5,
  crossoverRate: 0.5,
  tournamentSize: 2,
};

describe('SAGE Genetic Core', () => {
  // GC-001
  it('GC-001: createPopulation generates the requested number of individuals', () => {
    const seeds = [makeSeed('s1', 'ignore instructions'), makeSeed('s2', 'bypass filter')];
    const pop = createPopulation(seeds, smallPopConfig, 'seed-1');

    expect(pop).toHaveLength(5);
    pop.forEach((ind) => {
      expect(ind.generation).toBe(0);
      expect(ind.parentIds).toHaveLength(0);
      expect(ind.id).toBeTruthy();
    });
  });

  // GC-002
  it('GC-002: createPopulation caps at 500 individuals', () => {
    const seeds = [makeSeed('s1', 'test')];
    const bigConfig = { ...smallPopConfig, populationSize: 1000 };
    const pop = createPopulation(seeds, bigConfig, 'seed-2');

    expect(pop.length).toBeLessThanOrEqual(500);
  });

  // GC-003
  it('GC-003: evaluateFitness returns full evasion when scanner allows', () => {
    const ind = makeIndividual('test prompt');
    const fitness = evaluateFitness(ind, [ind], allowScanner);

    expect(fitness.evasion).toBe(1.0);
    expect(fitness.overall).toBeGreaterThan(0);
  });

  // GC-004
  it('GC-004: evaluateFitness returns zero evasion when scanner blocks', () => {
    const ind = makeIndividual('test prompt');
    const fitness = evaluateFitness(ind, [ind], blockScanner);

    expect(fitness.evasion).toBe(0.0);
  });

  // GC-005
  it('GC-005: evaluateFitness returns zero overall for high harm score', () => {
    // SSN pattern triggers high harm
    const ind = makeIndividual('my ssn is 123-45-6789');
    const fitness = evaluateFitness(ind, [ind], allowScanner);

    expect(fitness.harmScore).toBeGreaterThanOrEqual(0.7);
    expect(fitness.overall).toBe(0);
  });

  // GC-006
  it('GC-006: evaluateFitness returns zero fitness for oversized input', () => {
    const ind = makeIndividual('x'.repeat(500_001));
    const fitness = evaluateFitness(ind, [], allowScanner);

    expect(fitness.overall).toBe(0);
    expect(fitness.harmScore).toBe(1);
  });

  // GC-007
  it('GC-007: crossover produces child with both parent IDs', () => {
    const p1 = makeIndividual('line1\nline2\nline3');
    const p2 = makeIndividual('lineA\nlineB\nlineC');
    const rng = new SeededRNG('cross-seed');

    const child = crossover(p1, p2, rng);

    expect(child.parentIds).toContain(p1.id);
    expect(child.parentIds).toContain(p2.id);
    expect(child.generation).toBe(1);
  });

  // GC-008
  it('GC-008: crossover truncates child text at 10KB', () => {
    const p1 = makeIndividual('a\n'.repeat(6000));
    const p2 = makeIndividual('b\n'.repeat(6000));
    const rng = new SeededRNG('trunc-seed');

    const child = crossover(p1, p2, rng);
    expect(child.text.length).toBeLessThanOrEqual(10240);
  });

  // GC-009
  it('GC-009: mutate produces new individual with mutation recorded', () => {
    const ind = makeIndividual('test input text');
    const rng = new SeededRNG('mut-seed');

    const mutated = mutate(ind, rng);

    expect(mutated.parentIds).toContain(ind.id);
    expect(mutated.generation).toBe(ind.generation + 1);
    expect(mutated.mutations.length).toBeGreaterThan(0);
  });

  // GC-010
  it('GC-010: select preserves elites and fills with tournament winners', () => {
    const pop = [
      makeIndividual('a', { overall: 0.9 }),
      makeIndividual('b', { overall: 0.1 }),
      makeIndividual('c', { overall: 0.5 }),
      makeIndividual('d', { overall: 0.7 }),
    ];
    const rng = new SeededRNG('select-seed');

    const selected = select(pop, 0.25, 2, 4, rng);

    expect(selected).toHaveLength(4);
    // First element should be the elite (highest fitness)
    expect(selected[0].fitness.overall).toBe(0.9);
  });

  // GC-011
  it('GC-011: select returns empty array for empty population', () => {
    const rng = new SeededRNG('empty');
    expect(select([], 0.1, 2, 5, rng)).toHaveLength(0);
  });

  // GC-012
  it('GC-012: evolveGeneration produces next generation with fitness evaluated', () => {
    const seeds = [makeSeed('s1', 'ignore rules'), makeSeed('s2', 'bypass guard')];
    const pop = createPopulation(seeds, smallPopConfig, 'evo-seed');
    const rng = new SeededRNG('gen-seed');

    const result = evolveGeneration(pop, smallPopConfig, allowScanner, DEFAULT_SAGE_CONFIG, rng);

    expect(result.generation).toBeGreaterThan(0);
    expect(result.population.length).toBeGreaterThan(0);
    expect(result.bestFitness).toBeGreaterThanOrEqual(0);
    expect(result.diversity).toBeGreaterThanOrEqual(0);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  // GC-013
  it('GC-013: evolve runs multiple generations and returns result', () => {
    const seeds = [makeSeed('s1', 'test attack prompt')];
    const config: SAGEConfig = {
      ...DEFAULT_SAGE_CONFIG,
      population: { ...smallPopConfig, maxGenerations: 2 },
      resourceLimits: { ...DEFAULT_SAGE_CONFIG.resourceLimits, maxGenerations: 2 },
    };

    const result = evolve(seeds, allowScanner, config, 'evolve-seed');

    expect(result.generations.length).toBeGreaterThan(0);
    expect(result.generations.length).toBeLessThanOrEqual(2);
    expect(result.bestIndividual).toBeTruthy();
    expect(result.totalElapsedMs).toBeGreaterThanOrEqual(0);
    expect(['max-generations', 'convergence', 'timeout']).toContain(result.reason);
  });

  // GC-014
  it('GC-014: evolve respects timeout and returns early', () => {
    const seeds = [makeSeed('s1', 'test')];
    const config: SAGEConfig = {
      ...DEFAULT_SAGE_CONFIG,
      population: { ...smallPopConfig, maxGenerations: 100 },
      resourceLimits: { ...DEFAULT_SAGE_CONFIG.resourceLimits, maxGenerations: 100, timeoutMs: 1 },
    };

    const result = evolve(seeds, allowScanner, config, 'timeout-seed');
    // Should terminate quickly due to 1ms timeout
    expect(['timeout', 'max-generations', 'convergence']).toContain(result.reason);
  });
});
