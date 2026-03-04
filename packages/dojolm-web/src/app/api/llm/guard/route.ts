/**
 * File: api/llm/guard/route.ts
 * Purpose: Guard config GET/PUT API
 * Story: TPI-UIP-11
 * Methods: GET (read config), PUT (update config)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGuardConfig, saveGuardConfig } from '@/lib/storage/guard-storage';
import { VALID_GUARD_MODES, VALID_BLOCK_THRESHOLDS } from '@/lib/guard-constants';
import type { GuardConfig } from '@/lib/guard-types';

// ===========================================================================
// GET /api/llm/guard - Read guard config
// ===========================================================================

export async function GET() {
  try {
    const config = await getGuardConfig();
    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('Error reading guard config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================================================
// PUT /api/llm/guard - Update guard config (S4: strict validation)
// ===========================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate config structure
    const config = body as Partial<GuardConfig>;

    if (typeof config.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    // Normalize old mode names for backward compat (metsuke→shinobi, ninja→samurai)
    const OLD_MODE_MAP: Record<string, string> = { metsuke: 'shinobi', ninja: 'samurai' };
    if (config.mode && OLD_MODE_MAP[config.mode]) {
      config.mode = OLD_MODE_MAP[config.mode] as GuardConfig['mode'];
    }

    if (!config.mode || !VALID_GUARD_MODES.has(config.mode)) {
      return NextResponse.json(
        { error: `mode must be one of: ${[...VALID_GUARD_MODES].join(', ')}` },
        { status: 400 }
      );
    }

    if (!config.blockThreshold || !VALID_BLOCK_THRESHOLDS.has(config.blockThreshold)) {
      return NextResponse.json(
        { error: `blockThreshold must be one of: ${[...VALID_BLOCK_THRESHOLDS].join(', ')}` },
        { status: 400 }
      );
    }

    // Validate engines array if provided (S4: non-empty if provided)
    if (config.engines !== null && config.engines !== undefined) {
      if (!Array.isArray(config.engines) || config.engines.length === 0) {
        return NextResponse.json(
          { error: 'engines must be a non-empty array or null' },
          { status: 400 }
        );
      }
      // Validate each engine ID is a safe string
      for (const engine of config.engines) {
        if (typeof engine !== 'string' || !/^[a-zA-Z0-9 \-_]+$/.test(engine)) {
          return NextResponse.json(
            { error: 'Each engine ID must be alphanumeric with spaces, hyphens, or underscores' },
            { status: 400 }
          );
        }
      }
    }

    const validatedConfig: GuardConfig = {
      enabled: config.enabled,
      mode: config.mode,
      blockThreshold: config.blockThreshold,
      engines: config.engines ?? null,
      persist: typeof config.persist === 'boolean' ? config.persist : false,
    };

    await saveGuardConfig(validatedConfig);

    return NextResponse.json({ data: validatedConfig });
  } catch (error) {
    console.error('Error saving guard config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
