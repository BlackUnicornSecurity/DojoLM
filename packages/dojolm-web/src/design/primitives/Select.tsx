// SPDX-License-Identifier: Apache-2.0
/**
 * Select — design primitive (TICKET-DROPDOWN-UNIFY, 2026-05-22).
 *
 * Closed-set native `<select>` wrapper with custom chrome that matches
 * the ModelPicker combobox. Founder eye-test 2026-05-22 flagged the
 * visual mismatch between `<select className="wb-select">` (native OS
 * chevron, default option menu) and the custom `<ModelPicker>` listbox
 * sitting adjacent on /admin/atemi. The CSS-only fix in
 * `design/styles/patterns/workbench.css` (this PR) unifies the chrome
 * across every `.wb-select` consumer; this primitive provides the
 * long-term API new code should reach for.
 *
 * Why wrap native `<select>` instead of building a custom listbox:
 *   - Mobile picker (iOS wheel, Android sheet) is the right default UX;
 *     a JS listbox loses that.
 *   - Native keyboard semantics (typeahead, ArrowUp/Down, Home/End,
 *     Enter to confirm) are free.
 *   - `<select>` is a single tab-stop with a built-in combobox role —
 *     accessibility is one less thing to get wrong.
 *
 * Closed-set discipline:
 *   - `options` is a `ReadonlyArray<SelectOption>` with required
 *     `value` + `label`. Optional `disabled` per row.
 *   - `value` is `string | null`; `null` renders the placeholder
 *     `<option>` if a `placeholder` was supplied.
 *   - `onChange` fires with the raw option `value` string — caller
 *     narrows back to its own union.
 *
 * Defensive caps:
 *   - `label` per option clamped to 80 chars (R-T1 string cap) to
 *     bound DOM size if upstream data drifts.
 *
 * Tests: `Select.test.tsx` covers renders / disabled / change / cap.
 */

'use client';

import type { ChangeEvent } from 'react';

/** Display-text cap per option — R-T1 string-cap discipline. */
export const SELECT_OPTION_LABEL_MAX = 80;

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  /** Closed-set option list. */
  readonly options: ReadonlyArray<SelectOption>;
  /** Current value. `null` shows the placeholder option (if supplied). */
  readonly value: string | null;
  /** Change callback — receives the option `value` (or null when
   *  placeholder is selected). */
  readonly onChange: (value: string | null) => void;
  /** Optional placeholder text rendered as a disabled-on-pick option
   *  when `value === null`. When omitted, no placeholder row renders. */
  readonly placeholder?: string;
  /** Optional `id` — also used as the `aria-labelledby` target when a
   *  caller wires its own external `<label htmlFor>` reference. */
  readonly id?: string;
  /** Optional aria-label override (use when no visible `<label>` exists). */
  readonly ariaLabel?: string;
  /** Disable interaction. */
  readonly disabled?: boolean;
  /** Stable test id. */
  readonly testId?: string;
  /** Wrapper className for layout (gets `wb-select` + className). */
  readonly className?: string;
  /** Name attribute (for `<form>` submissions). */
  readonly name?: string;
}

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Native-`<select>`-backed combobox with custom chevron + dark-theme
 * chrome. The visual treatment lives in `.wb-select` (workbench.css) —
 * the primitive applies that classname so chrome stays unified with
 * the legacy callsites until they migrate.
 */
export function Select({
  options,
  value,
  onChange,
  placeholder,
  id,
  ariaLabel,
  disabled,
  testId,
  className,
  name,
}: SelectProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === '' && placeholder !== undefined) {
      // Placeholder picked — emit null so callers can distinguish the
      // "no selection" state from a real choice.
      onChange(null);
      return;
    }
    onChange(next);
  };

  const selectValue = value ?? '';
  const rootClass = `wb-select${className !== undefined ? ` ${className}` : ''}`;

  return (
    <select
      {...(id !== undefined ? { id } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      {...(testId !== undefined ? { 'data-testid': testId } : {})}
      className={rootClass}
      value={selectValue}
      onChange={handleChange}
      disabled={disabled === true}
    >
      {placeholder !== undefined && (
        <option value="" disabled={value !== null}>
          {cap(placeholder, SELECT_OPTION_LABEL_MAX)}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled === true}>
          {cap(opt.label, SELECT_OPTION_LABEL_MAX)}
        </option>
      ))}
    </select>
  );
}
