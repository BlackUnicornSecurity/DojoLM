// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/admin/api-keys — list active keys (YR.14.2 / G-002).
 * POST /api/admin/api-keys — create a new key (show-secret-once).
 *
 * Both routes require admin role (`withAuth({ role: 'admin' })`).
 * Both emit typed audit-logger entries — no free-form `featureFlagToggle`.
 *
 * Show-secret-once contract: the POST response is the ONE place a raw
 * `sk-…` secret leaves the server. Subsequent GET / PATCH / DELETE
 * responses NEVER include the hash or the plaintext. The repo's
 * `findByIdSafe` projection enforces this at the boundary.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import {
  apiKeyRepo,
  API_KEY_SCOPES,
} from '@/lib/db/repositories/api-key.repository';
import { generateApiKey, hashApiKey } from '@/lib/api-keys/code';
import { getClientIp } from '@/lib/api-handler';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const LIST_LIMIT = 200;
// E3.S5 (F-7-007 P0) — pagination upper bound for `?limit=`. Matches the
// historical hard ceiling but is now parameterized so the API can serve
// smaller pages on demand without breaking existing 200-row consumers.
const MAX_LIMIT = 200;
const DEFAULT_PAGE_LIMIT = 50;

const createBodySchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z
    .array(z.enum(API_KEY_SCOPES as readonly [string, ...string[]]))
    .min(1)
    .max(8),
  expiresAt: z.string().datetime().optional(),
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, POST, OPTIONS' },
  });
}

export const GET = withAuth(
  async (request: NextRequest) => {
    // E3.S5 (F-7-007 P0): accept `?page=&limit=` (1-indexed). When neither
    // param is provided we keep the pre-E3.S5 behavior — a single page of
    // up to LIST_LIMIT (200) keys — so existing consumers (admin page
    // post-mount, secret rotate flow, audit harness) keep working.
    const { searchParams } = new URL(request.url);

    const rawLimit = searchParams.get('limit');
    const rawPage = searchParams.get('page');
    const rawOffset = searchParams.get('offset');

    let limit = LIST_LIMIT;
    if (rawLimit !== null) {
      const parsed = parseInt(rawLimit, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
        return NextResponse.json(
          { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
          { status: 400, headers: RESPONSE_HEADERS },
        );
      }
      // When the operator opts into paging explicitly via `?page=` we
      // default to a smaller page size so virtualization can kick in;
      // when only `?limit=` is provided we honor it directly.
      limit = parsed;
    } else if (rawPage !== null) {
      limit = DEFAULT_PAGE_LIMIT;
    }

    let offset = 0;
    if (rawOffset !== null) {
      const parsed = parseInt(rawOffset, 10);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
        return NextResponse.json(
          { error: 'offset must be a non-negative integer (max 1_000_000)' },
          { status: 400, headers: RESPONSE_HEADERS },
        );
      }
      offset = parsed;
    } else if (rawPage !== null) {
      const pageParsed = parseInt(rawPage, 10);
      if (!Number.isFinite(pageParsed) || pageParsed < 1) {
        return NextResponse.json(
          { error: 'page must be a positive integer' },
          { status: 400, headers: RESPONSE_HEADERS },
        );
      }
      offset = (pageParsed - 1) * limit;
      if (offset > 1_000_000) {
        return NextResponse.json(
          { error: 'page out of range (offset cap 1_000_000)' },
          { status: 400, headers: RESPONSE_HEADERS },
        );
      }
    }

    // The current repo seam returns at most `n` rows; we still ask for the
    // ceiling so we can slice + count locally. Future work (E3.S5
    // follow-up: see plan-spec) is to push LIMIT/OFFSET into the repo seam
    // the same way `userRepo.listUsersPaginated` does — but that requires
    // a schema migration that is out of this story's blast radius.
    const allKeys = apiKeyRepo.listActive(LIST_LIMIT);
    const total = allKeys.length;
    const paged = allKeys.slice(offset, offset + limit);
    const page = Math.floor(offset / Math.max(1, limit)) + 1;
    return NextResponse.json(
      { keys: paged, total, limit, offset, page },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  // Pass-1 code-review HIGH fold-in: drop `skipCsrf: true`. CSRF
  // enforcement only fires for POST/PUT/PATCH/DELETE in route-guard's
  // STATE_MUTATING_METHODS check; the flag was a no-op on GET that
  // could mute a future intentional CSRF tighten.
  { role: 'admin' },
);

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const operatorId = user?.id ?? '';
    if (!operatorId) {
      return NextResponse.json(
        { error: 'Operator identity required' },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const parsed = createBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const body = parsed.data;

    const id = crypto.randomUUID();
    const rawSecret = generateApiKey();
    const keyHash = hashApiKey(rawSecret);
    const createdAt = new Date().toISOString();

    const safe = apiKeyRepo.createKey({
      id,
      label: body.label,
      key_hash: keyHash,
      scopes: body.scopes,
      created_by_operator_id: operatorId,
      created_at: createdAt,
      expires_at: body.expiresAt ?? null,
    });

    await auditLog.apiKeyCreate({
      operatorId,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? '',
      keyId: id,
      scope: body.scopes,
    });

    // Show-secret-once: `key` field is the only place the raw secret
    // leaves the server. The route's caller is expected to surface it
    // to the operator exactly once and never log it.
    return NextResponse.json(
      {
        key: rawSecret,
        record: safe,
      },
      { status: 201, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);
