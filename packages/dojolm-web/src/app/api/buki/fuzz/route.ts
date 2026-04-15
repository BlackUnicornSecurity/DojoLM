/**
 * POST /api/buki/fuzz
 * Run a coverage-guided fuzz session against the Shingan scanner.
 *
 * Body: { grammar: 'prompt' | 'encoding' | 'structural', mutationCount: number }
 * Response: { results: FuzzerResult[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { getClientIp } from '@/lib/api-handler';
import {
  createFuzzSession,
  fuzz,
  PROMPT_GRAMMAR,
  ENCODING_GRAMMAR,
  STRUCTURAL_GRAMMAR,
  DEFAULT_FUZZ_CONFIG,
} from 'bu-tpi/fuzzing';
import { scanSkill } from 'bu-tpi/shingan';

const MAX_MUTATIONS = 200;
const MIN_MUTATIONS = 1;
/** Hard cap on fuzz session wall-clock time — prevents event-loop stall */
const FUZZ_TIMEOUT_MS = 25_000;

// In-memory rate limiter — 3 fuzz sessions per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

// Concurrency guard — max simultaneous fuzz sessions across all IPs
let activeSessionCount = 0;
const MAX_CONCURRENT_SESSIONS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

const GRAMMAR_MAP = {
  prompt: PROMPT_GRAMMAR,
  encoding: ENCODING_GRAMMAR,
  structural: STRUCTURAL_GRAMMAR,
} as const;

type GrammarKey = keyof typeof GRAMMAR_MAP;

function isGrammarKey(v: unknown): v is GrammarKey {
  return typeof v === 'string' && v in GRAMMAR_MAP;
}

export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — try again later' },
      { status: 429 },
    );
  }

  if (activeSessionCount >= MAX_CONCURRENT_SESSIONS) {
    return NextResponse.json(
      { error: 'Server busy — try again in a moment' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json() as { grammar?: unknown; mutationCount?: unknown };
    const { grammar, mutationCount } = body;

    if (!isGrammarKey(grammar)) {
      return NextResponse.json(
        { error: 'grammar must be one of: prompt, encoding, structural' },
        { status: 400 },
      );
    }

    const count = Number(mutationCount);
    if (!Number.isInteger(count) || count < MIN_MUTATIONS || count > MAX_MUTATIONS) {
      return NextResponse.json(
        { error: `mutationCount must be an integer between ${MIN_MUTATIONS} and ${MAX_MUTATIONS}` },
        { status: 400 },
      );
    }

    const grammarRules = GRAMMAR_MAP[grammar];

    activeSessionCount++;
    try {
      const session = createFuzzSession({
        ...DEFAULT_FUZZ_CONFIG,
        maxIterations: count,
        grammarRules,
        seed: `buki-fuzz-${grammar}-${Date.now()}`,
        timeoutMs: FUZZ_TIMEOUT_MS,
      });

      // ScannerFn adapter: scanSkill returns ScanResult which matches the required shape
      const completedSession = fuzz(session, (text) => {
        const result = scanSkill(text);
        return {
          verdict: result.verdict,
          findings: result.findings,
          counts: result.counts,
        };
      });

      const results = completedSession.results.map((r, idx) => ({
        id: `${completedSession.id}-${idx}`,
        input: r.input,
        anomalyType: r.anomalyType,
        isAnomaly: r.anomaly,
        // score: fraction of findings among all runs; use findingsCount normalised 0–1
        score: r.findingsCount > 0 ? Math.min(r.findingsCount / 10, 1) : 0,
        timestamp: completedSession.startTime,
      }));

      return NextResponse.json({ results });
    } finally {
      activeSessionCount--;
    }
  } catch (error) {
    console.error('Buki fuzz error:', error);
    return NextResponse.json({ error: 'Fuzz session failed' }, { status: 500 });
  }
}
