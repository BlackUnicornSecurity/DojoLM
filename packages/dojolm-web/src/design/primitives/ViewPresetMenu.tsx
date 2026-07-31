// SPDX-License-Identifier: Apache-2.0
/**
 * ViewPresetMenu — HAGANE E3.S5. Inline saved-views cluster for filter
 * surfaces: apply a named preset, save the current view, delete one.
 *
 * Component-scope hallmark states (sync-storage component — the async
 * states degrade per contract): default (no presets → Save only) ·
 * hover/focus/active via .btn tokens · disabled (busy never applies —
 * sync) · error (storage/cap failures from the hook, role=alert) ·
 * success (transient saved-confirmation, role=status). Tokens only.
 */

"use client";

import { useId, useState, type ReactElement } from "react";

export interface ViewPresetMenuProps<T> {
  readonly presets: Readonly<Record<string, T>>;
  readonly error: string | null;
  readonly onApply: (payload: T) => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (name: string) => void;
  readonly testId?: string;
}

export function ViewPresetMenu<T>({
  presets,
  error,
  onApply,
  onSave,
  onDelete,
  testId = "view-presets",
}: ViewPresetMenuProps<T>): ReactElement {
  const selectId = useId();
  const [picked, setPicked] = useState("");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const names = Object.keys(presets).sort();

  return (
    <div
      role="group"
      aria-label="Saved views"
      data-testid={testId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {names.length > 0 && (
        <>
          <label htmlFor={selectId} className="wb-hint">
            Saved view
          </label>
          <select
            id={selectId}
            className="wb-input"
            style={{ width: "auto" }}
            value={picked}
            onChange={(e) => {
              const n = e.target.value;
              setPicked(n);
              setSaved(null);
              if (n !== "" && presets[n] !== undefined) onApply(presets[n]);
            }}
            data-testid={`${testId}-select`}
          >
            <option value="">— pick —</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {picked !== "" && (
            <button
              type="button"
              className="btn sm btn-ghost"
              onClick={() => {
                onDelete(picked);
                setPicked("");
              }}
              data-testid={`${testId}-delete`}
            >
              Delete
            </button>
          )}
        </>
      )}
      {!naming ? (
        <button
          type="button"
          className="btn sm btn-ghost"
          onClick={() => {
            setNaming(true);
            setSaved(null);
          }}
          data-testid={`${testId}-save-open`}
        >
          Save view…
        </button>
      ) : (
        <>
          <input
            className="wb-input"
            autoComplete="off"
            style={{ width: 140 }}
            placeholder="Preset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Preset name"
            data-testid={`${testId}-name`}
          />
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              onSave(name);
              setSaved(name.trim());
              setName("");
              setNaming(false);
            }}
            data-testid={`${testId}-save`}
          >
            Save
          </button>
          <button
            type="button"
            className="btn sm btn-ghost"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </button>
        </>
      )}
      {error !== null && (
        <span role="alert" className="chip red" data-testid={`${testId}-error`}>
          {error}
        </span>
      )}
      {saved !== null && error === null && (
        <span
          role="status"
          className="chip jade"
          data-testid={`${testId}-saved`}
        >
          Saved “{saved}”
        </span>
      )}
    </div>
  );
}
