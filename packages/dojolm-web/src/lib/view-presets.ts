// SPDX-License-Identifier: Apache-2.0
/**
 * useViewPresets — HAGANE E3.S5 (audit minor: no saved views for
 * repeat workflows). Generic named-preset store over localStorage,
 * following the useDashboardWidgetState per-user persistence pattern:
 * payloads are validated on READ (a stale/foreign payload is dropped,
 * never applied blindly), the set is capped, and storage failures
 * surface as an error string — never a throw into render.
 */

'use client';

import { useCallback, useState } from 'react';

export const MAX_PRESETS = 12;
export const MAX_PRESET_NAME = 40;

export interface ViewPresetsApi<T> {
  readonly presets: Readonly<Record<string, T>>;
  readonly error: string | null;
  readonly save: (name: string, payload: T) => void;
  readonly remove: (name: string) => void;
}

function readAll<T>(
  storageKey: string,
  validate: (v: unknown) => v is T,
): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, T> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (k.length > 0 && k.length <= MAX_PRESET_NAME && validate(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function useViewPresets<T>(
  storageKey: string,
  validate: (v: unknown) => v is T,
): ViewPresetsApi<T> {
  const [presets, setPresets] = useState<Record<string, T>>(() =>
    typeof window === 'undefined' ? {} : readAll(storageKey, validate),
  );
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    (next: Record<string, T>) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        setPresets(next);
        setError(null);
      } catch {
        setError('Could not save preset (storage unavailable)');
      }
    },
    [storageKey],
  );

  const save = useCallback(
    (name: string, payload: T) => {
      const trimmed = name.trim().slice(0, MAX_PRESET_NAME);
      if (trimmed.length === 0) {
        setError('Preset name required');
        return;
      }
      const next = { ...presets, [trimmed]: payload };
      if (Object.keys(next).length > MAX_PRESETS) {
        setError(`Preset cap reached (${MAX_PRESETS}) — delete one first`);
        return;
      }
      persist(next);
    },
    [presets, persist],
  );

  const remove = useCallback(
    (name: string) => {
      const next = { ...presets };
      delete next[name];
      persist(next);
    },
    [presets, persist],
  );

  return { presets, error, save, remove };
}
