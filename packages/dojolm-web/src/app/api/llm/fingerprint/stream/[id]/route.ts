// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- YA.7 Jutsu fingerprint stream
/**
 * K4.4 — Kagami SSE Streaming Endpoint
 * GET /api/llm/fingerprint/stream/[id]
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { activeFingerprints } from '@/lib/fingerprint-state';
import { sseResponse } from '@/lib/sse-response';

const SAFE_ID = /^[\w-]{1,128}$/;

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
  const id = params?.id ?? '';

  if (!SAFE_ID.test(id)) {
    return new Response('Invalid ID', { status: 400 });
  }

  const session = activeFingerprints.get(id);
  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let activeListener: ((data: string) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send current state if already has progress
      if (session.progress) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(session.progress)}\n\n`));
      }

      if (session.completed) {
        if (session.error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'error', error: session.error })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'complete' })}\n\n`));
        }
        controller.close();
        return;
      }

      const listener = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          const parsed = JSON.parse(data);
          if (parsed.phase === 'complete' || parsed.phase === 'error') {
            controller.close();
          }
        } catch {
          // Stream may be closed
        }
      };

      activeListener = listener;
      session.listeners.add(listener);
    },
    cancel() {
      // Clean up listener on client disconnect to prevent memory leaks
      if (activeListener) {
        session.listeners.delete(activeListener);
        activeListener = null;
      }
    },
  });

  return sseResponse(stream);
  },
  { role: 'admin' },
);
