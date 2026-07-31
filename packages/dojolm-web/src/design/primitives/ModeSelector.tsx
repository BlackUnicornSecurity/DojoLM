// SPDX-License-Identifier: Apache-2.0
'use client';

// B.5 anchor primitive — ModeSelector. V1-restoration mutually-exclusive
// mode selector. One primitive, three variants behind a shared API:
//
//   variant="rich"     2–5 cards · icon + title + description · Atemi /
//                      Hattori 4-mode pattern. Active card highlighted
//                      with tone-colored border + tinted surface.
//   variant="compact"  exactly 2 pills · title-only · Kagami
//                      Identify/Verify 2-mode toggle.
//   variant="dense"    3–6 cards · narrower padding · no description
//                      column · 5+ modes in tight space.
//
// ARIA radio pattern (NOT button-group) per W3C ARIA APG
// https://www.w3.org/WAI/ARIA/apg/patterns/radio/ — container carries
// role="radiogroup" + aria-label; items carry role="radio" +
// aria-checked. Keyboard nav: arrow keys cycle (wrap at ends),
// Space/Enter select focused, Home/End jump to first/last, disabled
// items are skipped in the cycle. Only the active item is in the tab
// order (tabIndex=0); others get tabIndex=-1 so Tab enters and exits
// the group as a single stop.
//
// Active-state default is `tone="steel"` (Atemi V1 used blue);
// `tone="torii"` for modules whose semantic is destructive/critical
// (e.g. Hattori block-out vs block-in posture switch).
//
// Helper text below the group crossfades on change via a React key
// remount + CSS fadeIn keyframe. `prefers-reduced-motion: reduce`
// disables every transition + keyframe.
//
// Controlled-only. Consumer owns `active`. There is no internal state
// fallback — this mirrors SegmentedSubTabs / HattoriGuardModes and
// avoids the controlled/uncontrolled hybrid trap.

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from 'react';

import { I } from '@/design/shell/icons';

// ─── Public API ──────────────────────────────────────────────────────────────

export type ModeSelectorVariant = 'rich' | 'compact' | 'dense';
export type ModeSelectorTone = 'steel' | 'torii';

export interface ModeSelectorItem {
  /** Stable id used as the radio value + onChange payload. */
  readonly id: string;
  /** Visible primary text (e.g. "Samurai"). */
  readonly title: string;
  /** Optional rich-variant card subtitle. Hidden in compact. */
  readonly description?: string;
  /** Optional helper-text override; takes precedence over description
   *  when populating the row-below helper line. */
  readonly helperText?: string;
  /** Optional icon (left-of-title in rich/dense; omitted in compact). */
  readonly icon?: keyof typeof I;
  /** When true, the item is rendered with disabled styling and skipped
   *  in arrow-key navigation. */
  readonly disabled?: boolean;
}

export interface ModeSelectorProps {
  /** Mode definitions. Length depends on variant (see range constants). */
  readonly items: readonly ModeSelectorItem[];
  /** Active item id. Controlled — consumer owns this state. */
  readonly active: string;
  /** Selection callback. Fires with the new id whenever a non-disabled
   *  item is chosen via click, arrow nav + Space/Enter, or Home/End. */
  readonly onChange: (id: string) => void;
  /** Accessible name for the radiogroup. Either this OR ariaLabelledBy
   *  must be provided (the radio pattern requires a label). */
  readonly ariaLabel?: string;
  /** External label id reference (e.g. a heading above the group).
   *  Takes precedence over ariaLabel when both are supplied. */
  readonly ariaLabelledBy?: string;
  /** Visual variant. When omitted, defaults to `'compact'` for
   *  `items.length === 2` and `'rich'` otherwise. */
  readonly variant?: ModeSelectorVariant;
  /** Active-state accent. Defaults to `'steel'`. */
  readonly tone?: ModeSelectorTone;
  /** When true (default), renders the helper-text row below the group
   *  using the active item's `helperText ?? description`. */
  readonly showHelperText?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

// ─── Range bounds (per spec B.5 §Variants) ───────────────────────────────────

export const MODE_SELECTOR_RICH_MIN = 2;
export const MODE_SELECTOR_RICH_MAX = 5;
export const MODE_SELECTOR_COMPACT_LEN = 2;
export const MODE_SELECTOR_DENSE_MIN = 3;
export const MODE_SELECTOR_DENSE_MAX = 6;

// ─── Dev-only range warnings (one-shot per offending (variant,count) pair) ───

const warnedCounts = new Set<string>();
let warnedMissingLabel = false;

export const __modeSelectorResetWarningsForTest = () => {
  warnedCounts.clear();
  warnedMissingLabel = false;
};

function isDev(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
}

function warnRange(variant: ModeSelectorVariant, count: number): void {
  if (!isDev()) return;
  let ok = false;
  if (variant === 'rich') ok = count >= MODE_SELECTOR_RICH_MIN && count <= MODE_SELECTOR_RICH_MAX;
  else if (variant === 'compact') ok = count === MODE_SELECTOR_COMPACT_LEN;
  else if (variant === 'dense') ok = count >= MODE_SELECTOR_DENSE_MIN && count <= MODE_SELECTOR_DENSE_MAX;
  if (ok) return;
  const key = `${variant}:${count}`;
  if (warnedCounts.has(key)) return;
  warnedCounts.add(key);
  const bound =
    variant === 'rich' ? `[${MODE_SELECTOR_RICH_MIN}, ${MODE_SELECTOR_RICH_MAX}]`
    : variant === 'compact' ? `exactly ${MODE_SELECTOR_COMPACT_LEN}`
    : `[${MODE_SELECTOR_DENSE_MIN}, ${MODE_SELECTOR_DENSE_MAX}]`;
  console.warn(
    `[ModeSelector] variant="${variant}" items.length=${count} is outside the supported range (${bound}). ` +
      'Anchor primitive spec B.5 reserves this control for fixed-size mutually-exclusive mode groups; ' +
      'outside that range, reach for SegmentedSubTabs (peer-view navigation) or PillTabs (filter chips) instead.',
  );
}

function warnMissingLabel(): void {
  if (!isDev()) return;
  if (warnedMissingLabel) return;
  warnedMissingLabel = true;
  console.warn(
    '[ModeSelector] neither `ariaLabel` nor `ariaLabelledBy` was provided. ' +
      'The ARIA radio pattern requires an accessible name on the radiogroup container. ' +
      'Falling back to the generic label "Select mode" — supply a module-scoped name ' +
      '(e.g. "Atemi attack mode", "Hattori guard mode") for screen-reader users.',
  );
}

function pickVariant(explicit: ModeSelectorVariant | undefined, count: number): ModeSelectorVariant {
  if (explicit) return explicit;
  return count === MODE_SELECTOR_COMPACT_LEN ? 'compact' : 'rich';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ModeSelector({
  items,
  active,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  variant: variantProp,
  tone = 'steel',
  showHelperText = true,
  className,
  testId,
}: ModeSelectorProps) {
  const variant = pickVariant(variantProp, items.length);
  const itemRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  useEffect(() => {
    warnRange(variant, items.length);
  }, [variant, items.length]);

  useEffect(() => {
    if (!ariaLabel && !ariaLabelledBy) warnMissingLabel();
  }, [ariaLabel, ariaLabelledBy]);

  const setItemRef = useCallback(
    (id: string) => (node: HTMLButtonElement | null) => {
      if (node) itemRefs.current.set(id, node);
      else itemRefs.current.delete(id);
    },
    [],
  );

  // ARIA radio pattern: arrow keys move focus AND selection together.
  // Wraps at both ends. Disabled items are skipped in the cycle.
  //
  // Reads `active` from closure, not the currently-focused element. This
  // assumes the consumer drives `active` synchronously from `onChange`
  // (the controlled-only contract makes this the canonical pattern —
  // every example in the canvas page does it). If a consumer needs to
  // debounce or otherwise defer the active update, arrow nav will land
  // relative to the most-recently-committed `active` rather than the
  // focused item; for that case, the consumer should commit the update
  // synchronously and queue any side effects separately.
  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      const n = items.length;
      if (n === 0) return;
      const enabledIdx = items
        .map((it, idx) => ({ idx, disabled: !!it.disabled }))
        .filter((x) => !x.disabled)
        .map((x) => x.idx);
      if (enabledIdx.length === 0) return;
      const currentIdx = items.findIndex((it) => it.id === active);
      const pos = enabledIdx.indexOf(currentIdx);
      let nextEnabledPos: number;
      if (pos === -1) {
        nextEnabledPos = direction === 1 ? 0 : enabledIdx.length - 1;
      } else {
        nextEnabledPos = (pos + direction + enabledIdx.length) % enabledIdx.length;
      }
      const nextIdx = enabledIdx[nextEnabledPos];
      const nextItem = items[nextIdx];
      if (!nextItem || nextItem.id === active) return;
      onChange(nextItem.id);
      requestAnimationFrame(() => {
        itemRefs.current.get(nextItem.id)?.focus();
      });
    },
    [active, items, onChange],
  );

  const jumpTo = useCallback(
    (edge: 'first' | 'last') => {
      const enabled = items.filter((it) => !it.disabled);
      if (enabled.length === 0) return;
      const target = edge === 'first' ? enabled[0] : enabled[enabled.length - 1];
      if (!target || target.id === active) return;
      onChange(target.id);
      requestAnimationFrame(() => {
        itemRefs.current.get(target.id)?.focus();
      });
    },
    [active, items, onChange],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, itemId: string, disabled: boolean) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          moveSelection(1);
          return;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          moveSelection(-1);
          return;
        case 'Home':
          e.preventDefault();
          jumpTo('first');
          return;
        case 'End':
          e.preventDefault();
          jumpTo('last');
          return;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (disabled) return;
          if (itemId !== active) onChange(itemId);
          return;
        default:
          return;
      }
    },
    [active, jumpTo, moveSelection, onChange],
  );

  const handleClick = useCallback(
    (itemId: string, disabled: boolean) => {
      if (disabled) return;
      if (itemId === active) return;
      onChange(itemId);
    },
    [active, onChange],
  );

  const activeItem = items.find((it) => it.id === active);
  const helperLine = activeItem?.helperText ?? activeItem?.description ?? '';
  const helperVisible = showHelperText && helperLine.length > 0 && variant !== 'compact';

  const rootClass = [
    'mode-selector',
    `mode-selector--${variant}`,
    `mode-selector--tone-${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const groupLabelProps = ariaLabelledBy
    ? { 'aria-labelledby': ariaLabelledBy }
    : { 'aria-label': ariaLabel ?? 'Select mode' };

  return (
    <div
      className={rootClass}
      data-variant={variant}
      data-tone={tone}
      data-testid={testId}
    >
      <div
        role="radiogroup"
        className="mode-selector__group"
        data-testid={testId ? `${testId}-group` : undefined}
        {...groupLabelProps}
      >
        {items.map((item) => {
          const isActive = item.id === active;
          const iconEl = item.icon && item.icon in I ? I[item.icon] : null;
          // Tabbable: only the active item (radio pattern). Disabled-active
          // still gets tabIndex=0 so Tab can enter the group — the click
          // handler is the gate that prevents re-selection.
          const tabIndex = isActive ? 0 : -1;
          const itemClass = [
            'mode-selector__item',
            isActive && 'mode-selector__item--active',
            item.disabled && 'mode-selector__item--disabled',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={item.id}
              ref={setItemRef(item.id)}
              type="button"
              role="radio"
              aria-label={[item.title, item.description].filter(Boolean).join(' — ')}
              aria-checked={isActive}
              aria-disabled={item.disabled ? true : undefined}
              tabIndex={tabIndex}
              className={itemClass}
              data-mode-id={item.id}
              data-active={isActive ? 'true' : 'false'}
              data-disabled={item.disabled ? 'true' : 'false'}
              onClick={() => handleClick(item.id, !!item.disabled)}
              onKeyDown={(e) => handleKey(e, item.id, !!item.disabled)}
              data-testid={testId ? `${testId}-item-${item.id}` : undefined}
            >
              {iconEl && variant !== 'compact' ? (
                <span className="mode-selector__item-icon" aria-hidden="true">
                  {iconEl}
                </span>
              ) : null}
              <span className="mode-selector__item-text">
                <span className="mode-selector__item-title">{item.title}</span>
                {variant === 'rich' && item.description ? (
                  <span className="mode-selector__item-desc">{item.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {helperVisible ? (
        <p
          // Key prop forces React to remount the node when active mode
          // changes — this is what drives the CSS-keyframe crossfade.
          // The keyframe collapses to instant under prefers-reduced-motion.
          key={active}
          className="mode-selector__helper"
          aria-live="polite"
          data-testid={testId ? `${testId}-helper` : undefined}
        >
          {helperLine}
        </p>
      ) : null}
    </div>
  );
}
