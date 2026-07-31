// SPDX-License-Identifier: Apache-2.0
/**
 * Yamabushi 1.3 (YU.3) — Sumi-e EmptyState.
 *
 * Panel-level empty/loading/error state. Each module gets a bespoke sumi-e
 * ink-brush motif (15 Rail IDs + `enso` fallback for unknown modules), 3
 * states (`empty` | `loading` | `error`). Loading state breathes (motion-
 * safe gated). Error state overlays a torii-red slash on the same motif.
 *
 * Source port: the V1 design system shared/empty-state +
 * styles/empty-state.css (verbatim retokenized).
 *
 * G3: kanji watermark hero-only — these motifs are pure ink-brush SVG, no
 * kanji glyphs on data. G10: no `--bu-cyan` references — the motifs use
 * `currentColor`, the WASH variants resolve to `--torii` / `--steel` /
 * `--gold` / `--violet` / neutral white-overlay, never cyan.
 *
 * Wraps shadcn (G8): the legacy shadcn EmptyState lives at
 * `@/components/ui/EmptyState` and stays intact. Design-system consumers
 * import this `EmptyState` from `@/design`.
 */

import type { ReactNode } from 'react';
import type {
  EmptyStateAction,
  EmptyStateEmptyAction,
  EmptyStateModule,
  EmptyStateSize,
  EmptyStateTint,
  EmptyStateTone,
} from './EmptyState.types';
import { DISABLED_DEFAULT_CTA, resolveCopy } from './empty-state-copy';

const INK_COLOR = 'currentColor';
const RED_COLOR = 'var(--torii, #CC3A2F)';
// v2 red-budget law (§1.2): decorative motif accents are neutral ink —
// torii stays reserved for the error-state slash (sanctioned state red).
const ACCENT_COLOR = 'var(--fg-mute, #8a8f98)';

/**
 * A.1 consolidation (2026-05-14) — hero-size decorative kanji watermark.
 * One glyph per module, chosen to read as a semantic anchor (not as
 * data). Rendered only when `size === 'hero'` AND `watermark` prop is
 * truthy; default `enso` glyph used when the module key is missing.
 * G3 exception: kanji on data motifs is banned, but hero watermarks
 * are decorative chrome (aria-hidden, behind content) so the rule does
 * not apply.
 */
const KANJI_BY_MODULE: Readonly<Record<EmptyStateModule, string>> = {
  command: '令',
  bushido: '武',
  admin: '守',
  ronin: '浪',
  scanner: '観',
  buki: '器',
  jutsu: '術',
  arena: '試',
  atemi: '当',
  sengoku: '戦',
  hattori: '護',
  kotoba: '言',
  mitsuke: '見',
  amaterasu: '天',
  kagami: '鏡',
  shingan: '眼',
  enso: '円',
};

const TINT_BY_MODULE: Readonly<Record<EmptyStateModule, EmptyStateTint>> = {
  command: 'red',
  bushido: 'violet',
  admin: 'neutral',
  ronin: 'neutral',
  scanner: 'red',
  buki: 'red',
  jutsu: 'red',
  arena: 'red',
  atemi: 'red',
  sengoku: 'red',
  hattori: 'steel',
  kotoba: 'steel',
  mitsuke: 'gold',
  amaterasu: 'gold',
  kagami: 'gold',
  shingan: 'steel',
  enso: 'neutral',
};

// Wash backgrounds resolve via empty-state.css `.tint-*` rules — those use
// Epic 0 RGB channel tokens (`--torii-rgb`, `--steel-rgb`, `--gold-rgb`,
// `--violet-rgb`, `--white-rgb`) so the wash tracks any future token edit.
// The component sets the tint class only; CSS owns the rgba composition.

function isSafeHref(href: string | undefined): href is string {
  if (!href) return false;
  // Allow same-origin paths (`/foo`), explicit http(s) URLs, mailto:, and
  // hash links. Block javascript:, data:, vbscript:, file:, and any other
  // scheme that could turn an admin-supplied link into an XSS vector.
  // Same-origin paths must not be protocol-relative — `//evil.com`
  // starts with `/` but inherits the page scheme and is an open-
  // redirect vector. The negative lookahead `(?!\/)` rejects that
  // class while keeping `/`, `/foo`, and `/foo?q=1` allowed.
  return /^(\/(?!\/)|https?:\/\/|mailto:|#)/i.test(href);
}

type MotifRenderer = () => ReactNode;

const MOTIFS: Readonly<Record<EmptyStateModule, MotifRenderer>> = {
  command: () => (
    <>
      <ellipse cx="80" cy="96" rx="52" ry="4" fill="var(--es-wash)" />
      <path d="M30,40 Q80,28 130,40 L128,46 Q80,36 32,46 Z" fill={INK_COLOR} opacity="0.85" />
      <path d="M36,50 L124,50" stroke={INK_COLOR} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48,50 L48,94" stroke={INK_COLOR} strokeWidth="3" strokeLinecap="round" />
      <path d="M112,50 L112,94" stroke={INK_COLOR} strokeWidth="3" strokeLinecap="round" />
      <path d="M42,94 L118,94" stroke={INK_COLOR} strokeWidth="1.2" opacity="0.4" />
    </>
  ),
  bushido: () => (
    <>
      <rect x="36" y="34" width="88" height="60" rx="4" fill="var(--es-wash)" />
      <path
        d="M36,34 Q34,64 36,94 M124,34 Q126,64 124,94"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M48,48 L112,48 M48,58 L96,58 M48,68 L108,68 M48,78 L88,78"
        stroke={INK_COLOR}
        strokeWidth="1.2"
        opacity="0.55"
        strokeLinecap="round"
      />
      <circle cx="108" cy="88" r="8" fill={ACCENT_COLOR} opacity="0.85" />
      <circle cx="108" cy="88" r="8" stroke={INK_COLOR} strokeWidth="0.8" fill="none" />
    </>
  ),
  admin: () => (
    <>
      <ellipse cx="80" cy="100" rx="46" ry="3" fill="var(--es-wash)" />
      <path
        d="M52,96 Q56,70 70,64 Q88,58 98,44 Q104,36 110,38 L112,30"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M112,30 L118,34" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <circle cx="108" cy="34" r="1.6" fill={INK_COLOR} />
      <path
        d="M72,68 Q84,56 96,62"
        stroke={INK_COLOR}
        strokeWidth="1.4"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M52,96 L58,100 M60,96 L62,100"
        stroke={INK_COLOR}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  ronin: () => (
    <>
      <ellipse cx="80" cy="100" rx="42" ry="3" fill="var(--es-wash)" />
      <path d="M80,100 L80,46" stroke={INK_COLOR} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M80,74 Q64,68 54,74 M80,60 Q66,54 58,60 M80,48 Q70,44 64,48"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M80,74 Q96,68 106,74 M80,60 Q94,54 102,60 M80,48 Q90,44 96,48"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24,104 Q40,102 54,104"
        stroke={INK_COLOR}
        strokeWidth="1.2"
        opacity="0.4"
        fill="none"
      />
    </>
  ),
  scanner: () => (
    <>
      <ellipse cx="80" cy="100" rx="30" ry="2.4" fill="var(--es-wash)" />
      <path d="M80,24 L80,34" stroke={INK_COLOR} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M62,36 L98,36" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M64,38 Q60,58 64,78 Q68,86 80,86 Q92,86 96,78 Q100,58 96,38 Z"
        fill="var(--es-wash)"
        stroke={INK_COLOR}
        strokeWidth="2"
      />
      <path d="M66,50 L94,50 M66,68 L94,68" stroke={INK_COLOR} strokeWidth="1" opacity="0.5" />
      <path d="M62,88 L98,88" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="62" r="3" fill={ACCENT_COLOR} opacity="0.7" />
    </>
  ),
  buki: () => (
    <>
      <ellipse cx="80" cy="98" rx="42" ry="3" fill="var(--es-wash)" />
      <path d="M40,36 L120,92" stroke={INK_COLOR} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M120,36 L40,92" stroke={INK_COLOR} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="40" cy="36" r="3" fill={INK_COLOR} />
      <circle cx="120" cy="36" r="3" fill={INK_COLOR} />
      <path
        d="M36,92 L44,92 M116,92 L124,92"
        stroke={INK_COLOR}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
  jutsu: () => (
    <>
      <ellipse cx="80" cy="104" rx="36" ry="3" fill="var(--es-wash)" />
      <path
        d="M64,104 L64,94 Q64,88 72,88 L88,88 Q96,88 96,94 L96,104 Z"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="var(--es-wash)"
      />
      <path
        d="M80,88 Q76,72 68,66 Q58,60 54,48"
        stroke={INK_COLOR}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M80,88 Q86,76 96,72"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="54" cy="44" rx="14" ry="8" fill={INK_COLOR} opacity="0.75" />
      <ellipse cx="100" cy="68" rx="10" ry="6" fill={INK_COLOR} opacity="0.65" />
      <path
        d="M60,104 L60,108 M100,104 L100,108"
        stroke={INK_COLOR}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  ),
  arena: () => (
    <>
      <circle cx="58" cy="60" r="22" fill="var(--es-wash)" stroke={INK_COLOR} strokeWidth="2" />
      <circle cx="102" cy="60" r="22" fill="none" stroke={INK_COLOR} strokeWidth="2" />
      <path d="M78,60 L82,60" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M58,38 Q58,60 58,82 M102,38 Q102,60 102,82"
        stroke={INK_COLOR}
        strokeWidth="0.8"
        opacity="0.3"
      />
    </>
  ),
  atemi: () => (
    <>
      <path
        d="M30,86 Q60,60 92,50 Q118,44 130,42"
        stroke={INK_COLOR}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.92"
      />
      <circle cx="128" cy="42" r="4" fill={ACCENT_COLOR} />
      <path
        d="M34,88 L42,94 M48,88 L56,94"
        stroke={INK_COLOR}
        strokeWidth="1.2"
        opacity="0.35"
        strokeLinecap="round"
      />
    </>
  ),
  sengoku: () => (
    <>
      <ellipse cx="80" cy="100" rx="48" ry="3" fill="var(--es-wash)" />
      <path d="M44,100 L44,34" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <path d="M80,100 L80,28" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <path d="M116,100 L116,36" stroke={INK_COLOR} strokeWidth="2" strokeLinecap="round" />
      <path d="M44,34 L64,36 L60,50 L44,48 Z" fill={INK_COLOR} opacity="0.8" />
      <path d="M80,28 L104,30 L100,46 L80,44 Z" fill={ACCENT_COLOR} opacity="0.8" />
      <path d="M116,36 L132,38 L128,50 L116,48 Z" fill={INK_COLOR} opacity="0.6" />
    </>
  ),
  hattori: () => (
    <>
      <ellipse cx="80" cy="100" rx="40" ry="3" fill="var(--es-wash)" />
      <path
        d="M80,28 L86,54 L112,60 L86,66 L80,92 L74,66 L48,60 L74,54 Z"
        fill={INK_COLOR}
        opacity="0.88"
      />
      <circle cx="80" cy="60" r="4" fill="var(--bg, #030308)" />
      <circle cx="80" cy="60" r="4" stroke={INK_COLOR} strokeWidth="1" fill="none" />
    </>
  ),
  kotoba: () => (
    <>
      <path d="M34,34 L48,26 L94,72 L84,82 Z" fill={INK_COLOR} opacity="0.85" />
      <path
        d="M88,76 Q104,88 116,88 Q124,88 124,80 Q124,72 112,68"
        stroke={INK_COLOR}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M108,94 Q116,100 108,104 Q100,100 108,94 Z"
        fill={ACCENT_COLOR}
        opacity="0.85"
      />
      <path
        d="M40,40 L30,50"
        stroke={INK_COLOR}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </>
  ),
  mitsuke: () => (
    <>
      <ellipse cx="80" cy="96" rx="56" ry="3" fill="var(--es-wash)" />
      <path d="M24,92 L56,52 L74,74 L96,40 L136,92 Z" fill={INK_COLOR} opacity="0.88" />
      <path
        d="M56,52 L64,62 M96,40 L104,52"
        stroke="var(--bg, #030308)"
        strokeWidth="2"
        opacity="0.6"
      />
      <path
        d="M30,80 Q50,76 72,80 M90,72 Q108,68 128,72"
        stroke={INK_COLOR}
        strokeWidth="1"
        opacity="0.35"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="112" cy="32" r="5" fill="var(--es-wash)" stroke={INK_COLOR} strokeWidth="1" />
    </>
  ),
  amaterasu: () => (
    <>
      <circle cx="80" cy="60" r="18" fill="var(--es-wash)" stroke={INK_COLOR} strokeWidth="2" />
      <path
        d="M80,60 L80,20 M80,60 L118,32 M80,60 L128,68 M80,60 L114,98 M80,60 L80,108 M80,60 L42,98 M80,60 L32,68 M80,60 L46,32"
        stroke={INK_COLOR}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="118" cy="32" r="3" fill={INK_COLOR} />
      <circle cx="42" cy="98" r="2.4" fill={INK_COLOR} opacity="0.6" />
      <circle cx="128" cy="68" r="2.4" fill={INK_COLOR} opacity="0.6" />
      <circle cx="80" cy="60" r="6" fill={ACCENT_COLOR} opacity="0.75" />
    </>
  ),
  kagami: () => (
    <>
      <ellipse cx="80" cy="100" rx="32" ry="2.4" fill="var(--es-wash)" />
      <circle cx="80" cy="56" r="26" fill="var(--es-wash)" stroke={INK_COLOR} strokeWidth="2" />
      <circle
        cx="80"
        cy="56"
        r="20"
        stroke={INK_COLOR}
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M80,82 L80,98 M70,98 L90,98"
        stroke={INK_COLOR}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M66,48 Q72,40 82,42"
        stroke="var(--bg, #030308)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
    </>
  ),
  shingan: () => (
    <>
      <ellipse cx="80" cy="102" rx="38" ry="2.4" fill="var(--es-wash)" />
      <path
        d="M40,64 Q80,30 120,64 Q80,96 40,64 Z"
        fill="var(--es-wash)"
        stroke={INK_COLOR}
        strokeWidth="2.2"
      />
      <circle cx="80" cy="64" r="14" fill="none" stroke={INK_COLOR} strokeWidth="1.8" />
      <circle cx="80" cy="64" r="6" fill={INK_COLOR} opacity="0.85" />
      <path
        d="M40,64 L26,64 M120,64 L134,64"
        stroke={INK_COLOR}
        strokeWidth="1.4"
        opacity="0.55"
        strokeLinecap="round"
      />
    </>
  ),
  enso: () => (
    <>
      <path
        d="M108,44 Q120,60 114,78 Q104,96 82,98 Q58,98 46,80 Q38,60 52,44 Q68,30 90,34"
        stroke={INK_COLOR}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.92"
      />
      <circle cx="90" cy="34" r="3" fill={INK_COLOR} />
    </>
  ),
};

/**
 * Props common to every state. The discriminated union below adds the
 * state-specific `state` + `cta` constraints.
 */
interface EmptyStateBaseProps {
  /** Module ID — picks the motif + tint. Unknown values fall back to `enso`. */
  readonly module: EmptyStateModule;
  /** Override the default title for this module/state pair. */
  readonly title?: ReactNode;
  /** Override the default sub-line. */
  readonly sub?: ReactNode;
  /** Secondary action (ghost). Same anchor/button rule as `cta`. */
  readonly secondary?: EmptyStateAction;
  /**
   * Compact layout — smaller motif + tighter padding for dense panels.
   * Pre-A.1 boolean form. New code should prefer `size="compact"`;
   * this stays for backward compat (every shipped consumer that sets
   * `compact={true}` keeps rendering identically).
   */
  readonly compact?: boolean;
  /**
   * A.1 consolidation (2026-05-14) — semantic tone overlay (default
   * `info` = no visual change vs. today). `warning` paints the title
   * gold; `error` paints the title torii-red. Orthogonal to the
   * module-derived `tint` wash and to `state="error"` (which adds the
   * torii-slash overlay on top of the motif).
   */
  readonly tone?: EmptyStateTone;
  /**
   * A.1 consolidation (2026-05-14) — discrete size axis. Default
   * `regular`. `compact` mirrors the legacy boolean prop (same visual
   * + class outcome). `hero` is the net-new editorial variant — larger
   * padding, Fraunces title, optional kanji watermark slot. Explicit
   * `size` takes precedence over the `compact` boolean.
   */
  readonly size?: EmptyStateSize;
  /**
   * A.1 consolidation (2026-05-14) — illustration override. When a
   * `EmptyStateModule` string is passed, use THAT module's motif (e.g.
   * render a scanner motif on a buki surface). When a `ReactNode` is
   * passed, render it verbatim in place of the motif slot. When
   * omitted, the module-derived sumi-e motif renders (current behavior).
   */
  readonly illustration?: EmptyStateModule | ReactNode;
  /**
   * A.1 consolidation (2026-05-14) — hero-size decorative kanji
   * watermark. `true` uses the module-default glyph (`KANJI_BY_MODULE`);
   * a string overrides with custom kanji. Only rendered when
   * `size === 'hero'` — ignored on regular / compact sizes (the glyph
   * cell does not exist in those layouts).
   */
  readonly watermark?: boolean | string;
  /**
   * A.1 consolidation (2026-05-14) — search query, only meaningful
   * when `state === 'search-narrowed'`. Substituted into the `{query}`
   * placeholder in the resolved sub-line, wrapped in
   * `<output aria-live="polite">` so assistive tech announces the
   * search-term update.
   */
  readonly searchQuery?: string;
  /**
   * A.1 consolidation (2026-05-14) — optional mono error code rendered
   * below the description. No tone / state gating — render whenever
   * provided. Intended for support / debug surfaces ("NET_TIMEOUT",
   * "ERR_UPSTREAM_502") so users can quote the exact code.
   */
  readonly errorCode?: string;
  /** Stable test id for E2E + unit-test selectors. */
  readonly testId?: string;
  /** Additional className to compose with the design-system base classes. */
  readonly className?: string;
}

/**
 * Empty-state branch — `cta` is required (E3.S2). The CTA must be a
 * verb-led label with a canonical href; build fails if any caller omits.
 */
export interface EmptyStateEmptyProps extends EmptyStateBaseProps {
  readonly state?: 'empty';
  /**
   * Primary CTA — REQUIRED on `state="empty"`. Renders an `<a>` (the
   * href is mandatory and is validated against the same-origin /
   * https / mailto / hash allowlist; rejected schemes fall back to a
   * `<button>` so the action still surfaces).
   */
  readonly cta: EmptyStateEmptyAction;
}

/**
 * Loading-state branch — `cta` is optional. Loading states rarely surface
 * actions but a "Cancel" / "Skip" button is still allowed.
 */
export interface EmptyStateLoadingProps extends EmptyStateBaseProps {
  readonly state: 'loading';
  readonly cta?: EmptyStateAction;
}

/**
 * Error-state branch — `cta` is optional. Error states usually surface a
 * "Retry" or "Back to dashboard" action but the diagonal-slash motif is
 * actionable on its own.
 */
export interface EmptyStateErrorProps extends EmptyStateBaseProps {
  readonly state: 'error';
  readonly cta?: EmptyStateAction;
}

/**
 * Disabled-state branch — `cta` is optional. When omitted, defaults to
 * `DISABLED_DEFAULT_CTA` ({ label: 'Open Flags', href: '/admin/flags' })
 * per E3.S3 contract. Surfaces flag-off features with a forward path to
 * the admin flags panel.
 */
export interface EmptyStateDisabledProps extends EmptyStateBaseProps {
  readonly state: 'disabled';
  readonly cta?: EmptyStateAction;
}

/**
 * Filter-narrowed branch — `cta` is optional. Used when the surface
 * has data but the current filter set hides every row. The canonical
 * CTA is a "Clear filters" button that resets the filter state.
 */
export interface EmptyStateFilterNarrowedProps extends EmptyStateBaseProps {
  readonly state: 'filter-narrowed';
  readonly cta?: EmptyStateAction;
}

/**
 * Search-narrowed branch — `cta` is optional. Used when a search
 * input returns zero results. Pair with `searchQuery` so the rendered
 * sub-line includes the user's query inside a live region.
 */
export interface EmptyStateSearchNarrowedProps extends EmptyStateBaseProps {
  readonly state: 'search-narrowed';
  readonly cta?: EmptyStateAction;
}

/**
 * Discriminated-union props — TypeScript narrows the `cta` shape based
 * on the `state` literal. E3.S2 (audit/REMEDIATION-PLAN lines 416-420)
 * makes this a build-time invariant for the `empty` branch. E3.S3 adds
 * the `disabled` arm. A.1 consolidation (2026-05-14) adds the
 * `filter-narrowed` + `search-narrowed` arms.
 */
export type EmptyStateProps =
  | EmptyStateEmptyProps
  | EmptyStateLoadingProps
  | EmptyStateErrorProps
  | EmptyStateDisabledProps
  | EmptyStateFilterNarrowedProps
  | EmptyStateSearchNarrowedProps;

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction | EmptyStateEmptyAction;
  variant: 'primary' | 'ghost';
}) {
  const className = `btn btn-${variant}`;
  // Render as anchor only when the href passes the scheme allowlist; this
  // closes the React-default `javascript:` / `data:` URL XSS class even if
  // a future caller passes a tainted href via uncontrolled input. Falls
  // back to a button (no navigation) on a rejected scheme so the action
  // still surfaces visually.
  if (isSafeHref(action.href)) {
    return (
      <a className={className} href={action.href} onClick={action.onClick}>
        {action.label}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

/**
 * A.1 consolidation (2026-05-14) — resolve the effective size axis.
 * Explicit `size` always wins. If `size` is omitted, the legacy
 * `compact` boolean takes over (so `<EmptyState compact />` keeps
 * resolving to `size="compact"`). Default — when neither is set — is
 * `regular`, identical to today's layout.
 */
function resolveSize(
  size: EmptyStateSize | undefined,
  compact: boolean,
): EmptyStateSize {
  if (size) return size;
  return compact ? 'compact' : 'regular';
}

/**
 * A.1 consolidation (2026-05-14) — split a sub-line on the `{query}`
 * placeholder. Used for `state="search-narrowed"` so the rendered
 * description wraps the actual search term in `<output aria-live>` for
 * live-region announcement. When the source is not a string or has no
 * placeholder, returns the input unchanged for verbatim rendering.
 */
function interpolateSearchQuery(
  source: ReactNode,
  query: string,
): ReactNode {
  if (typeof source !== 'string' || !source.includes('{query}')) return source;
  const parts = source.split('{query}');
  return parts.flatMap((segment, index) => {
    if (index === 0) return [segment];
    return [
      <output key={`q-${index}`} aria-live="polite">
        {query}
      </output>,
      segment,
    ];
  });
}

/**
 * Sumi-e EmptyState — design-system primitive.
 *
 * Discriminated-union props: `state="empty"` (the default) requires a
 * `cta` with a canonical href; `state="loading"` / `state="error"` /
 * `state="disabled"` / `state="filter-narrowed"` / `state="search-narrowed"`
 * accept an optional `cta`. See E3.S2 in the remediation plan and
 * the A.1 EmptyState design brief.
 *
 * A.1 consolidation extends the primitive with `tone` (info / warning /
 * error), `size` (regular / compact / hero), `illustration` override,
 * `watermark` (hero-only kanji glyph), `searchQuery` (substitutes into
 * the `{query}` placeholder for `state="search-narrowed"`) and
 * `errorCode` (optional mono error code below the sub-line). Every new
 * prop is additive — defaults preserve today's rendering byte-for-byte.
 */
export function EmptyState(props: EmptyStateProps) {
  const {
    module,
    title,
    sub,
    cta,
    secondary,
    compact = false,
    tone,
    size,
    illustration,
    watermark,
    searchQuery,
    errorCode,
    testId,
    className,
  } = props;
  const state = props.state ?? 'empty';
  const moduleKey: EmptyStateModule = MOTIFS[module] ? module : 'enso';
  const tint = TINT_BY_MODULE[moduleKey];
  const copy = resolveCopy(moduleKey, state);
  const finalTitle = title ?? copy.title;
  const subSource = sub ?? copy.sub;
  // Search-query interpolation only runs on `state="search-narrowed"`
  // with an explicit `searchQuery`. Every other state path renders the
  // sub source verbatim — preserves byte-for-byte parity with today.
  const finalSub =
    state === 'search-narrowed' && typeof searchQuery === 'string'
      ? interpolateSearchQuery(subSource, searchQuery)
      : subSource;
  const effectiveSize = resolveSize(size, compact);
  const effectiveTone: EmptyStateTone = tone ?? 'info';
  // Hero motif renders larger; compact stays at 120; regular keeps 160.
  // Equal aspect ratio (160:120) preserved so the existing svg viewBox
  // does not need a per-size rewrite.
  const motifSize =
    effectiveSize === 'compact' ? 120 : effectiveSize === 'hero' ? 220 : 160;
  // E3.S3 — when a surface is flag-disabled and the caller did not supply
  // a CTA, default to the Admin → Flags deep link so operators always have
  // a one-click path to flip the flag. Callers can opt out by passing an
  // explicit `cta` (or by setting it to `undefined` via spread, but the
  // common case is "no cta supplied" which we want to fill in).
  const finalCta =
    cta ?? (state === 'disabled' ? DISABLED_DEFAULT_CTA : undefined);

  // Resolve the illustration source. Order:
  //   1. caller passed a module-id string → render that module's motif
  //   2. caller passed a ReactNode → render verbatim (custom illustration)
  //   3. omitted → module-derived sumi-e motif (current behavior)
  // When the string is not a known module id, we fall through to the
  // ReactNode branch so the rendered output is the supplied value (or
  // null if the string is empty). `MOTIFS[module]` is a closed-key map
  // so the membership check doubles as the type guard.
  const customIllustrationModule =
    typeof illustration === 'string' && illustration in MOTIFS
      ? (illustration as EmptyStateModule)
      : undefined;
  const IllustrationMotif = customIllustrationModule
    ? MOTIFS[customIllustrationModule]
    : MOTIFS[moduleKey];
  const customIllustrationNode =
    illustration && customIllustrationModule === undefined ? illustration : undefined;

  // Compose root class additively. Default render emits exactly the
  // pre-A.1 class set ("empty-state tint-<x> state-<x> [compact]") so
  // every shipped consumer keeps the same className string. Tone +
  // size BEM suffixes are added only when the caller opts out of the
  // defaults.
  const rootClass = [
    'empty-state',
    `tint-${tint}`,
    `state-${state}`,
    effectiveSize === 'compact' ? 'compact' : '',
    effectiveTone !== 'info' ? `empty-state--tone-${effectiveTone}` : '',
    effectiveSize !== 'regular' ? `empty-state--size-${effectiveSize}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // ARIA-live mapping. Loading + filter-narrowed + search-narrowed are
  // dynamic narrowing states whose copy changes in response to user
  // input — keep them as `polite` so AT announces the update. Every
  // other state stays `off` (matches pre-A.1 behavior for empty /
  // error / disabled).
  const ariaLive =
    state === 'loading' || state === 'filter-narrowed' || state === 'search-narrowed'
      ? 'polite'
      : 'off';

  // Hero title renders as <h2> so the page outline picks up the
  // editorial heading. Regular + compact keep <div> for backward
  // compatibility (no shipped consumer renders an h2 today).
  const TitleTag: 'h2' | 'div' = effectiveSize === 'hero' ? 'h2' : 'div';

  // Watermark — hero-only kanji glyph behind the content. Resolves
  // `watermark === true` to the module-default kanji, a string prop
  // to its literal value, and ignores anything else.
  const watermarkGlyph =
    effectiveSize === 'hero' && watermark
      ? typeof watermark === 'string'
        ? watermark
        : KANJI_BY_MODULE[moduleKey]
      : undefined;

  return (
    <div
      className={rootClass}
      role={state === 'error' ? 'alert' : 'status'}
      aria-live={ariaLive}
      data-testid={testId ?? 'empty-state'}
      data-state={state}
      data-module={moduleKey}
      data-tone={effectiveTone !== 'info' ? effectiveTone : undefined}
      data-size={effectiveSize !== 'regular' ? effectiveSize : undefined}
    >
      {watermarkGlyph ? (
        <div className="empty-state__watermark" aria-hidden="true">
          {watermarkGlyph}
        </div>
      ) : null}
      <div
        className="empty-motif"
        style={{ width: motifSize, height: (motifSize / 160) * 120 }}
      >
        {customIllustrationNode ? (
          customIllustrationNode
        ) : (
          <svg
            viewBox="0 0 160 120"
            width="100%"
            height="100%"
            aria-hidden="true"
            focusable="false"
          >
            <IllustrationMotif />
            {state === 'error' && (
              <path
                d="M24,24 L136,96"
                stroke={RED_COLOR}
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.9"
              />
            )}
          </svg>
        )}
      </div>
      <div className="empty-copy">
        <TitleTag className="empty-title">{finalTitle}</TitleTag>
        {finalSub ? <div className="empty-sub">{finalSub}</div> : null}
        {errorCode ? (
          <code className="empty-state__error-code">{errorCode}</code>
        ) : null}
        {(finalCta || secondary) && (
          <div className="empty-actions">
            {finalCta ? <ActionButton action={finalCta} variant="ghost" /> : null}
            {secondary ? <ActionButton action={secondary} variant="ghost" /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
