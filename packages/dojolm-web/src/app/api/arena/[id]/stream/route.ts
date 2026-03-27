/**
 * File: api/arena/[id]/stream/route.ts
 * Purpose: SSE endpoint for real-time arena match event streaming
 * Story: 14.5 — Arena API Routes
 *
 * GET /api/arena/[id]/stream — Stream match events via SSE
 *
 * Security:
 * - Match ID validated with SAFE_ID regex
 * - SSE connection limit: max 50 global, 5 per IP
 * - 10min max stream duration
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import * as arenaStorage from '@/lib/storage/arena-storage';

const SAFE_ID = /^[\w-]{1,128}$/;
const MAX_STREAM_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 1000;
const MAX_GLOBAL_CONNECTIONS = 50;
const MAX_PER_IP_CONNECTIONS = 5;

// Connection tracking
const activeConnections = new Set<string>();
const ipConnectionCounts = new Map<string, number>();

// PT-RATELIM-M01 fix: Only trust proxy headers when TRUSTED_PROXY is set
function getClientIp(request: NextRequest): string {
  if (process.env.TRUSTED_PROXY) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
  }
  return 'unknown';
}

function trackConnection(connectionId: string, ip: string): boolean {
  if (activeConnections.size >= MAX_GLOBAL_CONNECTIONS) return false;
  const ipCount = ipConnectionCounts.get(ip) ?? 0;
  if (ipCount >= MAX_PER_IP_CONNECTIONS) return false;

  activeConnections.add(connectionId);
  ipConnectionCounts.set(ip, ipCount + 1);
  return true;
}

function releaseConnection(connectionId: string, ip: string): void {
  activeConnections.delete(connectionId);
  const count = ipConnectionCounts.get(ip) ?? 1;
  if (count <= 1) {
    ipConnectionCounts.delete(ip);
  } else {
    ipConnectionCounts.set(ip, count - 1);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { id: matchId } = await params;

  if (!matchId || !SAFE_ID.test(matchId)) {
    return new Response(JSON.stringify({ error: 'Invalid match ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate match exists
  const match = await arenaStorage.getMatch(matchId);
  if (!match) {
    return new Response(JSON.stringify({ error: 'Match not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Connection limiting
  const ip = getClientIp(request);
  const connectionId = `${matchId}-${Date.now()}`;

  if (!trackConnection(connectionId, ip)) {
    return new Response(JSON.stringify({ error: 'Too many concurrent streams' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let lastEventCount = match.events.length;
  const pollStart = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const closeStream = () => {
        if (closed) return;
        closed = true;
        if (pollTimer !== null) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
        releaseConnection(connectionId, ip);
        try { controller.close(); } catch { /* already closed */ }
      };

      const sendEvent = (event: string, data: unknown) => {
        if (closed) return;
        try {
          const jsonStr = JSON.stringify(data).replace(/\n/g, '\\n');
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${jsonStr}\n\n`)
          );
        } catch {
          closeStream();
        }
      };

      // Initial state
      sendEvent('connected', {
        matchId,
        status: match.status,
        eventCount: match.events.length,
      });

      const poll = async () => {
        if (closed) return;

        // Timeout check
        if (Date.now() - pollStart > MAX_STREAM_DURATION_MS) {
          sendEvent('error', { message: 'Stream timeout (10min max)' });
          closeStream();
          return;
        }

        try {
          const current = await arenaStorage.getMatch(matchId);
          if (!current) {
            sendEvent('error', { message: 'Match no longer exists' });
            closeStream();
            return;
          }

          // Send new events
          if (current.events.length > lastEventCount) {
            const newEvents = current.events.slice(lastEventCount);
            for (const event of newEvents) {
              sendEvent('match_event', event);
            }
            lastEventCount = current.events.length;
          }

          // Send status update
          sendEvent('status', {
            status: current.status,
            roundsCompleted: current.rounds.length,
            scores: current.scores,
            winnerId: current.winnerId,
          });

          // Close on terminal states
          if (current.status === 'completed' || current.status === 'aborted') {
            sendEvent('match_complete', {
              status: current.status,
              winnerId: current.winnerId,
              winReason: current.winReason,
              scores: current.scores,
              finalScores: current.scores,
              totalRounds: current.rounds.length,
            });
            closeStream();
            return;
          }

          pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        } catch (error) {
          sendEvent('error', { message: 'Internal error' });
          closeStream();
        }
      };

      poll();
    },

    cancel() {
      if (closed) return;
      closed = true;
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      releaseConnection(connectionId, ip);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
