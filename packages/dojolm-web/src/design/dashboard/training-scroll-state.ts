// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * training-scroll-state — TICKET-D201 / TrainingScroll persistence.
 *
 * Per-user localStorage state for the Shugyō Five Rites onboarding card.
 * Mirrors the YR.21 / G-014 DashboardCustomizer hardening pattern:
 *   - Closed-enum filtering on every read (unknown ids dropped — no XSS).
 *   - Versioned shape ({ v: 1 }) for forward-compat.
 *   - API_KEY_USER_ID exclusion at the write path (T8.1 lesson).
 *   - Defensive try/catch around every storage call (Safari private + quota).
 *
 * Contract: `RiteState` is the operator-locked 3-state widening of V1's
 * 2-state model (per CA-7 / TICKET-D201 spec). The on-disk persisted
 * shape stores only:
 *   - `completed`: a Set-membership list of RiteIds in done state.
 *   - `inProgress`: optionally a single RiteId in in-progress state.
 *
 * `pending` is the implicit default for any rite NOT in `completed` and
 * NOT equal to `inProgress`. This avoids storing the full Record on
 * disk + keeps the closed-enum filter dead-simple.
 */

import { useCallback, useEffect, useState } from 'react';
import { API_KEY_USER_ID, isSafeUserIdSegment } from '@/lib/api-session-client';
import {
  RITE_IDS,
  type RiteId,
  type RiteState,
  isRiteId,
  buildPendingStates,
} from './TrainingScroll';

const STORAGE_KEY_PREFIX = 'tpi.training.';
const FALLBACK_SCOPE = 'default';

export interface TrainingScrollPersisted {
  readonly v: 1;
  readonly completed: readonly RiteId[];
  readonly inProgress?: RiteId;
}

function safeUserScope(userId: string | null | undefined): string {
  if (!userId) return FALLBACK_SCOPE;
  // T8.1 fold-in — synthetic api-key user shares the default scope.
  if (userId === API_KEY_USER_ID) return FALLBACK_SCOPE;
  if (!isSafeUserIdSegment(userId)) return FALLBACK_SCOPE;
  return userId;
}

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}${safeUserScope(userId)}`;
}

function statesFromPersisted(
  persisted: TrainingScrollPersisted,
): Readonly<Record<RiteId, RiteState>> {
  const out: Record<RiteId, RiteState> = buildPendingStates();
  for (const id of persisted.completed) {
    if (isRiteId(id)) {
      out[id] = 'done';
    }
  }
  if (persisted.inProgress !== undefined && isRiteId(persisted.inProgress)) {
    if (out[persisted.inProgress] !== 'done') {
      out[persisted.inProgress] = 'in-progress';
    }
  }
  return out;
}

export function readTrainingScrollState(
  userId: string | null | undefined,
): Readonly<Record<RiteId, RiteState>> {
  if (typeof window === 'undefined') return buildPendingStates();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw === null) return buildPendingStates();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return buildPendingStates();
    }
    const candidate = parsed as Record<string, unknown>;
    if (candidate.v !== 1) return buildPendingStates();
    const completedRaw = Array.isArray(candidate.completed) ? candidate.completed : [];
    const completed: RiteId[] = [];
    for (const c of completedRaw) {
      if (isRiteId(c)) completed.push(c);
    }
    const inProgress =
      typeof candidate.inProgress === 'string' && isRiteId(candidate.inProgress)
        ? candidate.inProgress
        : undefined;
    return statesFromPersisted({ v: 1, completed, inProgress });
  } catch {
    return buildPendingStates();
  }
}

export function writeTrainingScrollState(
  userId: string | null | undefined,
  persisted: TrainingScrollPersisted,
): void {
  if (typeof window === 'undefined') return;
  try {
    // Closed-enum filter: never persist unknown ids back to disk.
    const completed = persisted.completed.filter(isRiteId);
    const inProgress =
      persisted.inProgress !== undefined && isRiteId(persisted.inProgress)
        ? persisted.inProgress
        : undefined;
    const safe: TrainingScrollPersisted = inProgress
      ? { v: 1, completed, inProgress }
      : { v: 1, completed };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(safe));
  } catch {
    // Safari private mode + quota errors swallowed — caller still sees
    // in-memory updates take effect for the rest of the session.
  }
}

export interface TrainingScrollHook {
  readonly states: Readonly<Record<RiteId, RiteState>>;
  readonly markDone: (id: RiteId) => void;
  readonly markInProgress: (id: RiteId) => void;
}

function statesToPersisted(
  states: Readonly<Record<RiteId, RiteState>>,
): TrainingScrollPersisted {
  const completed: RiteId[] = [];
  let inProgress: RiteId | undefined;
  for (const id of RITE_IDS) {
    if (states[id] === 'done') completed.push(id);
    else if (states[id] === 'in-progress' && inProgress === undefined) inProgress = id;
  }
  return inProgress ? { v: 1, completed, inProgress } : { v: 1, completed };
}

export function useTrainingScrollState(
  userId: string | null | undefined,
): TrainingScrollHook {
  const [states, setStates] = useState<Readonly<Record<RiteId, RiteState>>>(() =>
    buildPendingStates(),
  );

  useEffect(() => {
    setStates(readTrainingScrollState(userId));
  }, [userId]);

  const markDone = useCallback(
    (id: RiteId) => {
      if (!isRiteId(id)) return;
      setStates((prev) => {
        const next: Record<RiteId, RiteState> = { ...prev, [id]: 'done' };
        writeTrainingScrollState(userId, statesToPersisted(next));
        return next;
      });
    },
    [userId],
  );

  const markInProgress = useCallback(
    (id: RiteId) => {
      if (!isRiteId(id)) return;
      setStates((prev) => {
        // Only one rite carries 'in-progress' at a time — any prior
        // in-progress rite reverts to pending.
        const next: Record<RiteId, RiteState> = { ...prev };
        for (const rid of RITE_IDS) {
          if (next[rid] === 'in-progress') next[rid] = 'pending';
        }
        if (next[id] !== 'done') next[id] = 'in-progress';
        writeTrainingScrollState(userId, statesToPersisted(next));
        return next;
      });
    },
    [userId],
  );

  return { states, markDone, markInProgress };
}
