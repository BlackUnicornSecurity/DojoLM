// SPDX-License-Identifier: Apache-2.0
/**
 * AtemiAttackLogPanel — Atemi-PR-1 consumer wiring for the
 * `AttackLog` design primitive (`@/design/adversarial/AttackLog`).
 *
 * Reads recorded sessions from `atemi-session-storage.ts`, flattens
 * events into the closed-enum `AttackLogEntry[]` shape via
 * `sessionsToAttackLogEntries()`, mounts the primitive. Pure
 * presentational once the data load completes.
 *
 * Mounted in `AtemiTabs.tsx` SessionsTab below the existing aggregate
 * probe-history table. Per the AttackLog primitive's module-doc, the
 * primitive itself ships the chrome; wiring is the consumer's
 * responsibility.
 *
 * Storage hydration is client-only (localStorage), so this is a
 * `'use client'` component. The fetch path runs once on mount; future
 * Atemi-PR-N could add a refresh handler or a session-storage event
 * listener to re-hydrate when a new session lands. Out of scope for
 * PR-1.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AttackLog } from '@/design/adversarial/AttackLog';
import { loadSessions } from '@/lib/atemi-session-storage';
import type { AtemiSession } from '@/lib/atemi-session-types';
import { sessionsToAttackLogEntries } from './attack-log-mapping';

interface AtemiAttackLogPanelProps {
  /** Optional override — when present, panel uses these sessions
   *  instead of loading from localStorage. Test-only.
   */
  readonly sessionsOverride?: readonly AtemiSession[];
  /** Test id stem forwarded to the AttackLog primitive. */
  readonly testId?: string;
}

export function AtemiAttackLogPanel({
  sessionsOverride,
  testId = 'atemi-attack-log',
}: AtemiAttackLogPanelProps) {
  const [sessions, setSessions] = useState<readonly AtemiSession[]>(
    sessionsOverride ?? [],
  );
  const [loaded, setLoaded] = useState(sessionsOverride !== undefined);

  useEffect(() => {
    if (sessionsOverride !== undefined) return;
    // localStorage access is sync; wrap in try/catch defensively in case
    // a hostile JSON shape slips past `loadSessions`'s own narrowing.
    try {
      const loaded = loadSessions();
      setSessions(loaded);
    } catch {
      setSessions([]);
    } finally {
      setLoaded(true);
    }
  }, [sessionsOverride]);

  const entries = useMemo(
    () => sessionsToAttackLogEntries(sessions),
    [sessions],
  );

  // Don't render the primitive on the first frame before hydration —
  // SSR / hydration mismatch protection. localStorage is undefined on
  // the server, and AttackLog renders its own empty-state when
  // entries is empty.
  if (!loaded) {
    return (
      <div
        data-testid={`${testId}-loading`}
        className="wb-hint"
        style={{ padding: '8px 0', fontSize: 12, color: 'var(--fg-mute)' }}
      >
        Loading attack log…
      </div>
    );
  }

  return (
    <AttackLog
      entries={entries}
      caption={
        sessions.length === 0
          ? 'No recorded sessions yet'
          : `Attack log across ${sessions.length} recorded session${sessions.length === 1 ? '' : 's'}`
      }
      testId={testId}
    />
  );
}
