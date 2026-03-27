/**
 * File: arena-runner.ts
 * Purpose: Background execution runner for Arena matches
 * Story: 14.5 — Arena API Routes
 *
 * Starts newly created matches, persists live progress for SSE consumers,
 * and finalizes warrior cards + ecosystem findings after completion.
 *
 * Index:
 * - scheduleArenaMatchStart() (line 32)
 * - runArenaMatch() (line 41)
 * - loadFighterModels() (line 78)
 * - abortMatchWithError() (line 182)
 */

import crypto from 'node:crypto';
import { ALL_SKILLS } from './adversarial-skills-extended';
import { executeMatch } from './arena-engine';
import { emitMatchCompleteFinding, emitRoundFinding } from './arena-ecosystem';
import type { ArenaMatch, MatchConfig, MatchEvent, MatchEventType, MatchFighter } from './arena-types';
import { scanResponse } from './llm-execution';
import { getProviderAdapter } from './llm-providers';
import { calculateInjectionSuccess } from './llm-scoring';
import type { LLMModelConfig } from './llm-types';
import * as arenaStorage from './storage/arena-storage';
import { getStorage } from './storage/storage-interface';

const DEFAULT_MAX_TOKENS = 4096;
const SCHEDULE_DELAY_MS = 0;
const LIVE_PERSIST_EVENTS = new Set<MatchEventType>([
  'match_start',
  'round_start',
  'attack_sent',
  'fighter_error',
  'match_end',
]);
const LOCAL_PROVIDER_TYPES = new Set(['ollama', 'lmstudio', 'llamacpp']);

export function scheduleArenaMatchStart(matchId: string): void {
  setTimeout(() => {
    void runArenaMatch(matchId).catch((error) => {
      console.error(`[arena-runner] Match ${matchId} failed:`, error);
    });
  }, SCHEDULE_DELAY_MS);
}

export async function runArenaMatch(matchId: string): Promise<void> {
  const pendingMatch = await arenaStorage.getMatch(matchId);
  if (!pendingMatch || pendingMatch.status !== 'pending') {
    return;
  }

  const startedAt = pendingMatch.startedAt ?? new Date().toISOString();
  const runningMatch = await arenaStorage.updateMatch(matchId, {
    status: 'running',
    startedAt,
    completedAt: null,
    winReason: null,
    winnerId: null,
  });

  if (!runningMatch) {
    throw new Error(`Failed to start arena match: ${matchId}`);
  }

  let finalMatch: ArenaMatch;

  try {
    const fighterModels = await loadFighterModels(runningMatch);
    let emittedRoundCount = runningMatch.rounds.length;
    let persistQueue: Promise<void> = Promise.resolve();

    const queuePersist = (currentMatch: ArenaMatch, emitRoundFindingsForNewRounds: boolean): Promise<void> => {
      const snapshot = cloneMatch(currentMatch);

      persistQueue = persistQueue
        .catch(() => undefined)
        .then(async () => {
          const updated = await arenaStorage.updateMatch(snapshot.id, snapshot);
          if (!updated) {
            throw new Error(`Failed to persist arena match: ${snapshot.id}`);
          }

          if (!emitRoundFindingsForNewRounds) {
            return;
          }

          for (let i = emittedRoundCount; i < snapshot.rounds.length; i++) {
            emitRoundFinding(snapshot, snapshot.rounds[i]);
          }
          emittedRoundCount = snapshot.rounds.length;
        });

      return persistQueue;
    };

    finalMatch = await executeMatch(runningMatch, {
      executeLLM: async (modelId: string, prompt: string, config: MatchConfig) => {
        const model = fighterModels.get(modelId);
        if (!model) {
          throw new Error(`Configured fighter model not found: ${modelId}`);
        }

        const fighter = getFighterByModelId(runningMatch.fighters, modelId);
        const adapter = await getProviderAdapter(model.provider);
        const request = {
          prompt,
          maxTokens: fighter.maxTokens ?? config.maxTokens ?? model.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: fighter.temperature ?? config.temperature ?? model.temperature,
          topP: model.topP,
          timeout: model.requestTimeout ?? config.roundTimeoutMs,
        };

        let response;
        try {
          response = await adapter.execute(model, request);
        } catch (error) {
          const fallbackModel = await getLoopbackFallbackModel(model, adapter);
          if (!fallbackModel) {
            throw error;
          }

          try {
            response = await adapter.execute(fallbackModel, request);
            fighterModels.set(modelId, fallbackModel);
          } catch (fallbackError) {
            throw new Error([
              getErrorMessage(error),
              `Loopback fallback ${fallbackModel.baseUrl} failed: ${getErrorMessage(fallbackError)}`,
            ].join(' | '));
          }
        }

        if (response.filtered) {
          return {
            text: `[FILTERED] ${response.filterReason ?? 'Content was filtered by the provider'}`,
            durationMs: response.durationMs,
          };
        }

        return {
          text: response.text,
          durationMs: response.durationMs,
        };
      },
      scanResponse: (prompt: string, text: string) => {
        const result = scanResponse(text);
        return {
          verdict: result.verdict,
          severity: result.severity,
          injectionSuccess: calculateInjectionSuccess(prompt, text),
        };
      },
      getSkills: () => ALL_SKILLS,
      getArmoryPayloads: () => [],
      getAtemiPayloads: () => [],
      persistRound: async (match: ArenaMatch) => {
        await queuePersist(match, true);
      },
      onEvent: (event: MatchEvent) => {
        if (!LIVE_PERSIST_EVENTS.has(event.type)) {
          return;
        }
        void queuePersist(runningMatch, false).catch((error) => {
          console.error(`[arena-runner] Failed live event persist for ${matchId}:`, error);
        });
      },
      isAborted: async () => {
        const current = await arenaStorage.getMatch(matchId);
        return current?.status === 'aborted';
      },
    });
  } catch (error) {
    await abortMatchWithError(matchId, error);
    throw error;
  }

  finalMatch = await syncAbortedMatchMetadata(finalMatch);

  if (finalMatch.status === 'completed') {
    try {
      await updateWarriorCards(finalMatch);
    } catch (error) {
      console.error(`[arena-runner] Failed warrior update for ${matchId}:`, error);
    }
  }

  emitMatchCompleteFinding(finalMatch);
}

async function loadFighterModels(match: ArenaMatch): Promise<Map<string, LLMModelConfig>> {
  const storage = await getStorage();
  const configs = await Promise.all(
    match.fighters.map(async (fighter) => ({
      fighter,
      model: await storage.getModelConfig(fighter.modelId),
    }))
  );

  const models = new Map<string, LLMModelConfig>();
  for (const entry of configs) {
    if (!entry.model) {
      throw new Error(`Configured fighter model not found: ${entry.fighter.modelId}`);
    }
    if (!entry.model.enabled) {
      throw new Error(`Configured fighter model is disabled: ${entry.fighter.modelId}`);
    }
    models.set(entry.fighter.modelId, entry.model);
  }

  return models;
}

async function updateWarriorCards(match: ArenaMatch): Promise<void> {
  const isDraw = !match.winnerId;

  for (const fighter of match.fighters) {
    await arenaStorage.updateWarriorAfterMatch(
      fighter.modelId,
      fighter.modelName,
      fighter.provider,
      !isDraw && fighter.modelId === match.winnerId,
      isDraw,
      match.scores[fighter.modelId] ?? 0,
      match.config.gameMode,
    );
  }
}

async function abortMatchWithError(matchId: string, error: unknown): Promise<void> {
  const existing = await arenaStorage.getMatch(matchId);
  if (!existing || existing.status === 'completed' || existing.status === 'aborted') {
    return;
  }

  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const round = existing.rounds.length;
  const failureEvent = createRunnerEvent(matchId, round, 'fighter_error', {
    error: message,
  });
  const endEvent = createRunnerEvent(matchId, round, 'match_end', {
    winnerId: null,
    winReason: 'execution_error',
    finalScores: { ...existing.scores },
  });

  const abortedMatch = await arenaStorage.updateMatch(matchId, {
    status: 'aborted',
    completedAt: timestamp,
    totalDurationMs: existing.rounds.reduce((sum, currentRound) => sum + currentRound.durationMs, 0),
    winReason: 'execution_error',
    metadata: {
      ...existing.metadata,
      error: message,
    },
    events: [...existing.events, failureEvent, endEvent],
  });

  if (abortedMatch) {
    emitMatchCompleteFinding(abortedMatch);
  }
}

function createRunnerEvent(
  matchId: string,
  round: number,
  type: MatchEventType,
  data: Record<string, unknown>,
): MatchEvent {
  return {
    id: crypto.randomUUID(),
    matchId,
    round,
    timestamp: new Date().toISOString(),
    type,
    fighterId: '',
    role: 'attacker',
    data,
  };
}

function getFighterByModelId(fighters: MatchFighter[], modelId: string): MatchFighter {
  const fighter = fighters.find((entry) => entry.modelId === modelId);
  if (!fighter) {
    throw new Error(`Arena fighter not found for model: ${modelId}`);
  }
  return fighter;
}

function cloneMatch(match: ArenaMatch): ArenaMatch {
  return JSON.parse(JSON.stringify(match)) as ArenaMatch;
}

async function getLoopbackFallbackModel(
  model: LLMModelConfig,
  adapter: Awaited<ReturnType<typeof getProviderAdapter>>,
): Promise<LLMModelConfig | null> {
  if (!LOCAL_PROVIDER_TYPES.has(model.provider) || !model.baseUrl) {
    return null;
  }

  const fallbackUrl = toLoopbackUrl(model.baseUrl);
  if (!fallbackUrl || fallbackUrl === model.baseUrl) {
    return null;
  }

  const fallbackModel: LLMModelConfig = {
    ...model,
    baseUrl: fallbackUrl,
  };

  const canReachLoopback = await adapter.testConnection(fallbackModel).catch(() => false);
  return canReachLoopback ? fallbackModel : null;
}

function toLoopbackUrl(baseUrl: string): string | null {
  try {
    const parsed = new URL(baseUrl);
    if (!isPrivateIpv4(parsed.hostname) || isLoopbackHost(parsed.hostname)) {
      return null;
    }
    parsed.hostname = '127.0.0.1';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function syncAbortedMatchMetadata(match: ArenaMatch): Promise<ArenaMatch> {
  if (match.status !== 'aborted') {
    return match;
  }

  const lastError = [...match.events]
    .reverse()
    .find((event) => event.type === 'fighter_error' && typeof event.data?.error === 'string')
    ?.data.error;

  if (typeof lastError !== 'string' || match.metadata.error === lastError) {
    return match;
  }

  const updated = await arenaStorage.updateMatch(match.id, {
    metadata: {
      ...match.metadata,
      error: lastError,
    },
  });

  return updated ?? match;
}
