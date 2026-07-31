// SPDX-License-Identifier: Apache-2.0
/**
 * CommandPalette — TICKET-X-601 / DP-008 closeout.
 *
 * Pure controlled primitive. Receives the command list, `open` flag,
 * and close / select callbacks. Controller owns lifecycle; the
 * primitive only renders + handles in-panel keyboard nav and clicks.
 *
 * Closed-enum (R-T1 §10.16) — command ids resolve through closed maps
 * in `lib/command-palette/commands.ts`. A11y: native `<dialog>` +
 * aria-modal="true" on the dialog; aria-activedescendant on the input;
 * role="listbox" / role="option" / aria-selected on rows.
 *
 * E2.S5 (REMEDIATION-PLAN lines 372-376): migrated from a hand-rolled
 * `<div role="dialog">`-panel + `<div>`-backdrop shell to the native
 * HTML `<dialog>` element. The browser now owns:
 *   - the focus trap (Tab cycle stays inside; replaces the controller
 *     `wasOpenRef` pre-restore + the unused inputRef.focus pattern)
 *   - Esc-to-close (UA fires `cancel` event we forward to onClose;
 *     the in-input Esc handler stays as a fast-path so existing tests
 *     continue to fire onClose synchronously)
 *   - focus restored to the previously-focused control on close
 *     (replaces the controller-level `wasOpenRef` discipline; the
 *     controller still owns the trigger ref for the visual-focus ring)
 *   - the modal stacking context (`top-layer` semantics)
 *
 * Top-anchored centered layout: native `<dialog>` UA defaults centre
 * vertically. The `dialog.dojo-command-palette` rule in
 * `src/design/styles/system.css` resets the UA defaults and restores
 * the existing top-anchored flex container (paddingTop 14vh +
 * justifyContent center), matching the pre-migration baseline.
 *
 * Backdrop: native `<dialog>` does NOT close on backdrop click by
 * default — we wire that explicitly via a click handler that gates on
 * `event.target === dialogRef.current`. Mirrors the E2.S2 / E2.S3 /
 * E2.S4 pattern.
 *
 * Polyfill decision (E2.S5): NO Safari < 15.4 polyfill. Project
 * stack is Next.js 16 + React 19; native `<dialog>` is Baseline 2022.
 * The jsdom polyfill in `src/test/setup.ts` is reused without change.
 *
 * Retires (E2.S5, plan v4):
 *   - F-4-016 (P2) — CommandPalette not using native <dialog>
 *
 * WCAG citations (E2.S5):
 *   - SC 2.1.2 No Keyboard Trap (Level A) — native <dialog> manages
 *     a containment-style trap; Esc always escapes.
 *   - SC 2.4.3 Focus Order (Level A) — focus restored to invoking
 *     control on close (UA-owned; controller's wasOpenRef is now
 *     a redundant safety net rather than the primary mechanism).
 *   - SC 4.1.3 Status Messages (Level AA) — aria-activedescendant on
 *     the input announces highlight changes without taking focus.
 */

'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type SyntheticEvent,
} from 'react';
import {
  filterCommands,
  groupCommands,
  type PaletteCommand,
} from '../../lib/command-palette/commands';
import {
  PANEL_STYLE,
  INPUT_ROW_STYLE,
  INPUT_STYLE,
  KBD_HINT_STYLE,
  LIST_STYLE,
  OPTION_STYLE,
  OPTION_ACTIVE_STYLE,
  OPTION_LABEL_STYLE,
  OPTION_HINT_STYLE,
  EMPTY_STYLE,
  GROUP_HEADING_STYLE,
  EMPTY_SUGGESTION_STYLE,
} from './CommandPalette.styles';

export interface CommandPaletteProps {
  readonly commands: readonly PaletteCommand[];
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSelect: (command: PaletteCommand) => void;
}

const OPTION_ID_PREFIX = 'cmdk-option-';

function optionId(commandId: string): string {
  return `${OPTION_ID_PREFIX}${commandId}`;
}

export function CommandPalette({
  commands,
  open,
  onClose,
  onSelect,
}: CommandPaletteProps): ReactElement {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const filtered = useMemo(
    () => filterCommands(commands, query),
    [commands, query],
  );

  /**
   * E3.S7 (F-2-209) — group the filtered list by category so the listbox
   * renders 1-N section headings ("Models" / "Pages" / "Recent" / "Help")
   * each followed by their command rows. The flat `filtered` array is
   * still the canonical source for keyboard navigation (`activeIndex`
   * indexes into `filtered`, not into the grouped buckets) so Up/Down
   * traversal sweeps every section in display order without the user
   * having to think about section boundaries.
   *
   * `groupCommands` preserves the canonical `PALETTE_CATEGORY_IDS`
   * order and drops empty buckets, so as the operator types and a
   * category narrows to zero hits the heading disappears with it
   * (rather than leaving a dangling section title).
   */
  const groups = useMemo(() => groupCommands(filtered), [filtered]);

  // Drive native open/close. `showModal()` opens the dialog in the top
  // layer with browser-managed focus trap + restore-focus. `close()`
  // both removes the open attribute AND fires a `close` event — no
  // separate cleanup needed. We guard `showModal` with `!dialog.open`
  // because calling it on an already-open dialog throws InvalidStateError.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // showModal can be missing when the test runner is jsdom and
      // the polyfill hasn't been installed; the test setup wires a
      // safe fallback. In production this is a synchronous call.
      dialog.showModal?.();
    } else if (!open && dialog.open) {
      dialog.close?.();
    }
  }, [open]);

  // Reset transient state on close + push initial focus to the input
  // on open. Native <dialog>.showModal will focus the first focusable
  // (autofocus / first descendant), but we want the search input as
  // the initial focus regardless of DOM order — so we explicitly
  // focus it. This also drives X601-005 (Cmd+K opens the palette).
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (cmd: PaletteCommand) => {
      onSelect(cmd);
      onClose();
    },
    [onSelect, onClose],
  );

  // Native <dialog> handles Esc itself (firing the `cancel` event +
  // setting `open=false`). We listen to `cancel` here so the parent
  // controller can sync its `open` state. Without this the next open
  // call sees `dialog.open === false` but the React state still says
  // `open === true` and showModal won't re-fire.
  const handleCancel = useCallback(
    (e: SyntheticEvent<HTMLDialogElement>) => {
      // preventDefault so the UA doesn't auto-close before our state
      // machine catches up; we then explicitly call onClose which sets
      // the controller's open=false → triggers the close-effect →
      // calls dialog.close().
      e.preventDefault();
      // Idempotency guard: rapid Esc presses can fire `cancel` while
      // the close transition is in flight (open already false but UA
      // still reports dialog.open=true). Skip the second onClose.
      if (!open) return;
      onClose();
    },
    [open, onClose],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filtered.length === 0) return;
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filtered.length === 0) return;
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) handleSelect(cmd);
        return;
      }
      if (e.key === 'Escape') {
        // Fast-path: native <dialog> would also fire `cancel` on Esc,
        // but synthetic-event tests in jsdom (e.g. X601-005) don't
        // bubble the keystroke up to the dialog. Forward to onClose
        // directly so the controller flips state and the close-effect
        // calls dialog.close().
        e.preventDefault();
        onClose();
      }
    },
    [filtered, activeIndex, handleSelect, onClose],
  );

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  const activeCmd = filtered[activeIndex];
  const activeDescendant = activeCmd ? optionId(activeCmd.id) : undefined;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-label="Command palette"
      className="dojo-command-palette"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      data-testid="command-palette-dialog"
      data-open={open}
    >
      {open && (
      <div
        style={PANEL_STYLE}
        data-testid="command-palette-panel"
      >
        <div style={INPUT_ROW_STYLE}>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands…"
            aria-label="Search commands"
            aria-controls="command-palette-list"
            aria-activedescendant={activeDescendant}
            style={INPUT_STYLE}
            data-testid="command-palette-input"
          />
          <span style={KBD_HINT_STYLE}>Esc</span>
        </div>
        {filtered.length === 0 ? (
          // E3.S7 (F-2-209) — contextual empty state. The fixed "No
          // commands match" copy left the operator without a recovery
          // path. Now the headline references the term AND the body
          // surfaces the two highest-traffic destinations
          // (`/scanner` for Yamabushi Scanner, `/atemi` for the
          // Adversarial MCP lab) so a typo doesn't dead-end the
          // search. Suggestions are static text (not buttons) —
          // tapping them is out of scope for the v1 catalogue.
          <div style={EMPTY_STYLE} data-testid="command-palette-empty">
            <div data-testid="command-palette-empty-headline">
              No matches for &quot;{query}&quot;
            </div>
            <div
              style={EMPTY_SUGGESTION_STYLE}
              data-testid="command-palette-empty-suggestions"
            >
              Try /scanner or /atemi
            </div>
          </div>
        ) : (
          <ul
            id="command-palette-list"
            role="listbox"
            aria-label="Command palette options"
            style={LIST_STYLE}
            data-testid="command-palette-list"
          >
            {groups.map((group) => {
              // Flat-index discipline: each row's position in the
              // global `filtered` array drives both aria-selected and
              // active styling. We compute the offset at the group
              // boundary then index into it per-row.
              const startIndex = filtered.indexOf(group.commands[0] as PaletteCommand);
              return (
                <Fragment key={group.category}>
                  <li
                    role="presentation"
                    aria-hidden="true"
                    style={GROUP_HEADING_STYLE}
                    data-testid={`command-palette-group-${group.category}`}
                  >
                    {group.label}
                  </li>
                  {group.commands.map((cmd, j) => {
                    const i = startIndex + j;
                    const isActive = i === activeIndex;
                    return (
                      <li
                        key={cmd.id}
                        id={optionId(cmd.id)}
                        role="option"
                        aria-selected={isActive}
                        style={isActive ? OPTION_ACTIVE_STYLE : OPTION_STYLE}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => handleSelect(cmd)}
                        data-testid={`command-palette-option-${cmd.id}`}
                      >
                        <span style={OPTION_LABEL_STYLE}>{cmd.label}</span>
                        {cmd.hint && <span style={OPTION_HINT_STYLE}>{cmd.hint}</span>}
                      </li>
                    );
                  })}
                </Fragment>
              );
            })}
          </ul>
        )}
      </div>
      )}
    </dialog>
  );
}
