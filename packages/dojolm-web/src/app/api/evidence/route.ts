// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/evidence — persist one immutable evidence envelope (PR-4).
 *
 * Admin-gated + CSRF-enforced (withAuth). The body is the envelope minus its
 * id (server-minted) and the server-stamped actor. Validated with the closed
 * EvidenceSubmissionSchema (.strict) so a malformed or unknown-key payload
 * (including a smuggled actor/envelopeId) is rejected, never stored. There is
 * no PUT/PATCH/DELETE — the store is append-only by design.
 */
import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/auth/route-guard';
import { getStorage } from '@/lib/storage/storage-interface';
import {
  EvidenceSubmissionSchema,
  type EvidenceActor,
  type EvidenceEnvelopeInput,
} from '@/lib/evidence/types';

/** Real same-origin signal: the browser-sent Origin's host equals the request
 *  Host. A cross-origin POST differs; a header-less (non-browser) request has
 *  no positive same-origin evidence → false. Never a fabricated constant. */
function originMatchesHost(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin === null || host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
    }

    const parsed = EvidenceSubmissionSchema.safeParse(raw);
    if (!parsed.success) {
      // Do NOT reflect the zod message verbatim — a stable code only.
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    // The `actor` block is server-authoritative — derived from the
    // authenticated request, NEVER trusted from the body. Each field is a real
    // observation (role from the verified session; csrfPresent = a CSRF token
    // was on the request; originMatched = a genuine same-origin check), so the
    // record cannot claim who/what it wasn't.
    const actor: EvidenceActor = {
      role: user.role,
      csrfPresent: request.headers.get('x-csrf-token') !== null,
      originMatched: originMatchesHost(request),
      auditRef: null,
    };
    const input: EvidenceEnvelopeInput = { ...parsed.data, actor };

    try {
      const storage = await getStorage();
      const envelope = await storage.createEvidenceEnvelope(input);
      return NextResponse.json({ envelope }, { status: 201 });
    } catch (error) {
      console.error(
        '[evidence] create failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      return NextResponse.json({ error: 'server' }, { status: 500 });
    }
  },
  { role: 'admin' },
);
