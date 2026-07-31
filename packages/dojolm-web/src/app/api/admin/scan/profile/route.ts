// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- G-093 in v1-v2-audit/gap-matrix.md. Pass-2 confirmed
//                     no UI caller. Wire when scan-profile UI lands
//                     (cross-cuts G-066 attack-mode-selector / scanner
//                     restoration epic) or remove. Intentional retention
//                     for the YR train; deletion is a non-trivial behavior
//                     change tracked separately.
/**
 * /api/admin/scan/profile — Gap 11.4 scanner profile API.
 *
 * - GET:  resolve a jailbreak set for a given model id (diagnostic / preflight)
 * - POST: run a scan with a declared profile — Operator role.
 *
 * Telemetry: profile selection + set resolution are emitted via the
 * dojo-telemetry bridge with `scanner.profile.selected` and
 * `scanner.jailbreak_set.resolved` event types (spec §11.4).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import {
  resolveJailbreakSet,
  runScanWithProfile,
  TARGET_MODEL_IDS,
  type ScannerProfile,
  type ScannerProfileTelemetryEvent,
  type TargetModelId,
} from 'bu-tpi/attackdna';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const targetModelSchema = z.enum(
  TARGET_MODEL_IDS as unknown as [TargetModelId, ...TargetModelId[]],
);

// A profile id is user-facing metadata — constrain it the same way we do
// any filename-like identifier so it can't smuggle control chars into
// downstream logs / telemetry.
const profileIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'profileId must be [a-z0-9._-]');

const postBodySchema = z.object({
  profile: z.object({
    id: profileIdSchema,
    jailbreakSetId: targetModelSchema,
    scanOptions: z
      .object({
        engines: z.array(z.string().min(1).max(64)).max(32).optional(),
      })
      .optional(),
  }),
  target: z.object({
    id: z.string().min(1).max(128),
    inline: z.string().max(32_768).optional(),
  }),
  maxFixtures: z.number().int().min(0).max(10_000).optional(),
});

function emit(event: ScannerProfileTelemetryEvent): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/lib/dojo-telemetry') as {
      getDojoEmitter?: () => { emit?: (e: unknown) => void };
    };
    mod.getDojoEmitter?.().emit?.(event);
  } catch {
    // no-op — telemetry must never break control-plane endpoints.
  }
}

export const GET = withAuth(
  async (request: NextRequest) => {
    const url = new URL(request.url);
    const raw = url.searchParams.get('modelId');
    const parsed = targetModelSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'modelId must be one of TARGET_MODEL_IDS' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const set = await resolveJailbreakSet(parsed.data, { onTelemetry: emit });
    return NextResponse.json(
      {
        modelId: set.modelId,
        count: set.count,
        entries: set.entries.map((e) => ({
          filename: e.filename,
          targetModel: e.targetModel,
          contentHash: e.contentHash,
        })),
      },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'operator' },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    let body: z.infer<typeof postBodySchema>;
    try {
      const raw = (await request.json()) as unknown;
      body = postBodySchema.parse(raw);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues.map((e) => e.message).join('; ')
          : 'Invalid request body';
      return NextResponse.json(
        { error: message },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const profile: ScannerProfile = {
      id: body.profile.id,
      jailbreakSetId: body.profile.jailbreakSetId,
      scanOptions: body.profile.scanOptions,
    };

    // Post-#178 L-2: wrap runScanWithProfile in try/catch and surface an
    // opaque 500. Underlying error messages may include path fragments we
    // do not want to leak through the API.
    let result;
    try {
      result = await runScanWithProfile(
        { id: body.target.id, inline: body.target.inline },
        profile,
        {
          onTelemetry: emit,
          maxFixtures: body.maxFixtures,
        },
      );
    } catch {
      return NextResponse.json(
        { error: 'scan_failed' },
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        profileId: result.profileId,
        jailbreakSetId: result.jailbreakSetId,
        emptySet: result.emptySet,
        scannedCount: result.scanned.length,
        skippedCount: result.skipped.length,
        scanned: result.scanned.map((s) => ({
          filename: s.filename,
          targetModel: s.targetModel,
          verdict: s.result.verdict,
          counts: s.result.counts,
        })),
        skipped: result.skipped,
        inline: result.inline
          ? {
              verdict: result.inline.verdict,
              counts: result.inline.counts,
            }
          : null,
      },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'operator' },
);

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, POST, OPTIONS' },
  });
}
