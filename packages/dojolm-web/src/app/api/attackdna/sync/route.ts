/**
 * File: route.ts
 * Purpose: DNA Master Sync API — POST/GET/PUT /api/attackdna/sync
 * Story: KASHIWA-11.3
 * Index:
 * - Rate limiting: 1 sync per 5 minutes (line 22)
 * - POST /api/attackdna/sync — trigger sync (line 34)
 * - GET /api/attackdna/sync — sync status (line 122)
 * - PUT /api/attackdna/sync — update sync config (line 145)
 */

import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoNoOp } from '@/lib/demo/mock-api-handlers';
import { createApiHandler } from '@/lib/api-handler';
import * as masterStorage from '@/lib/storage/master-storage';
import {
  syncAllSources,
  getAvailableSourceIds,
  convertToAttackNodes,
} from 'bu-tpi/attackdna';
import * as dnaStorage from '@/lib/storage/dna-storage';

// ===========================================================================
// Rate limiting: 1 sync per 5 minutes
// ===========================================================================

const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
let lastSyncStartTime: number = 0;
let syncInProgress = false;

// ===========================================================================
// POST /api/attackdna/sync — Trigger sync
// ===========================================================================

export const POST = createApiHandler(
  async (request) => {
    if (isDemoMode()) return demoNoOp();
    // Rate limit check
    const now = Date.now();
    if (syncInProgress) {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 429 }
      );
    }
    if (now - lastSyncStartTime < SYNC_COOLDOWN_MS) {
      const remainingMs = SYNC_COOLDOWN_MS - (now - lastSyncStartTime);
      const remainingSec = Math.ceil(remainingMs / 1000);
      return NextResponse.json(
        { error: `Rate limited. Try again in ${remainingSec}s` },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const sourceParam = url.searchParams.get('source');

    // Validate source param if provided
    const availableSources = getAvailableSourceIds();
    if (sourceParam && !availableSources.includes(sourceParam)) {
      return NextResponse.json(
        { error: `Unknown source: ${sourceParam}. Available: ${availableSources.join(', ')}` },
        { status: 400 }
      );
    }

    syncInProgress = true;

    try {
      const config = await masterStorage.getSyncConfig();

      // Determine which sources to sync
      const sourcesToSync = sourceParam
        ? [sourceParam]
        : config.enabledSources.length > 0
          ? config.enabledSources
          : availableSources;

      // Get existing entries for cross-source deduplication
      const { entries: existingEntries } = await masterStorage.queryEntries({ limit: 500 });

      // Run sync pipeline
      const { entries: newEntries, syncResult } = await syncAllSources(sourcesToSync, existingEntries);

      // Store new entries
      for (const entry of newEntries) {
        await masterStorage.saveEntry(entry);
      }

      // Convert to AttackNodes for DNA graph
      const attackNodes = convertToAttackNodes(newEntries);
      for (const node of attackNodes) {
        await dnaStorage.saveNode(node);
      }

      // Update sync config with last sync time
      await masterStorage.saveSyncConfig({
        ...config,
        lastSyncAt: syncResult.syncedAt,
      });

      // Save sync result to history
      await masterStorage.addSyncResult(syncResult);

      // Set cooldown only after successful sync (failed syncs should allow retries)
      lastSyncStartTime = Date.now();

      return NextResponse.json({
        message: `Sync complete: ${syncResult.entriesClassified} entries from ${syncResult.sourcesProcessed} sources`,
        ...syncResult,
        nodesCreated: attackNodes.length,
      });
    } finally {
      syncInProgress = false;
    }
  },
  { rateLimit: 'execute' }
);

// ===========================================================================
// GET /api/attackdna/sync — Sync status
// ===========================================================================

export const GET = createApiHandler(
  async () => {
    const config = await masterStorage.getSyncConfig();
    const history = await masterStorage.getSyncHistory(5);
    const availableSources = getAvailableSourceIds();

    return NextResponse.json({
      config,
      availableSources,
      lastResult: history.length > 0 ? history[history.length - 1] : null,
      recentHistory: history,
      syncInProgress,
    });
  },
  { rateLimit: 'read' }
);

// ===========================================================================
// PUT /api/attackdna/sync — Update sync config
// ===========================================================================

const VALID_SCHEDULES = new Set(['daily', 'weekly', 'monthly', 'manual']);

export const PUT = createApiHandler(
  async (request) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const currentConfig = await masterStorage.getSyncConfig();
    const availableSources = getAvailableSourceIds();

    // Only allow toggling enabledSources and schedule — CANNOT modify URLs (R2: SecArch)
    const updates: Partial<Record<string, unknown>> = {};

    // Validate schedule
    if (Object.hasOwn(body, 'schedule')) {
      const schedule = String(body.schedule);
      if (!VALID_SCHEDULES.has(schedule)) {
        return NextResponse.json(
          { error: `Invalid schedule. Valid: ${Array.from(VALID_SCHEDULES).join(', ')}` },
          { status: 400 }
        );
      }
      updates.syncSchedule = schedule;
    }

    // Validate enabledSources
    if (Object.hasOwn(body, 'enabledSources')) {
      if (!Array.isArray(body.enabledSources)) {
        return NextResponse.json(
          { error: 'enabledSources must be an array' },
          { status: 400 }
        );
      }
      const sources = body.enabledSources as unknown[];
      const invalidSources = sources.filter(s => typeof s !== 'string' || !availableSources.includes(s));
      if (invalidSources.length > 0) {
        return NextResponse.json(
          { error: `Invalid sources: ${invalidSources.map(s => String(s).slice(0, 64)).join(', ')}. Available: ${availableSources.join(', ')}` },
          { status: 400 }
        );
      }
      updates.enabledSources = sources;
    }

    // Validate autoSyncEnabled
    if (Object.hasOwn(body, 'autoSyncEnabled')) {
      if (typeof body.autoSyncEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'autoSyncEnabled must be a boolean' },
          { status: 400 }
        );
      }
      updates.autoSyncEnabled = body.autoSyncEnabled;
    }

    // Merge with current config
    const newConfig = {
      ...currentConfig,
      ...updates,
    } as typeof currentConfig;

    await masterStorage.saveSyncConfig(newConfig);

    return NextResponse.json({
      message: 'Sync config updated',
      config: newConfig,
    });
  },
  { rateLimit: 'execute' }
);
