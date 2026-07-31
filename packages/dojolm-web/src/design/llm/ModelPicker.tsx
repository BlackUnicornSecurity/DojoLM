// SPDX-License-Identifier: Apache-2.0
/**
 * ModelPicker — E4.S9 design-system primitive.
 *
 * Replaces the bare `<select class="wb-select">` model dropdown across
 * `/admin/atemi`, `/admin/agentic`, etc. Retires:
 *   - F-7-019 (P1) — Sensei welcome doesn't surface missing-model
 *     precondition (the picker is now a recognizable affordance, and
 *     the SenseiChat empty branch + missing-model CTA are wired in
 *     siblings — see SenseiChat.tsx).
 *   - F-9-009 (P2) — `<select class="wb-select">` had `aria-label=null`
 *     on /admin/atemi; this picker exposes a programmatic name via the
 *     `<label htmlFor>` + visible label pattern E9.S7 established
 *     (`<RequiredAsterisk />` for required surfaces).
 *   - F-A04 form-label findings (rolling) — caller passes a visible
 *     `label` string and the primitive owns the htmlFor wiring.
 *
 * WAI-ARIA combobox pattern:
 *   - `<input role="combobox" aria-controls="…" aria-expanded
 *     aria-autocomplete="list" aria-activedescendant="…">` matches
 *     the CommandPalette idiom (see `design/shell/CommandPalette.tsx`)
 *     so AT users hit a familiar keyboard contract:
 *       ArrowDown / ArrowUp — move highlight (with wrap-around)
 *       Enter              — commit highlighted option
 *       Escape             — close listbox (input keeps focus)
 *   - `<ul role="listbox">` carries `<li role="option" aria-selected>`
 *     with stable ids referenced by `aria-activedescendant`.
 *   - Provider grouping uses non-interactive `<li role="presentation">`
 *     dividers so AT users hear the provider name without it being
 *     selectable. The actual options remain inside the same listbox
 *     (single flat structure) which is the WAI-ARIA-recommended
 *     pattern for grouped comboboxes — `aria-owns` on multiple
 *     listboxes is theoretically allowed but inconsistently supported.
 *
 * Recently-used (top 3) section:
 *   - Rendered above the grouped sections when the consumer passes
 *     `recentModelIds`. We intersect against the live model list and
 *     drop ids that no longer resolve so a stale localStorage entry
 *     can't render a phantom option.
 *
 * No Tailwind (E1.S5 prereq): inline `style={…}` + the existing
 * `.wb-input` / `.wb-field` design-system classes keep the picker
 * inside `src/design/**` discipline.
 *
 * Visible-effect anchor (V4/V5 round-2 lesson #1):
 *   - The `:focus-visible` rule for the combobox input lives in
 *     `design/styles/patterns/workbench.css` under `.wb-input`. The
 *     active option carries a 1px highlight border via inline style
 *     so the visual focus is mirrored by a structural delta, not just
 *     ARIA state. See `e7-s7-focus-visible.test.ts` for the existing
 *     pattern that asserts the rule body produces a visible effect.
 */

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { RequiredAsterisk } from '../system/RequiredAsterisk';

export interface ModelPickerOption {
  /** Stable model id (slug-style — what the API consumes). */
  readonly id: string;
  /** Display name shown in the listbox. */
  readonly name: string;
  /** Provider id used for grouping; falls back to "other". */
  readonly provider: string;
}

export interface ModelPickerProps {
  /** Visible label text (rendered above the input). */
  readonly label: string;
  /**
   * Currently-selected model id. Pass `null` when nothing is selected
   * yet — the input renders a placeholder and the listbox is empty-
   * highlighted.
   */
  readonly value: string | null;
  /** Closed list of selectable models, already filtered for permission. */
  readonly options: readonly ModelPickerOption[];
  /** Called with the chosen model id when the user commits a selection. */
  readonly onChange: (modelId: string) => void;
  /**
   * Optional MRU-first list of model ids surfaced as a "Recently used"
   * section above the grouped options. Consumers typically pass the
   * `recent` slice from `useRecentlyUsedModels()`.
   */
  readonly recentModelIds?: readonly string[];
  /**
   * When `true` the field renders the `<RequiredAsterisk />` next to the
   * label and sets `aria-required="true"` on the input. It does NOT set the
   * native `required` attribute — the visible value is the search query, not
   * the selected model, so native validation would gate on the wrong string.
   */
  readonly required?: boolean;
  /**
   * Disable the picker entirely (greys the input + skips listbox open).
   * Used by parent forms to lock state during in-flight submission.
   */
  readonly disabled?: boolean;
  /** Placeholder shown when `value === null`. */
  readonly placeholder?: string;
  /**
   * Stable test id; the primitive composes `${testId}-input`,
   * `${testId}-listbox`, `${testId}-option-${id}` for child hooks.
   */
  readonly testId?: string;
}

const OPTION_HEIGHT = 30;
const LISTBOX_MAX_HEIGHT = 240;

/**
 * Return the closed-form label for the recently-used section header.
 * Pulled out so tests can assert the exact string — important for
 * the F-9-009 retire (the section heading IS the programmatic
 * grouping name AT users hear).
 */
export function recentlyUsedHeading(): string {
  return 'Recently used';
}

/**
 * Render group order for stability: `Recently used` first (when
 * non-empty), then provider groups in alphabetical order. A stable
 * order keeps visual + ARIA tree consistent across re-renders.
 */
export function groupOptions(
  options: readonly ModelPickerOption[],
  recentIds: readonly string[],
): ReadonlyArray<{ readonly heading: string; readonly options: readonly ModelPickerOption[] }> {
  const byId = new Map(options.map((o) => [o.id, o]));
  const recent = recentIds
    .map((id) => byId.get(id))
    .filter((o): o is ModelPickerOption => o !== undefined);

  const recentSet = new Set(recent.map((r) => r.id));
  const remaining = options.filter((o) => !recentSet.has(o.id));

  const byProvider = new Map<string, ModelPickerOption[]>();
  for (const opt of remaining) {
    const key = opt.provider || 'other';
    const bucket = byProvider.get(key) ?? [];
    bucket.push(opt);
    byProvider.set(key, bucket);
  }

  const providerGroups = Array.from(byProvider.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([provider, providerOptions]) => ({
      heading: provider,
      options: providerOptions.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));

  if (recent.length === 0) return providerGroups;
  return [{ heading: recentlyUsedHeading(), options: recent }, ...providerGroups];
}

/**
 * Filter options against a free-text query (case-insensitive, matches
 * id OR name). Empty / whitespace-only query passes everything through.
 */
export function filterOptions(
  options: readonly ModelPickerOption[],
  query: string,
): readonly ModelPickerOption[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return options;
  return options.filter((o) =>
    o.id.toLowerCase().includes(trimmed)
    || o.name.toLowerCase().includes(trimmed)
    || o.provider.toLowerCase().includes(trimmed),
  );
}

const FIELD_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  position: 'relative',
};

const LISTBOX_STYLE: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 2,
  zIndex: 20,
  maxHeight: LISTBOX_MAX_HEIGHT,
  overflowY: 'auto',
  // Atemi-PR-6 dark-theme fix: previous `var(--paper)` (#F0E9D7 ivory)
  // rendered the listbox as a bright cream rectangle on every dark-theme
  // page (/admin/atemi Concept-recon panel, /admin/atemi Playbooks tab,
  // /admin/agentic, etc.) — visual mismatch flagged by founder 2026-05-22.
  // Switch to the same dark surface family that `.wb-input` /
  // `.wb-select` use, plus an explicit `color: var(--fg)` so the option
  // text inherits light-on-dark.
  background: 'var(--bg-3)',
  color: 'var(--fg)',
  border: '1px solid var(--b-1)',
  borderRadius: 'var(--r-sm)',
  padding: 0,
  margin: 0,
  listStyle: 'none',
  fontFamily: 'var(--sans)',
  fontSize: 'var(--text-base)',
  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
};

const HEADING_STYLE: CSSProperties = {
  padding: '6px 10px',
  fontSize: 'var(--text-sm)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--fg-dim)',
  fontFamily: 'var(--mono)',
  background: 'rgba(var(--black-rgb), 0.18)',
  borderBottom: '1px solid var(--b-0)',
};

const OPTION_STYLE: CSSProperties = {
  padding: '6px 10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  borderLeft: '2px solid transparent',
  height: OPTION_HEIGHT,
  boxSizing: 'border-box',
};

// V4/V5 round-2 lesson #1 — the ACTIVE option needs a visible delta,
// not just `aria-selected`. Solid border + tinted background.
const OPTION_ACTIVE_STYLE: CSSProperties = {
  ...OPTION_STYLE,
  background: 'rgba(var(--torii-rgb), 0.10)',
  borderLeft: '2px solid var(--torii)',
};

const HINT_STYLE: CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--fg-dim)',
  fontFamily: 'var(--mono)',
};

const EMPTY_STYLE: CSSProperties = {
  padding: '10px 12px',
  color: 'var(--fg-dim)',
  fontSize: 'var(--text-sm)',
};

/**
 * Compose the `${testId}-…` ids exactly. Pulled out so the parent test
 * can predict the testid graph without reaching into the implementation.
 */
function optionTestId(testId: string | undefined, modelId: string): string | undefined {
  if (!testId) return undefined;
  return `${testId}-option-${modelId}`;
}

export function ModelPicker({
  label,
  value,
  options,
  onChange,
  recentModelIds,
  required = false,
  disabled = false,
  placeholder = 'Search models…',
  testId,
}: ModelPickerProps): ReactElement {
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  // The input renders the selected model name when the listbox is
  // closed, and the live query when the listbox is open. This is the
  // standard "closed selection display" combobox idiom (Web AIM 2023
  // ARIA 1.2 Combobox Pattern §3.1).
  const inputValue = open ? query : selectedOption?.name ?? '';

  const grouped = useMemo(
    () => groupOptions(options, recentModelIds ?? []),
    [options, recentModelIds],
  );

  // Flatten the grouped tree into the same option order the listbox
  // will render. Used to compute the active descendant id from the
  // current `activeIndex` and to filter against the search query.
  const flatOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: ModelPickerOption[] = [];
    for (const group of grouped) {
      for (const opt of group.options) {
        if (seen.has(opt.id)) continue;
        seen.add(opt.id);
        out.push(opt);
      }
    }
    return out;
  }, [grouped]);

  const filteredFlat = useMemo(
    () => filterOptions(flatOptions, query),
    [flatOptions, query],
  );

  const filteredIds = useMemo(
    () => new Set(filteredFlat.map((o) => o.id)),
    [filteredFlat],
  );

  // Reset activeIndex whenever the filter changes — keeping a stale
  // index after a search would leave the highlight on a now-hidden
  // option, which is the bug WCAG SC 4.1.3 (Status Messages) calls
  // out for inconsistent aria-activedescendant.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Click-outside to close. Uses `mousedown` (not `click`) to fire
  // before any target's onClick — matches the SenseiDrawer + Workbench
  // behaviour so the listbox closes on the same gesture that triggered
  // a sibling control.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent): void {
      const node = containerRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const handleSelect = useCallback(
    (option: ModelPickerOption) => {
      onChange(option.id);
      setOpen(false);
      setQuery('');
      // Keep focus on the input after select so keyboard users can
      // immediately reopen with another keystroke. Calling .focus()
      // synchronously is safe because the listbox is the only thing
      // that just lost focus.
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
          return;
        }
        if (filteredFlat.length === 0) return;
        setActiveIndex((i) => (i + 1) % filteredFlat.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(filteredFlat.length - 1);
          return;
        }
        if (filteredFlat.length === 0) return;
        setActiveIndex((i) => (i - 1 + filteredFlat.length) % filteredFlat.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const target = filteredFlat[activeIndex];
        if (target) handleSelect(target);
        return;
      }
      if (event.key === 'Escape') {
        if (open) {
          event.preventDefault();
          setOpen(false);
          setQuery('');
        }
        return;
      }
    },
    [open, filteredFlat, activeIndex, disabled, handleSelect],
  );

  const activeOption = filteredFlat[activeIndex];
  const activeDescendant = activeOption
    ? `${listboxId}-${activeOption.id}`
    : undefined;

  return (
    <div
      ref={containerRef}
      className="wb-field"
      style={FIELD_STYLE}
      data-testid={testId}
    >
      <label htmlFor={inputId}>
        {label}
        {required && <RequiredAsterisk />}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        className="wb-input"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open ? activeDescendant : undefined}
        aria-required={required ? true : undefined}
        aria-haspopup="listbox"
        placeholder={placeholder}
        value={inputValue}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          style={LISTBOX_STYLE}
          data-testid={testId ? `${testId}-listbox` : undefined}
        >
          {filteredFlat.length === 0 ? (
            <li
              role="presentation"
              style={EMPTY_STYLE}
              data-testid={testId ? `${testId}-empty` : undefined}
            >
              No models match "{query}"
            </li>
          ) : (
            grouped.map((group, gi) => {
              const groupVisible = group.options.filter((o) => filteredIds.has(o.id));
              if (groupVisible.length === 0) return null;
              return (
                <div key={`${group.heading}-${gi}`} role="presentation">
                  <li
                    role="presentation"
                    style={HEADING_STYLE}
                    data-testid={
                      testId ? `${testId}-group-${slug(group.heading)}` : undefined
                    }
                  >
                    {group.heading}
                  </li>
                  {groupVisible.map((opt) => {
                    const isActive = activeOption?.id === opt.id;
                    const isSelected = value === opt.id;
                    return (
                      <li
                        key={opt.id}
                        id={`${listboxId}-${opt.id}`}
                        role="option"
                        aria-selected={isSelected}
                        style={isActive ? OPTION_ACTIVE_STYLE : OPTION_STYLE}
                        onMouseEnter={() => {
                          const idx = filteredFlat.findIndex((f) => f.id === opt.id);
                          if (idx >= 0) setActiveIndex(idx);
                        }}
                        onMouseDown={(e) => {
                          // mousedown not click — click would race with
                          // the input's blur which fires before the
                          // option mounts the handler in some browsers.
                          e.preventDefault();
                          handleSelect(opt);
                        }}
                        data-testid={optionTestId(testId, opt.id)}
                      >
                        <span>{opt.name}</span>
                        <span style={HINT_STYLE}>
                          {opt.provider} · {opt.id}
                        </span>
                      </li>
                    );
                  })}
                </div>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Lowercase + spaces-to-dashes — used purely for testid composition.
 * Not user-visible so we don't need a full slugifier.
 */
function slug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}
