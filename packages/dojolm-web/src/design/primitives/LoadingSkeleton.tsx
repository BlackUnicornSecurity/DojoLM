// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

// A.2 anchor primitive — canonical LoadingSkeleton set.
// Five atomic building blocks (Box / Line / Lines / Circle / Table) exposed
// both individually and via a Skeleton namespace so consumers write either
// `<Skeleton.Box />` or `<SkeletonBox />`. Pre-composed module skeletons live
// in src/design/skeletons/ and compose these atoms.
//
// Visual + motion specs are owned by .skel rules in primitives.css. Every
// atom carries aria-hidden="true" by default — only the host container that
// wraps the tree should announce state via aria-busy + aria-live.
//
// Tokens consumed: --skel-base · --skel-shimmer · --skel-shimmer-duration
// (tokens.css). Box radius = --r-md (8px); pill radius = --r-bar (4px).

type Radius = 'card' | 'pill' | 'circle' | 'none';

function radiusClass(radius: Radius): string {
  switch (radius) {
    case 'pill':
      return 'skel skel--radius-pill';
    case 'circle':
      return 'skel skel--radius-circle';
    case 'none':
      return 'skel skel--radius-none';
    case 'card':
    default:
      return 'skel skel--radius-card';
  }
}

function joinClass(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(' ');
}

// ── <SkeletonBox> ─────────────────────────────────────────────────────────

export interface SkeletonBoxProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: Radius;
  aspectRatio?: CSSProperties['aspectRatio'];
  className?: string;
  style?: CSSProperties;
}

export function SkeletonBox({
  width = '100%',
  height = '80px',
  radius = 'card',
  aspectRatio,
  className,
  style,
}: SkeletonBoxProps) {
  const mergedStyle: CSSProperties = {
    width,
    height: aspectRatio ? undefined : height,
    aspectRatio,
    ...style,
  };
  return (
    <div
      aria-hidden="true"
      className={joinClass(radiusClass(radius), className)}
      style={mergedStyle}
    />
  );
}

// ── <SkeletonLine> ────────────────────────────────────────────────────────

export interface SkeletonLineProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  className?: string;
  style?: CSSProperties;
}

export function SkeletonLine({
  width = '100%',
  height = '16px',
  className,
  style,
}: SkeletonLineProps) {
  return (
    <div
      aria-hidden="true"
      className={joinClass('skel skel--radius-pill', className)}
      style={{ width, height, ...style }}
    />
  );
}

// ── <SkeletonLines> ───────────────────────────────────────────────────────

// Deterministic natural-variation widths. Index-based so renders are
// stable across remounts (snapshot-safe); design spec calls for last
// line ~50-70% to read as paragraph-end, not truncation.
const NATURAL_WIDTHS = ['96%', '88%', '92%', '78%', '85%', '72%', '90%', '82%'] as const;
const LAST_LINE_WIDTHS = ['58%', '64%', '70%', '52%', '67%'] as const;

export interface SkeletonLinesProps {
  count?: number;
  density?: 'default' | 'tight';
  widths?: ReadonlyArray<CSSProperties['width']>;
  lineHeight?: CSSProperties['height'];
  className?: string;
  style?: CSSProperties;
}

export function SkeletonLines({
  count = 3,
  density = 'default',
  widths,
  lineHeight = '16px',
  className,
  style,
}: SkeletonLinesProps) {
  const computedWidths: ReadonlyArray<CSSProperties['width']> =
    widths ??
    (() => {
      const out: CSSProperties['width'][] = [];
      const total = Math.max(1, count);
      for (let i = 0; i < total - 1; i++) {
        out.push(NATURAL_WIDTHS[i % NATURAL_WIDTHS.length]);
      }
      out.push(LAST_LINE_WIDTHS[total % LAST_LINE_WIDTHS.length]);
      return out;
    })();
  return (
    <div
      aria-hidden="true"
      className={joinClass('skel-lines', density === 'tight' && 'skel-lines--tight', className)}
      style={style}
    >
      {computedWidths.map((w, i) => (
        <SkeletonLine key={i} width={w} height={lineHeight} />
      ))}
    </div>
  );
}

// ── <SkeletonCircle> ──────────────────────────────────────────────────────

export interface SkeletonCircleProps {
  size?: CSSProperties['width'];
  className?: string;
  style?: CSSProperties;
}

export function SkeletonCircle({ size = '40px', className, style }: SkeletonCircleProps) {
  return (
    <div
      aria-hidden="true"
      className={joinClass('skel skel--radius-circle', className)}
      style={{ width: size, height: size, flex: '0 0 auto', ...style }}
    />
  );
}

// ── <SkeletonTable> ───────────────────────────────────────────────────────

const HEADER_DEFAULT_WIDTHS = ['62%', '78%', '70%', '66%', '74%', '60%'] as const;
const CELL_DEFAULT_WIDTHS = ['100%', '92%', '85%', '78%', '88%', '70%'] as const;

export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  dense?: boolean;
  widths?: ReadonlyArray<CSSProperties['width']>;
  className?: string;
  style?: CSSProperties;
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  showHeader = true,
  dense = false,
  widths,
  className,
  style,
}: SkeletonTableProps) {
  const colCount = Math.max(1, cols);
  const rowCount = Math.max(0, rows);
  const headerWidths: ReadonlyArray<CSSProperties['width']> =
    widths ?? Array.from({ length: colCount }, (_, i) => HEADER_DEFAULT_WIDTHS[i % HEADER_DEFAULT_WIDTHS.length]);
  const cellWidths: ReadonlyArray<CSSProperties['width']> =
    widths ?? Array.from({ length: colCount }, (_, i) => CELL_DEFAULT_WIDTHS[i % CELL_DEFAULT_WIDTHS.length]);
  const gridTemplate = `repeat(${colCount}, minmax(0, 1fr))`;
  const lineHeight = dense ? '12px' : '14px';
  return (
    <div
      aria-hidden="true"
      className={joinClass('skel-table', dense && 'skel-table--dense', className)}
      style={style}
    >
      {showHeader && (
        <div className="skel-table__head" style={{ gridTemplateColumns: gridTemplate }}>
          {Array.from({ length: colCount }).map((_, c) => (
            <SkeletonLine key={c} width={headerWidths[c]} height="11px" />
          ))}
        </div>
      )}
      {Array.from({ length: rowCount }).map((_, r) => (
        <div key={r} className="skel-table__row" style={{ gridTemplateColumns: gridTemplate }}>
          {Array.from({ length: colCount }).map((_, c) => {
            // First column: id/name pill line. Last column: action pill box.
            // Middle columns alternate line vs pill-box for natural row rhythm.
            if (c === 0) {
              return <SkeletonLine key={c} width={cellWidths[c]} height={lineHeight} />;
            }
            if (c === colCount - 1) {
              return <SkeletonBox key={c} width="68%" height="24px" radius="pill" />;
            }
            const alternates = (r + c) % 2 === 0;
            return alternates ? (
              <SkeletonLine key={c} width={cellWidths[c]} height={lineHeight} />
            ) : (
              <SkeletonBox key={c} width={cellWidths[c]} height="20px" radius="pill" />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── <SkeletonHost> ────────────────────────────────────────────────────────
// Container element that wraps a skeleton tree. Carries aria-busy +
// aria-live so the page announces state once (atoms stay aria-hidden).

export interface SkeletonHostProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-busy' | 'aria-live' | 'aria-label'> {
  ariaLabel?: string;
  ariaBusy?: boolean;
  children?: ReactNode;
}

let warnedMissingLabel = false;

function isDev(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
}

function warnMissingLabel(): void {
  if (!isDev()) return;
  if (warnedMissingLabel) return;
  warnedMissingLabel = true;
  console.warn(
    '[SkeletonHost] `ariaBusy` is true but no `ariaLabel` was provided. ' +
      'A live region without an accessible name announces nothing useful to screen readers — ' +
      'supply a module-scoped label (e.g. "Loading Bushido Book", "Loading bounty programs") ' +
      'or set `ariaBusy={false}` if this host is decorative only.',
  );
}

export const __skeletonHostResetWarningsForTest = () => {
  warnedMissingLabel = false;
};

export function SkeletonHost({
  ariaLabel,
  ariaBusy = true,
  className,
  children,
  ...rest
}: SkeletonHostProps) {
  if (ariaBusy && !ariaLabel) {
    warnMissingLabel();
  }
  return (
    <div
      {...rest}
      className={joinClass('skel-host', className)}
      aria-busy={ariaBusy ? 'true' : undefined}
      aria-live={ariaBusy ? 'polite' : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

// ── Namespace export ──────────────────────────────────────────────────────
// Lets consumers write either `<Skeleton.Box />` (namespace form) or
// `<SkeletonBox />` (named-import form for tree-shaking).

export const Skeleton = {
  Box: SkeletonBox,
  Line: SkeletonLine,
  Lines: SkeletonLines,
  Circle: SkeletonCircle,
  Table: SkeletonTable,
  Host: SkeletonHost,
} as const;
