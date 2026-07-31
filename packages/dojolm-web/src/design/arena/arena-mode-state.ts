// SPDX-License-Identifier: Apache-2.0
'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Mode contract — relocated here when the ArenaModeStrip render component
// was retired (P4: ArenaClient renders the design's inline mode cards).
// The type + closed list stay single-sourced for state, adapters, and
// the page-local strip.
export type ArenaMode = 'all' | 'ctf' | 'koth' | 'rvb';

export const ARENA_MODES: readonly ArenaMode[] = Object.freeze([
  'all',
  'ctf',
  'koth',
  'rvb',
]);

export const ARENA_MODE_QUERY_PARAM = 'mode';

export function isArenaMode(value: unknown): value is ArenaMode {
  return typeof value === 'string'
    && (ARENA_MODES as readonly string[]).includes(value);
}

export function useArenaMode(): { mode: ArenaMode; setMode(m: ArenaMode): void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams?.get(ARENA_MODE_QUERY_PARAM) ?? 'all';
  const mode: ArenaMode = isArenaMode(raw) ? raw : 'all';
  const setMode = useCallback((next: ArenaMode) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === 'all') {
      params.delete(ARENA_MODE_QUERY_PARAM);
    } else {
      params.set(ARENA_MODE_QUERY_PARAM, next);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }, [router, pathname, searchParams]);
  return { mode, setMode };
}
