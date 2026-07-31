// SPDX-License-Identifier: Apache-2.0
/**
 * CommandPaletteController — TICKET-X-601 / DP-008 closeout.
 *
 * Live consumer that wires `<CommandPalette>` into:
 *   - global Cmd+K / Ctrl+K keydown listener (window-scoped)
 *   - `useNavigation().setActiveTab` for `action.type === 'navigate'`
 *   - `window.dispatchEvent(new CustomEvent(...))` for `action.type === 'event'`
 *   - `window.location.assign(href)` for `action.type === 'href'`
 *
 * Exposes `<CommandPaletteController.Trigger>` so the TopBar can render
 * the visual button without re-implementing open-state plumbing. The
 * trigger receives the same `setOpen` ref via context, but to keep the
 * component graph simple we render the trigger as a sibling and pass a
 * `setOpen` callback through the host-provided render prop.
 *
 * Open-state lives here, not on the primitive (the primitive is
 * controlled). Escape close + backdrop close are handled inside the
 * primitive via its `onClose` prop.
 *
 * Focus discipline: when the palette closes the controller restores
 * focus to the ref the host registers via `triggerRef`. No tabIndex={-1}
 * hack — `ref.focus()` only.
 *
 * Zero new deps. ≤200 lines.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { useNavigation } from '../../lib/NavigationContext';
import { CommandPalette } from './CommandPalette';
import {
  PALETTE_COMMANDS,
  type PaletteCommand,
} from '../../lib/command-palette/commands';

export interface CommandPaletteControllerProps {
  readonly children: (api: {
    readonly open: () => void;
    readonly triggerRef: RefObject<HTMLButtonElement | null>;
    readonly isOpen: boolean;
  }) => ReactNode;
  readonly commands?: readonly PaletteCommand[];
}

function isPaletteHotkey(e: KeyboardEvent): boolean {
  if (e.key !== 'k' && e.key !== 'K') return false;
  return e.metaKey || e.ctrlKey;
}

export function CommandPaletteController({
  children,
  commands = PALETTE_COMMANDS,
}: CommandPaletteControllerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const { setActiveTab } = useNavigation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isPaletteHotkey(e)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSelect = useCallback(
    (cmd: PaletteCommand) => {
      const action = cmd.action;
      if (action.type === 'navigate') {
        setActiveTab(action.navId);
        return;
      }
      if (action.type === 'event') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(action.event));
        }
        return;
      }
      if (action.type === 'href') {
        if (typeof window !== 'undefined') {
          window.location.assign(action.href);
        }
      }
    },
    [setActiveTab],
  );

  return (
    <>
      {children({ open, triggerRef, isOpen })}
      <CommandPalette
        commands={commands}
        open={isOpen}
        onClose={close}
        onSelect={handleSelect}
      />
    </>
  );
}
