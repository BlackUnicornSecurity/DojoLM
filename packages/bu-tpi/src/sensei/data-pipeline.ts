/**
 * IKIGAI Phase 1.1: Data Pipeline
 * Extracts training data from each DojoLM subsystem into SenseiTrainingSample format.
 *
 * Each extractor reads from the existing typed interfaces (SeedEntry, TimeChamberResult, etc.)
 * and converts to the unified SenseiTrainingSample format.
 */

import { createHash } from 'node:crypto';
import type { SeedEntry } from '../sage/types.js';
import type { TimeChamberResult, ExecutedTurn } from '../timechamber/types.js';
import type { SengokuFinding } from '../sengoku/types.js';
import type { ThreatEntry } from '../threatfeed/types.js';
import type { MutationRecord, AttackNode } from '../attackdna/types.js';
import type {
  SenseiTrainingSample,
  DataSourceType,
  ExtractionStats,
  SampleQualityGrade,
} from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CONTENT_LENGTH = 10_000;
const MAX_SAMPLES_PER_SOURCE = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate deterministic ID from source type + source ID */
export function generateSampleId(sourceType: DataSourceType, sourceId: string): string {
  const hash = createHash('sha256')
    .update(`${sourceType}::${sourceId}`)
    .digest('hex')
    .slice(0, 16);
  return `sensei-${sourceType}-${hash}`;
}

/** Truncate content to safe length without cutting mid-word */
export function truncateContent(content: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  if (content.length <= maxLength) return content;
  const truncated = content.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) : truncated;
}

/** Assign quality grade based on content characteristics */
export function assessQuality(content: string, severity: string | null): SampleQualityGrade {
  if (content.length < 10) return 'rejected';
  if (content.length < 30) return 'low';
  if (severity === 'CRITICAL') return 'high';
  if (severity === 'WARNING') return 'medium';
  if (severity === 'INFO') return 'low';
  return 'medium';
}

/** Get current ISO timestamp */
function nowISO(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

/** Extract training samples from SAGE seed entries */
export function extractFromSageSeeds(seeds: readonly SeedEntry[]): readonly SenseiTrainingSample[] {
  const limited = seeds.slice(0, MAX_SAMPLES_PER_SOURCE);
  return limited.map((seed): SenseiTrainingSample => ({
    id: generateSampleId('sage-seed', seed.id),
    sourceType: 'sage-seed',
    sourceId: seed.id,
    capability: 'attack-generation',
    category: seed.category,
    severity: seed.severity,
    content: truncateContent(seed.content),
    context: `Attack type: ${seed.attackType ?? 'unknown'}`,
    expectedOutput: null,
    quality: assessQuality(seed.content, seed.severity),
    noveltyScore: 0.5,
    extractedAt: nowISO(),
    metadata: { brand: seed.brand, source: seed.source },
  }));
}

/** Extract training samples from TimeChamber results */
export function extractFromTimeChamber(
  results: readonly TimeChamberResult[],
): readonly SenseiTrainingSample[] {
  const samples: SenseiTrainingSample[] = [];

  for (const result of results) {
    if (samples.length >= MAX_SAMPLES_PER_SOURCE) break;

    // Extract the full conversation as a multi-turn planning sample
    const conversationContent = result.turns
      .map((t: ExecutedTurn) => `[${t.role}] ${truncateContent(t.sentContent, 500)}`)
      .join('\n');

    samples.push({
      id: generateSampleId('timechamber-result', result.planId),
      sourceType: 'timechamber-result',
      sourceId: result.planId,
      capability: 'multi-turn-planning',
      category: 'temporal-attack',
      severity: result.activationDetected ? 'CRITICAL' : 'WARNING',
      content: truncateContent(conversationContent),
      context: `Model: ${result.modelId}, Turns: ${result.totalTurns}, Activation: ${result.activationDetected}`,
      expectedOutput: null,
      quality: result.activationDetected ? 'high' : 'medium',
      noveltyScore: 0.6,
      extractedAt: nowISO(),
      metadata: {
        activationTurn: result.activationTurn,
        totalTurns: result.totalTurns,
        findings: [...result.findings],
      },
    });

    // Also extract individual successful turns as attack-generation samples
    for (const turn of result.turns) {
      if (samples.length >= MAX_SAMPLES_PER_SOURCE) break;
      if (turn.role !== 'attacker') continue;

      samples.push({
        id: generateSampleId('timechamber-result', `${result.planId}-turn-${turn.index}`),
        sourceType: 'timechamber-result',
        sourceId: `${result.planId}-turn-${turn.index}`,
        capability: 'attack-generation',
        category: 'temporal-attack',
        severity: turn.isActivation ? 'CRITICAL' : 'INFO',
        content: truncateContent(turn.sentContent),
        context: `Turn ${turn.index} of ${result.totalTurns}`,
        expectedOutput: turn.receivedContent.length > 0 ? truncateContent(turn.receivedContent, 500) : null,
        quality: turn.isActivation ? 'high' : 'low',
        noveltyScore: 0.4,
        extractedAt: nowISO(),
        metadata: { scanResult: turn.scanResult },
      });
    }
  }

  return samples;
}

/** Extract training samples from Sengoku findings */
export function extractFromSengokuFindings(
  findings: readonly SengokuFinding[],
): readonly SenseiTrainingSample[] {
  const limited = findings.slice(0, MAX_SAMPLES_PER_SOURCE);
  return limited.map((finding): SenseiTrainingSample => ({
    id: generateSampleId('sengoku-finding', finding.id),
    sourceType: 'sengoku-finding',
    sourceId: finding.id,
    capability: 'attack-generation',
    category: finding.category,
    severity: finding.severity,
    content: truncateContent(finding.attackPayload),
    context: `Regression: ${finding.isRegression}, New: ${finding.isNew}`,
    expectedOutput: truncateContent(finding.response, 500),
    quality: finding.severity === 'CRITICAL' ? 'high' : 'medium',
    noveltyScore: finding.isNew ? 0.8 : 0.3,
    extractedAt: nowISO(),
    metadata: { hash: finding.hash, firstSeenRunId: finding.firstSeenRunId },
  }));
}

/** Extract training samples from ThreatFeed entries */
export function extractFromThreatFeed(
  entries: readonly ThreatEntry[],
): readonly SenseiTrainingSample[] {
  const limited = entries.slice(0, MAX_SAMPLES_PER_SOURCE);
  return limited
    .filter((entry) => entry.rawContent.length >= 10)
    .map((entry): SenseiTrainingSample => ({
      id: generateSampleId('threatfeed-entry', entry.id),
      sourceType: 'threatfeed-entry',
      sourceId: entry.id,
      capability: 'attack-generation',
      category: entry.classifiedType ?? 'unclassified',
      severity: entry.severity,
      content: truncateContent(entry.rawContent),
      context: `Source: ${entry.sourceId}, Title: ${entry.title}`,
      expectedOutput: null,
      quality: assessQuality(entry.rawContent, entry.severity),
      noveltyScore: entry.confidence,
      extractedAt: nowISO(),
      metadata: {
        indicators: entry.indicators,
        extractedPatterns: entry.extractedPatterns,
      },
    }));
}

/** Extract training samples from AttackDNA mutation records */
export function extractFromAttackDNA(
  mutations: readonly MutationRecord[],
  nodeMap: ReadonlyMap<string, AttackNode>,
): readonly SenseiTrainingSample[] {
  const samples: SenseiTrainingSample[] = [];

  for (const mutation of mutations) {
    if (samples.length >= MAX_SAMPLES_PER_SOURCE) break;

    const parentNode = nodeMap.get(mutation.parentId);
    const childNode = nodeMap.get(mutation.childId);

    if (!parentNode || !childNode) continue;

    samples.push({
      id: generateSampleId('attackdna-mutation', mutation.id),
      sourceType: 'attackdna-mutation',
      sourceId: mutation.id,
      capability: 'attack-mutation',
      category: parentNode.category,
      severity: parentNode.severity,
      content: truncateContent(parentNode.content),
      context: `Mutation: ${mutation.type}, Similarity: ${mutation.similarity.toFixed(2)}`,
      expectedOutput: truncateContent(childNode.content),
      quality: mutation.similarity > 0.5 ? 'high' : 'medium',
      noveltyScore: 1 - mutation.similarity,
      extractedAt: nowISO(),
      metadata: {
        mutationType: mutation.type,
        changes: mutation.changes,
        similarity: mutation.similarity,
      },
    });
  }

  return samples;
}

// ---------------------------------------------------------------------------
// Pipeline Orchestrator
// ---------------------------------------------------------------------------

export interface PipelineInput {
  readonly sageSeeds?: readonly SeedEntry[];
  readonly timeChamberResults?: readonly TimeChamberResult[];
  readonly sengokuFindings?: readonly SengokuFinding[];
  readonly threatFeedEntries?: readonly ThreatEntry[];
  readonly attackDNAMutations?: readonly MutationRecord[];
  readonly attackDNANodes?: ReadonlyMap<string, AttackNode>;
}

export interface PipelineOutput {
  readonly samples: readonly SenseiTrainingSample[];
  readonly stats: readonly ExtractionStats[];
  readonly totalExtracted: number;
}

/** Run the full extraction pipeline across all available data sources */
export function runExtractionPipeline(input: PipelineInput): PipelineOutput {
  const allSamples: SenseiTrainingSample[] = [];
  const stats: ExtractionStats[] = [];

  // Extract from each source
  const extractors: Array<{
    sourceType: DataSourceType;
    extract: () => readonly SenseiTrainingSample[];
  }> = [
    {
      sourceType: 'sage-seed',
      extract: () => (input.sageSeeds ? extractFromSageSeeds(input.sageSeeds) : []),
    },
    {
      sourceType: 'timechamber-result',
      extract: () =>
        input.timeChamberResults ? extractFromTimeChamber(input.timeChamberResults) : [],
    },
    {
      sourceType: 'sengoku-finding',
      extract: () =>
        input.sengokuFindings ? extractFromSengokuFindings(input.sengokuFindings) : [],
    },
    {
      sourceType: 'threatfeed-entry',
      extract: () =>
        input.threatFeedEntries ? extractFromThreatFeed(input.threatFeedEntries) : [],
    },
    {
      sourceType: 'attackdna-mutation',
      extract: () =>
        input.attackDNAMutations && input.attackDNANodes
          ? extractFromAttackDNA(input.attackDNAMutations, input.attackDNANodes)
          : [],
    },
  ];

  for (const { sourceType, extract } of extractors) {
    const extracted = extract();
    const beforeDedup = extracted.length;

    allSamples.push(...extracted);

    stats.push({
      sourceType,
      totalExtracted: beforeDedup,
      duplicatesRemoved: 0,
      qualityFiltered: 0,
      retained: extracted.length,
      extractedAt: nowISO(),
    });
  }

  return {
    samples: allSamples,
    stats,
    totalExtracted: allSamples.length,
  };
}
