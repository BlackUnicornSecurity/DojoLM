/**
 * Shared state for active fingerprint runs (K4.4 SSE streaming).
 * Module-level Map tracking in-progress fingerprint sessions.
 */

import type { KagamiProgress } from 'bu-tpi/fingerprint';

export interface FingerprintSession {
  readonly id: string;
  progress: KagamiProgress | null;
  completed: boolean;
  result: unknown;
  error: string | null;
  listeners: Set<(data: string) => void>;
}

const sessions = new Map<string, FingerprintSession>();
const MAX_SESSIONS = 50;

export const activeFingerprints = {
  create(id: string): FingerprintSession {
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value;
      if (oldest !== undefined) sessions.delete(oldest);
    }
    const session: FingerprintSession = {
      id,
      progress: null,
      completed: false,
      result: null,
      error: null,
      listeners: new Set(),
    };
    sessions.set(id, session);
    return session;
  },
  get(id: string): FingerprintSession | undefined {
    return sessions.get(id);
  },
  update(id: string, progress: KagamiProgress): void {
    const s = sessions.get(id);
    if (!s) return;
    s.progress = progress;
    const data = JSON.stringify(progress);
    for (const listener of s.listeners) {
      listener(data);
    }
  },
  complete(id: string, result: unknown): void {
    const s = sessions.get(id);
    if (!s) return;
    s.completed = true;
    s.result = result;
    for (const listener of s.listeners) {
      listener(JSON.stringify({ phase: 'complete', result }));
    }
    s.listeners.clear();
  },
  fail(id: string, error: string): void {
    const s = sessions.get(id);
    if (!s) return;
    s.completed = true;
    s.error = error;
    for (const listener of s.listeners) {
      listener(JSON.stringify({ phase: 'error', error }));
    }
    s.listeners.clear();
  },
  remove(id: string): void {
    sessions.delete(id);
  },
};
