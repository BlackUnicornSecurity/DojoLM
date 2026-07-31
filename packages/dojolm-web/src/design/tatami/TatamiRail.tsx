// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * TatamiRail — the embedded evidence "cockpit" shell (Epic 3, Stories 1–2).
 *
 * A compact, reusable side-rail that lives inside an OSS module surface
 * (Scanner first). This file is the PURE PRESENTATIONAL shell only: it owns
 * the three layout states (collapsed / docked / expanded), the tab strip
 * (Proof default · Trace · Chat-stub), a header `badges` slot, and the active
 * panel / empty slot. It is **fully controlled** — every piece of app state
 * (`mode`, `activeTab`) is a prop with a matching callback. It performs no
 * fetch, holds no data store, and imports nothing but React, so a collapsed
 * Rail ships ≈0 JS (Epic 3 bundle-budget acceptance) and never triggers a
 * global fetch unless a parent mounts real context into `children`. The only
 * internal state it keeps is focus plumbing (refs/effects) — never app data.
 *
 * Story 2 adds the WAI-ARIA APG tablist keyboard contract + focus management
 * to the shell itself: a roving tabindex (one tab stop), Arrow/Home/End focus
 * movement with disabled-skip + wrap, MANUAL activation (arrows move focus
 * only; Enter/Space/click activate — the panels are dynamic-import-costly, so
 * an arrow sweep must not mount them), and cross-mode focus restoration
 * (collapse → spine Expand; expand-from-collapsed → active tab), restoring
 * only focus the rail already owned.
 *
 * Out of this story (separate Epic-3 steps, clean seams left here):
 *   - maturity watermark / trust / replay-safety / reproducibility badges →
 *     rendered by callers into the `badges` slot.
 *   - the dynamic-imported Trace/Chat/Replay panels (a `role="log"` live region
 *     belongs to the Trace panel, never this shell — no double-announce).
 *
 * Styling + the full 8-state interaction surface (hover, :focus-visible ring,
 * :active, disabled), reduced-motion, and mobile degradation live in
 * `design/styles/patterns/tatami-rail.css`, built on the house token
 * vocabulary (`chip`, `btn`, `--fg-mute`, `--space-N`, `--b-1`, `--bg-1/2`).
 * No new palette, no new fonts.
 *
 * OSS / Apache-2.0: `design/tatami/*` is OSS-classified; this shell imports no
 * `tatami-vault` (EE) surface and adds nothing to `EE_NAV_IDS`.
 */

import {
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

/** Layout state of the Rail. Controlled by the caller. */
export type TatamiRailMode = 'collapsed' | 'docked' | 'expanded';

/** Closed set of panel tabs. Chat is a stub (disabled) until post-v0. */
export type TatamiRailTabId = 'proof' | 'trace' | 'chat';

export interface TatamiRailTab {
  readonly id: TatamiRailTabId;
  readonly label: string;
  /** A disabled tab renders inert (the Chat stub defaults to this). */
  readonly disabled?: boolean;
}

export interface TatamiRailProps {
  /** Current layout state (controlled). */
  mode: TatamiRailMode;
  /** Requested layout transition (caller owns the state). */
  onModeChange: (mode: TatamiRailMode) => void;
  /** Active panel tab (controlled). */
  activeTab: TatamiRailTabId;
  /** Requested tab change (never fires for a disabled tab). */
  onTabChange: (tab: TatamiRailTabId) => void;
  /** Tab set + order. Defaults to Proof · Trace · Chat(disabled). */
  tabs?: readonly TatamiRailTab[];
  /** Header label. Defaults to "Tatami". */
  title?: string;
  /** Linked-proof count shown on the collapsed spine when > 0. */
  proofCount?: number;
  /** Header slot for the maturity / trust / replay-safety badges. Render a
   *  `<TatamiProofBadges proof={…} />` here for the docked / expanded header. */
  badges?: ReactNode;
  /** Compact badge cluster for the COLLAPSED spine — pass
   *  `<TatamiProofBadges proof={…} compact />`. Rendered decoratively
   *  (`aria-hidden`) inside the Expand button, so the spine keeps its single
   *  accessible name; the full, labelled badges live in the header `badges`
   *  slot and the expanded panel. Only shown while `mode === 'collapsed'`. */
  spineBadges?: ReactNode;
  /** Active panel content. When absent, the honest empty state renders. */
  children?: ReactNode;
  /** Extra class appended to the root region. */
  className?: string;
  /** ARIA id base for tab/panel wiring; override when >1 Rail is on a page. */
  idBase?: string;
}

const DEFAULT_TABS: readonly TatamiRailTab[] = [
  { id: 'proof', label: 'Proof' },
  { id: 'trace', label: 'Trace' },
  { id: 'chat', label: 'Chat', disabled: true },
];

/** Hairline chevron — direction by rotation via the `data-dir` class hook. */
function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'right' ? 'M6 4l4 4-4 4' : 'M10 4l-4 4 4 4';
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The evidence-seal identity mark (a stamped square + tick). */
function RailMark() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8.4l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Collapsed spine: a thin vertical handle. The whole spine is the expand
 * affordance — click anywhere to dock. Carries the identity mark, a vertical
 * wordmark, the active-tab glyph, and the linked-proof count.
 */
function CollapsedSpine({
  title,
  activeLabel,
  proofCount,
  badges,
  onExpand,
  spineRef,
  rootId,
}: {
  title: string;
  activeLabel: string;
  proofCount?: number;
  /** Compact, decorative badge cluster (aria-hidden — see `spineBadges`). */
  badges?: ReactNode;
  onExpand: () => void;
  /** Focus-restoration target when the rail collapses. */
  spineRef: RefObject<HTMLButtonElement | null>;
  /** Region the spine's `aria-expanded` refers to. */
  rootId: string;
}) {
  const showCount = typeof proofCount === 'number' && proofCount > 0;
  return (
    <button
      ref={spineRef}
      type="button"
      className="tr-spine"
      aria-label="Expand Tatami rail"
      aria-expanded={false}
      aria-controls={rootId}
      onClick={onExpand}
    >
      <span className="tr-spine__mark" aria-hidden="true">
        <RailMark />
      </span>
      <span className="tr-spine__word" aria-hidden="true">
        {title}
      </span>
      <span className="tr-spine__glyph" aria-hidden="true">
        {activeLabel.charAt(0)}
      </span>
      {badges != null && (
        <span className="tr-spine__badges" aria-hidden="true">
          {badges}
        </span>
      )}
      {showCount && (
        <span className="chip steel tr-spine__count" data-testid="tatami-rail-count" aria-hidden="true">
          {proofCount}
        </span>
      )}
      <span className="tr-spine__expand" aria-hidden="true">
        <Chevron dir="left" />
      </span>
    </button>
  );
}

export function TatamiRail({
  mode,
  onModeChange,
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS,
  title = 'Tatami',
  proofCount,
  badges,
  spineBadges,
  children,
  className,
  idBase = 'tatami-rail',
}: TatamiRailProps) {
  const rootClass = ['tatami-rail', `tatami-rail--${mode}`, className].filter(Boolean).join(' ');
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? title;
  const rootId = `${idBase}-root`;

  // ── Focus plumbing (refs/effects only — never app state) ─────────────────
  const rootRef = useRef<HTMLElement | null>(null);
  const spineRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Map<TatamiRailTabId, HTMLButtonElement>>(new Map());
  // Whether focus currently lives inside the rail. Maintained from focus
  // events so a mode transition only *restores* focus the rail already owned —
  // never hijacking focus on an unrelated re-render or on initial mount.
  const focusWithinRef = useRef(false);
  const prevModeRef = useRef(mode);

  const handleFocusCapture = () => {
    focusWithinRef.current = true;
  };
  const handleBlurCapture = (e: FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    // Only clear the flag when focus moves to a *known* element outside the
    // rail. During the collapse/expand re-render the focused node unmounts and
    // `relatedTarget` is null — keep the flag so the effect below can restore.
    if (next && rootRef.current && !rootRef.current.contains(next)) {
      focusWithinRef.current = false;
    }
  };

  // Cross-mode focus restoration. Keyed on mode (+ activeTab so the restore
  // target stays current); guarded so docked⇄expanded and same-mode
  // re-renders never move focus, and so initial mount never steals it.
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev === mode) return;
    if (!focusWithinRef.current) return;
    if (mode === 'collapsed') {
      spineRef.current?.focus();
    } else if (prev === 'collapsed') {
      tabRefs.current.get(activeTab)?.focus();
    }
  }, [mode, activeTab]);

  // WAI-ARIA APG tablist keys with MANUAL activation: arrows/Home/End move DOM
  // focus only (skipping disabled, wrapping); Enter/Space commit. Roving focus
  // ≠ active tab, so the focused tab is read from document.activeElement.
  const onTabsKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length === 0) return;

    const entries = Array.from(tabRefs.current.entries());
    const currentId = entries.find(([, el]) => el === document.activeElement)?.[0];

    if (e.key === 'Enter' || e.key === ' ') {
      const tab = currentId ? tabs.find((t) => t.id === currentId) : undefined;
      if (tab && !tab.disabled) {
        e.preventDefault(); // suppress the native button click → single fire
        onTabChange(tab.id);
      }
      return;
    }

    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();
    const n = enabled.length;
    const curIdx = enabled.findIndex((t) => t.id === currentId);
    let nextIdx: number;
    if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = n - 1;
    else if (curIdx === -1) {
      // Focus isn't on an enabled tab — only reachable if a caller marks a tab
      // `aria-disabled`-only (no HTML `disabled`), since a real disabled button
      // can't take focus. Pick the directional end deterministically.
      nextIdx = e.key === 'ArrowRight' ? 0 : n - 1;
    } else if (e.key === 'ArrowRight') nextIdx = (curIdx + 1) % n;
    else nextIdx = (curIdx - 1 + n) % n;
    tabRefs.current.get(enabled[nextIdx].id)?.focus();
  };

  if (mode === 'collapsed') {
    return (
      <section
        ref={rootRef}
        id={rootId}
        className={rootClass}
        aria-label="Tatami evidence rail"
        data-mode={mode}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        <CollapsedSpine
          title={title}
          activeLabel={activeLabel}
          proofCount={proofCount}
          badges={spineBadges}
          onExpand={() => onModeChange('docked')}
          spineRef={spineRef}
          rootId={rootId}
        />
      </section>
    );
  }

  const panelId = `${idBase}-panel`;
  const activeTabId = `${idBase}-tab-${activeTab}`;
  const isExpanded = mode === 'expanded';

  return (
    <section
      ref={rootRef}
      id={rootId}
      className={rootClass}
      aria-label="Tatami evidence rail"
      data-mode={mode}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <header className="tr-head">
        <span className="tr-head__mark" aria-hidden="true">
          <RailMark />
        </span>
        <span className="tr-title">{title}</span>
        {badges != null && <div className="tr-badges">{badges}</div>}
        <div className="tr-head__controls">
          <button
            type="button"
            className="btn sm tr-ctl"
            aria-label={isExpanded ? 'Dock Tatami rail' : 'Expand Tatami rail to full width'}
            onClick={() => onModeChange(isExpanded ? 'docked' : 'expanded')}
          >
            {isExpanded ? 'Dock' : 'Expand'}
          </button>
          <button
            type="button"
            className="btn sm tr-ctl tr-ctl--collapse"
            aria-label="Collapse Tatami rail"
            aria-expanded={true}
            aria-controls={rootId}
            onClick={() => onModeChange('collapsed')}
          >
            <Chevron dir="right" />
          </button>
        </div>
      </header>

      <div role="tablist" aria-label="Tatami panels" className="tr-tabs" onKeyDown={onTabsKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idBase}-tab-${tab.id}`}
              className="tr-tab"
              // Roving tabindex: exactly one tab stop (the active tab); every
              // other tab — disabled included — is reachable only via the arrows.
              tabIndex={selected ? 0 : -1}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              aria-selected={selected}
              aria-controls={panelId}
              aria-disabled={tab.disabled ? true : undefined}
              disabled={tab.disabled}
              data-active={selected ? '' : undefined}
              onClick={() => {
                if (!tab.disabled) onTabChange(tab.id);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={activeTabId} className="tr-panel" tabIndex={0}>
        {/* Truthy check (not `!= null`): a parent passing `{flag && <Panel/>}`
            yields `false` when the flag is off — that must fall through to the
            honest empty state, not render blank. */}
        {children ? (
          children
        ) : (
          <div className="tr-empty" data-testid="tatami-rail-empty">
            <span className="tr-empty__mark" aria-hidden="true">
              <RailMark />
            </span>
            <p className="tr-empty__text">No proof selected</p>
            <p className="tr-empty__hint">Capture a finding to start a proof.</p>
          </div>
        )}
      </div>
    </section>
  );
}
