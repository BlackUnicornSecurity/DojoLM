// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * Active Model Switcher (Story D + post-merge hardening 2026-05-08).
 *
 * Bridges the `activeModelStore` (localStorage, label rendering only) and the
 * httpOnly `noda-active-model` cookie that server-side inference routes
 * (Story B) read.
 *
 * Hardening fold-in:
 *   - The cookie is now SERVER-SET via POST /api/active-model. The provider
 *     no longer writes `document.cookie` — that was JS-readable and could be
 *     spoofed by an XSS payload. The endpoint attaches HttpOnly + SameSite=Lax
 *     + Secure (in prod), and the browser ignores any subsequent
 *     `document.cookie` write attempt against the same name.
 *   - One-time migration from the legacy `sensei-model` localStorage key now
 *     sets a `noda-active-model-migrated` flag and CLEARS the legacy entry
 *     so a subsequent cold mount after the user wipes their preference does
 *     not silently re-inject the stale value.
 *
 * Mounted once at the shell level. Consumers use `useActiveModel()` to
 * get/set the selected id; the localStorage label store and the server
 * cookie stay in sync.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { activeModelStore, senseiModelStore } from './index';

interface ActiveModelContextValue {
  readonly activeModelId: string;
  readonly setActiveModelId: (id: string) => void;
}

const ActiveModelContext = createContext<ActiveModelContextValue | undefined>(
  undefined,
);

const MIGRATION_FLAG_KEY = 'noda-active-model-migrated';
const ENDPOINT = '/api/active-model';

/**
 * Fire-and-forget POST to the server cookie endpoint. We deliberately
 * swallow non-OK responses: the localStorage label has already been written
 * synchronously, and the resolver chain re-validates on every request, so a
 * transient endpoint failure does not break user-visible behavior. Network
 * failures bubble through the browser's existing fetch error path.
 */
async function syncCookieRemote(id: string): Promise<void> {
  if (typeof fetch === 'undefined') return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {
    /* swallow — see jsdoc */
  }
}

/**
 * Read the migration flag from localStorage. Falsy if the legacy
 * `sensei-model` migration has never run on this device.
 */
function migrationDone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
  } catch {
    return true;
  }
}

function markMigrationDone(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch {
    /* private mode / quota — best-effort */
  }
}

function clearLegacyKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('sensei-model');
  } catch {
    /* private mode / quota — best-effort */
  }
}

export function ActiveModelProvider({ children }: { children: ReactNode }) {
  const [activeModelId, setActiveModelIdState] = useState<string>('');

  // Mount: read store, run one-time legacy migration, sync the server cookie.
  useEffect(() => {
    let initial = activeModelStore.get();

    if (!migrationDone()) {
      const legacy = senseiModelStore.get();
      if (legacy && !initial) {
        activeModelStore.set(legacy);
        initial = legacy;
      }
      // Mark migration done regardless of whether a value was migrated, so
      // subsequent cold mounts do not re-inject the legacy value if the
      // user has since cleared their `noda-active-model` entry.
      markMigrationDone();
      clearLegacyKey();
    }

    if (initial) {
      setActiveModelIdState(initial);
      void syncCookieRemote(initial);
    }
  }, []);

  const setActiveModelId = useCallback((id: string) => {
    activeModelStore.set(id);
    setActiveModelIdState(id);
    void syncCookieRemote(id);
  }, []);

  return (
    <ActiveModelContext.Provider value={{ activeModelId, setActiveModelId }}>
      {children}
    </ActiveModelContext.Provider>
  );
}

export function useActiveModel(): ActiveModelContextValue {
  const ctx = useContext(ActiveModelContext);
  if (!ctx) {
    // Fall back to a noop implementation if a consumer mounts outside the
    // provider (e.g. an isolated test). This keeps test surface minimal
    // without polluting unmount paths with provider checks.
    return {
      activeModelId: '',
      setActiveModelId: () => {},
    };
  }
  return ctx;
}
