// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import type {
  EmptyStateAction,
  EmptyStateEmptyAction,
  EmptyStateState,
} from './EmptyState.types';

const DEFAULT_EMPTY_CTA: EmptyStateEmptyAction = {
  label: 'Open lineage feed',
  href: '/admin/amaterasu',
};

export interface GraphPlaceholderProps {
  /**
   * Visual state. `'empty'` = no data, `'loading'` = data inflight,
   * `'error'` = render or fetch failed. Defaults to `'empty'`.
   */
  readonly state?: EmptyStateState;
  /**
   * Override the default title. When omitted, falls back to the
   * Amaterasu module copy from the EmptyState matrix.
   */
  readonly title?: ReactNode;
  /** Override the default sub-line. */
  readonly sub?: ReactNode;
  /**
   * Optional CTA (e.g. `"Retry render"`, `"Open lineage feed"`). On
   * `state="empty"` the CTA must include an `href` (E3.S2 — the
   * EmptyState discriminated union enforces this). When omitted on
   * `state="empty"`, GraphPlaceholder substitutes a canonical
   * "Open lineage feed" CTA pointed at the Amaterasu admin route so
   * the user always has a forward path.
   */
  readonly cta?: EmptyStateAction | EmptyStateEmptyAction;
  readonly secondary?: EmptyStateAction;
  /** Compact variant for inline panel placement. */
  readonly compact?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Sumi-e-aware fallback when the Amaterasu lineage graph (DnaGraph)
 * cannot render — no nodes available, fetch error, render exception
 * caught by an ErrorBoundary, or pre-launch state. Composes
 * `<EmptyState module="amaterasu">` so the motif + tint + copy track
 * the YU.3 EmptyState matrix instead of a one-off graphic.
 *
 * The branched render below is required because EmptyStateProps is a
 * discriminated union (E3.S2): the `cta: required-with-href` constraint
 * only narrows when `state` is the `"empty"` literal — TypeScript can't
 * see through a runtime `EmptyStateState` variable, so we render one
 * branch per literal.
 */
export function GraphPlaceholder({
  state = 'empty',
  title,
  sub,
  cta,
  secondary,
  compact,
  className,
  testId,
}: GraphPlaceholderProps) {
  const finalTestId = testId ?? 'graph-placeholder';

  if (state === 'loading') {
    return (
      <EmptyState
        module="amaterasu"
        state="loading"
        title={title}
        sub={sub}
        cta={cta as EmptyStateAction | undefined}
        secondary={secondary}
        compact={compact}
        className={className}
        testId={finalTestId}
      />
    );
  }

  if (state === 'error') {
    return (
      <EmptyState
        module="amaterasu"
        state="error"
        title={title}
        sub={sub}
        cta={cta as EmptyStateAction | undefined}
        secondary={secondary}
        compact={compact}
        className={className}
        testId={finalTestId}
      />
    );
  }

  // state === 'empty' — discriminated union requires a CTA with `href`.
  // If the consumer omitted `cta` (or passed an action without `href`),
  // fall back to the canonical Amaterasu lineage-feed link.
  const emptyCta: EmptyStateEmptyAction =
    cta && typeof cta.href === 'string'
      ? (cta as EmptyStateEmptyAction)
      : DEFAULT_EMPTY_CTA;

  return (
    <EmptyState
      module="amaterasu"
      state="empty"
      title={title}
      sub={sub}
      cta={emptyCta}
      secondary={secondary}
      compact={compact}
      className={className}
      testId={finalTestId}
    />
  );
}
