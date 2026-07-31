// SPDX-License-Identifier: Apache-2.0
/**
 * useGuardHealth — HAGANE E1.S1.
 *
 * Reads the guard block from `/api/admin/health` (two-tier route,
 * deliberately not withAuth-wrapped — YR.13.2.2) so the dashboard
 * Readiness gauge can derive its Defenses bar from the LIVE guard
 * mode instead of the retired hardcoded fixture.
 *
 * Mirrors the `useScannerStats` state-union + projector discipline in
 * CommandDashboard.tsx: malformed payloads degrade to 'error', never
 * to a guessed value (GUARDRAILS G13 honesty contract).
 */
import { useEffect, useState } from 'react';

export interface GuardHealthSignal {
  readonly enabled: boolean;
  readonly mode: string;
}

export type GuardHealthState =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly guard: GuardHealthSignal }
  | { readonly status: 'error' };

interface RawHealthResponse {
  readonly guard?: {
    readonly enabled?: unknown;
    readonly mode?: unknown;
  };
}

function projectGuard(body: RawHealthResponse): GuardHealthSignal | null {
  const guard = body.guard;
  if (!guard) return null;
  if (typeof guard.enabled !== 'boolean') return null;
  if (typeof guard.mode !== 'string' || guard.mode.length === 0) return null;
  return { enabled: guard.enabled, mode: guard.mode };
}

export function useGuardHealth(): GuardHealthState {
  const [state, setState] = useState<GuardHealthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/health', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setState({ status: 'error' });
          return;
        }
        const body = (await res.json()) as RawHealthResponse;
        if (cancelled) return;
        const guard = projectGuard(body);
        setState(guard ? { status: 'ok', guard } : { status: 'error' });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
