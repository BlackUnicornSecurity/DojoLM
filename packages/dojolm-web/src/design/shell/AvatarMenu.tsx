// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * AvatarMenu — TopBar identity dropdown.
 *
 * YR.15 (DP-007 / G-070): the TopBar avatar was a static <div>MA</div>
 * with no affordance. AvatarMenu turns it into a real menu trigger:
 *   - Click → opens a single-item dropdown ("Sign out").
 *   - Escape / click-outside → closes.
 *   - Tab steps through the menu items (the menu is small enough that
 *     a full focus-trap is overkill; we focus the first item on open
 *     and let native tab order handle the rest, with the trigger
 *     receiving focus again on close).
 *   - aria-haspopup / aria-expanded / role=menu so the no-dead-button
 *     lint is satisfied AND assistive tech announces the menu state.
 *
 * Sign-out uses the AuthContext.logout() pattern — POST /api/auth/logout
 * (which destroys the SQLite session row + clears the cookie set) and
 * then navigates to /login. The mutation runs BEFORE the navigation so
 * a stolen session cookie cannot survive the click.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AvatarMenuProps {
  /** 1–2 character initials displayed inside the avatar disc. */
  readonly initials: string;
  /** Optional full username; surfaces as the trigger's aria-label. */
  readonly username?: string;
  /** Sign-out handler. Returns a promise so the trigger can stay open
   *  until the underlying mutation resolves; on success the host
   *  navigates to `/login` (or wherever they choose). */
  readonly onSignOut: () => Promise<void>;
}

const TRIGGER_TESTID = 'topbar-avatar-trigger';
const MENU_TESTID = 'topbar-avatar-menu';
const SIGN_OUT_TESTID = 'topbar-avatar-sign-out';
const KANJI_TOGGLE_TESTID = 'topbar-avatar-kanji-toggle';

// Wave 3jj · F-1-020 P3 — kanji-brand-mark toggle reachability.
// The `[data-kamae-scope][data-kanji=on/off]` switch (primitives.css:73-74,
// also gates `.cmd-hero-watermark`, `.wb-hero-watermark`,
// `.arena-hero-watermark`, `.codex-hero-watermark`, the brand-footer-chip
// glyph, and the Rail logo's kanji/romaji) is written by the Kamae panel,
// which is only mounted on Command-archetype routes. To make the toggle
// reachable from every archetype this menu reads + writes the same
// localStorage key the Kamae panel persists into so the two surfaces stay
// in sync.
const KAMAE_STORAGE_KEY = 'dojolm.kamae.global';

type KanjiPref = 'on' | 'off';

function readKanjiPref(): KanjiPref {
  if (typeof window === 'undefined') return 'on';
  try {
    const raw = localStorage.getItem(KAMAE_STORAGE_KEY);
    if (!raw) return 'on';
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return 'on';
    const value = (parsed as Record<string, unknown>).kanji;
    return value === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
}

function writeKanjiPref(next: KanjiPref): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KAMAE_STORAGE_KEY);
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const merged = { ...base, kanji: next };
    localStorage.setItem(KAMAE_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore malformed storage / quota-exceeded
  }
}

// Mutates every [data-kamae-scope] element on the page so the existing
// `[data-kamae-scope][data-kanji=...]` CSS rules apply without waiting
// for the Kamae component to re-render. Mirrors what Kamae.tsx does on
// its own effect (closest('[data-kamae-scope]')) but iterates all scopes
// — the avatar menu has no anchored kamae-scope ancestor of its own.
function applyKanjiPref(next: KanjiPref): void {
  if (typeof document === 'undefined') return;
  const scopes = document.querySelectorAll('[data-kamae-scope]');
  scopes.forEach((scope) => scope.setAttribute('data-kanji', next));
}

export function AvatarMenu({ initials, username, onSignOut }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // F-1-020 — defaults to 'on' on SSR; the effect below reconciles to
  // the persisted preference on first paint. This avoids hydration
  // mismatch warnings when localStorage has 'off' (would otherwise
  // diverge from the server-rendered 'on').
  const [kanjiPref, setKanjiPref] = useState<KanjiPref>('on');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // F-1-020 — reconcile to the persisted Kamae preference after mount so
  // the menu reflects what the operator picked previously (via either
  // this menu or the Kamae panel itself).
  useEffect(() => {
    setKanjiPref(readKanjiPref());
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to the trigger so keyboard users land where they
    // started (WCAG 2.4.3 Focus Order).
    triggerRef.current?.focus();
  }, []);

  // Click-outside dismissal.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const node = containerRef.current;
      if (node && !node.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape dismissal (WCAG 2.1.2 — keyboard-only operability).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  // Auto-focus the first menu item when the menu opens so keyboard
  // users can hit Enter immediately. Skip when signingOut so the
  // pending-state visual stays put.
  useEffect(() => {
    if (open && !signingOut) {
      firstItemRef.current?.focus();
    }
  }, [open, signingOut]);

  const handleSignOutClick = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      // Either path — success or failure — close the menu so the
      // trigger button is interactive again. The host's navigation
      // (on success) will replace the page anyway.
      setSigningOut(false);
      setOpen(false);
    }
  }, [onSignOut, signingOut]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className="avatar"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={username ? `Open user menu (${username})` : 'Open user menu'}
        data-testid={TRIGGER_TESTID}
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          data-testid={MENU_TESTID}
          aria-label="User menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 160,
            background: 'var(--bg-2, #111)',
            border: '1px solid var(--b-1, #333)',
            borderRadius: 6,
            padding: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 50,
          }}
        >
          {/* Wave 3jj · F-1-020 P3 — kanji toggle reachable from every
              archetype. Sits ABOVE the sign-out so the destructive
              action remains visually anchored at the bottom of the
              menu (Fitts + Nielsen #5). The button reflects the
              persisted preference (`On` / `Off`) so operators can see
              the current state before clicking. */}
          <button
            ref={firstItemRef}
            type="button"
            role="menuitemcheckbox"
            aria-checked={kanjiPref === 'on'}
            onClick={() => {
              const next: KanjiPref = kanjiPref === 'on' ? 'off' : 'on';
              writeKanjiPref(next);
              applyKanjiPref(next);
              setKanjiPref(next);
            }}
            data-testid={KANJI_TOGGLE_TESTID}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              background: 'transparent',
              color: 'var(--fg, #fff)',
              border: 0,
              borderRadius: 4,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            <span>Kanji glyphs</span>
            <span style={{ color: 'var(--fg-mute)', fontFamily: 'var(--mono)' }}>
              {kanjiPref === 'on' ? 'On' : 'Off'}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleSignOutClick();
            }}
            disabled={signingOut}
            data-testid={SIGN_OUT_TESTID}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              background: 'transparent',
              color: 'var(--fg, #fff)',
              border: 0,
              borderRadius: 4,
              fontSize: 12.5,
              cursor: signingOut ? 'wait' : 'pointer',
            }}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
