/**
 * File: api/arena/export/route.ts
 * Purpose: Arena match export — DNA pipeline, training data (JSONL), markdown report
 * Story: 19.1 — DNA Pipeline + Training Data Export
 *
 * POST /api/arena/export
 *   Body: { matchId: string, format: 'dna' | 'training' | 'markdown' }
 *   - dna: pushes DiscoveredVector entries to ecosystem → DNA ingestion pipeline
 *   - training: returns JSONL file for model training
 *   - markdown: returns match report as .md file
 *
 * Security:
 * - Auth required (createApiHandler)
 * - matchId sanitized (RFC 5987 filename, no user strings in Content-Disposition)
 * - Rate limited as 'execute'
 */

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api-handler';
import * as arenaStorage from '@/lib/storage/arena-storage';
import type {
  ArenaMatch,
  MatchRound,
  TrainingDataEntry,
  DiscoveredVector,
} from '@/lib/arena-types';

const SAFE_ID = /^[\w-]{1,128}$/;
const VALID_FORMATS = ['dna', 'training', 'markdown'] as const;
type ExportFormat = typeof VALID_FORMATS[number];

// ===========================================================================
// Filename sanitization (RFC 5987 — no user-supplied strings)
// ===========================================================================

function sanitizeMatchId(matchId: string): string {
  return matchId.replace(/[^\w-]/g, '_').slice(0, 128);
}

function escapeMdCell(s: string): string {
  return s.replace(/[|`<>\n\r]/g, (c) => `\\${c}`).slice(0, 200);
}

// ===========================================================================
// DNA Export — push discovered vectors to ecosystem
// ===========================================================================

async function exportToDNA(match: ArenaMatch): Promise<{ vectorCount: number }> {
  const vectors: DiscoveredVector[] = [];

  for (const round of match.rounds) {
    if (round.injectionSuccess < 0.5) continue;

    const severity = round.injectionSuccess >= 0.8 ? 'CRITICAL' as const
      : round.injectionSuccess >= 0.5 ? 'WARNING' as const
      : 'INFO' as const;

    const vector: DiscoveredVector = {
      id: crypto.randomUUID(),
      matchId: match.id,
      roundNumber: round.roundNumber,
      attackSource: round.attackSource,
      prompt: round.prompt,
      injectionSuccess: round.injectionSuccess,
      modelId: round.defenderId,
      severity,
      ...(round.attackSource.mutationStrategy
        ? { sageLineage: { parentId: round.attackSource.id, mutationStrategy: round.attackSource.mutationStrategy } }
        : {}),
      discoveredAt: round.timestamp,
    };

    vectors.push(vector);
  }

  // Emit each vector as an ecosystem finding for DNA ingestion
  if (vectors.length > 0) {
    try {
      const { saveFinding } = await import('@/lib/storage/ecosystem-storage');
      for (const vector of vectors) {
        await saveFinding({
          id: crypto.randomUUID(),
          sourceModule: 'arena',
          findingType: 'attack_variant',
          severity: vector.severity,
          timestamp: vector.discoveredAt,
          title: `Arena Export: ${vector.attackSource.type} injection (${(vector.injectionSuccess * 100).toFixed(0)}%) against ${vector.modelId}`.slice(0, 500),
          description: `Exported from match ${match.id}, round ${vector.roundNumber}. Attack source: ${vector.attackSource.type}. Injection success: ${(vector.injectionSuccess * 100).toFixed(0)}%.`.slice(0, 5000),
          evidence: vector.prompt.slice(0, 2000),
          metadata: {
            matchId: match.id,
            roundNumber: vector.roundNumber,
            attackMode: match.config.attackMode,
            gameMode: match.config.gameMode,
            injectionSuccess: vector.injectionSuccess,
            attackSourceType: vector.attackSource.type,
            defenderId: vector.modelId,
            exportedAt: new Date().toISOString(),
            ...(vector.sageLineage ? { sageLineage: vector.sageLineage } : {}),
          },
        });
      }
    } catch (error) {
      console.error('[arena-export] Failed to emit DNA findings:', error);
      throw new Error('Failed to push vectors to DNA pipeline');
    }
  }

  return { vectorCount: vectors.length };
}

// ===========================================================================
// Training Data Export — JSONL
// ===========================================================================

function exportToTraining(match: ArenaMatch): string {
  const entries: TrainingDataEntry[] = match.rounds.map((round: MatchRound) => ({
    prompt: round.prompt,
    response: round.response,
    injectionSuccess: round.injectionSuccess,
    modelId: round.defenderId,
    attackMode: match.config.attackMode,
    gameMode: match.config.gameMode,
    matchId: match.id,
    roundNumber: round.roundNumber,
    timestamp: round.timestamp,
  }));

  return entries.map(e => JSON.stringify(e)).join('\n');
}

// ===========================================================================
// Markdown Report Export
// ===========================================================================

function exportToMarkdown(match: ArenaMatch): string {
  const lines: string[] = [];

  lines.push(`# Arena Match Report`);
  lines.push('');
  lines.push(`**Match ID:** \`${match.id}\``);
  lines.push(`**Status:** ${match.status}`);
  lines.push(`**Game Mode:** ${match.config.gameMode}`);
  lines.push(`**Attack Mode:** ${match.config.attackMode}`);
  lines.push(`**Created:** ${match.createdAt}`);
  if (match.completedAt) lines.push(`**Completed:** ${match.completedAt}`);
  if (match.totalDurationMs > 0) lines.push(`**Duration:** ${(match.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('');

  // Fighters
  lines.push('## Fighters');
  lines.push('');
  lines.push('| Model | Provider | Role | Score |');
  lines.push('|-------|----------|------|-------|');
  for (const fighter of match.fighters) {
    const score = match.scores[fighter.modelId] ?? 0;
    const isWinner = fighter.modelId === match.winnerId;
    lines.push(`| ${escapeMdCell(fighter.modelName)} ${isWinner ? '(Winner)' : ''} | ${escapeMdCell(fighter.provider)} | ${fighter.initialRole} | ${score} |`);
  }
  lines.push('');

  // Result
  if (match.winnerId) {
    const winner = match.fighters.find(f => f.modelId === match.winnerId);
    lines.push(`## Result`);
    lines.push('');
    lines.push(`**Winner:** ${escapeMdCell(winner?.modelName ?? match.winnerId)}`);
    if (match.winReason) lines.push(`**Reason:** ${escapeMdCell(match.winReason)}`);
    lines.push('');
  }

  // Config
  lines.push('## Configuration');
  lines.push('');
  lines.push(`- Max Rounds: ${match.config.maxRounds}`);
  lines.push(`- Victory Points: ${match.config.victoryPoints}`);
  lines.push(`- Round Timeout: ${match.config.roundTimeoutMs}ms`);
  if (match.config.temperature !== undefined) lines.push(`- Temperature: ${match.config.temperature}`);
  if (match.config.maxTokens !== undefined) lines.push(`- Max Tokens: ${match.config.maxTokens}`);
  lines.push('');

  // Round Summary
  lines.push('## Rounds');
  lines.push('');
  if (match.rounds.length === 0) {
    lines.push('No rounds recorded.');
  } else {
    lines.push('| Round | Attacker | Defender | Injection % | Verdict | Severity |');
    lines.push('|-------|----------|----------|-------------|---------|----------|');
    for (const round of match.rounds) {
      lines.push(
        `| ${round.roundNumber} | ${escapeMdCell(round.attackerId)} | ${escapeMdCell(round.defenderId)} | ${(round.injectionSuccess * 100).toFixed(0)}% | ${round.scanVerdict} | ${round.scanSeverity ?? 'N/A'} |`
      );
    }
    lines.push('');

    // Statistics
    const successfulRounds = match.rounds.filter(r => r.injectionSuccess >= 0.5);
    const avgInjection = match.rounds.reduce((sum, r) => sum + r.injectionSuccess, 0) / match.rounds.length;
    lines.push('## Statistics');
    lines.push('');
    lines.push(`- Total Rounds: ${match.rounds.length}`);
    lines.push(`- Successful Injections: ${successfulRounds.length} (${(successfulRounds.length / match.rounds.length * 100).toFixed(0)}%)`);
    lines.push(`- Average Injection Score: ${(avgInjection * 100).toFixed(1)}%`);
    lines.push(`- Critical Rounds: ${match.rounds.filter(r => r.scanSeverity === 'CRITICAL').length}`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by DojoLM Arena on ${new Date().toISOString()}*`);

  return lines.join('\n');
}

// ===========================================================================
// POST /api/arena/export
// ===========================================================================

export const POST = createApiHandler(
  async (request: NextRequest) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }

    const { matchId, format } = body as { matchId?: string; format?: string };

    // Validate matchId
    if (!matchId || typeof matchId !== 'string') {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }
    if (!SAFE_ID.test(matchId)) {
      return NextResponse.json({ error: 'Invalid matchId format' }, { status: 400 });
    }

    // Validate format
    if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch match
    const match = await arenaStorage.getMatch(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const safeId = sanitizeMatchId(matchId);

    switch (format as ExportFormat) {
      case 'dna': {
        const result = await exportToDNA(match);
        return NextResponse.json({
          success: true,
          matchId: match.id,
          vectorCount: result.vectorCount,
          message: `${result.vectorCount} vectors pushed to DNA pipeline`,
        });
      }

      case 'training': {
        const jsonl = exportToTraining(match);
        return new NextResponse(jsonl, {
          status: 200,
          headers: {
            'Content-Type': 'application/jsonl',
            'Content-Disposition': `attachment; filename="match-${safeId}.jsonl"; filename*=UTF-8''match-${safeId}.jsonl`,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }

      case 'markdown': {
        const md = exportToMarkdown(match);
        return new NextResponse(md, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="match-${safeId}.md"; filename*=UTF-8''match-${safeId}.md`,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }
  },
  { rateLimit: 'execute' }
);
