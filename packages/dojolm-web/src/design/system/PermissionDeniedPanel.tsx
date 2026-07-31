// SPDX-License-Identifier: Apache-2.0
/**
 * YR.9.3 — PermissionDeniedPanel.
 *
 * Per-panel takeover for the 403 case. Wraps the design-system
 * EmptyState in `state="error"` mode and overlays the kanji `封`
 * (seal) glyph as a watermark, plus a role-aware sub-line. Used
 * when an API returns 403 for a panel the operator does not have
 * access to — e.g. a member operator hitting an admin-only sub-tab.
 *
 * Composition:
 *   - Uses the EmptyState `error` state so the diagonal-slash motif
 *     overlay still applies and the COPY catalog default ("Could not
 *     load") is the safe fallback.
 *   - The `role` prop is folded into a static role-label dictionary;
 *     no operator string is ever rendered raw. Unknown roles fall
 *     back to a generic "this view".
 *   - The kanji is a static literal — no operator-supplied glyph.
 *
 * Recommended use:
 *   <PermissionDeniedPanel
 *     module="hattori"
 *     requiredRole="admin"
 *     testId="hattori-forbidden"
 *   />
 *
 * Operators can supply a custom title/sub when the default copy is
 * too generic (e.g. "Member access required" when the panel is
 * member-restricted).
 */

import type { ReactNode } from 'react';
import type { EmptyStateAction, EmptyStateModule } from './EmptyState.types';
import { EmptyState } from './EmptyState';

const KANJI_SEAL = '封';

const ROLE_LABEL: Readonly<Record<string, string>> = {
  admin: 'admin',
  operator: 'operator',
  member: 'member',
  observer: 'observer',
};

function resolveRoleLabel(role: string | undefined): string {
  if (!role) return 'this view';
  return ROLE_LABEL[role] ?? 'this view';
}

export interface PermissionDeniedPanelProps {
  /** Module ID — picks the EmptyState motif + tint. */
  readonly module: EmptyStateModule;
  /**
   * Required role (`admin` | `operator` | `member` | `observer`).
   * Folded through a static label dictionary; unknown roles render
   * as "this view".
   */
  readonly requiredRole?: string;
  /** Override the default title — defaults to "Permission denied". */
  readonly title?: ReactNode;
  /**
   * Override the default sub — defaults to a role-aware sentence
   * built from `requiredRole`.
   */
  readonly sub?: ReactNode;
  /** Optional CTA — typically "Back to dashboard" or "Switch role". */
  readonly cta?: EmptyStateAction;
  /** Optional secondary action. */
  readonly secondary?: EmptyStateAction;
  /** Compact layout for dense panels. */
  readonly compact?: boolean;
  /** Stable test id for E2E + unit-test selectors. */
  readonly testId?: string;
  /** Additional className to compose with the design-system base classes. */
  readonly className?: string;
}

/**
 * Permission-denied panel — composed atop EmptyState (state="error").
 */
export function PermissionDeniedPanel({
  module,
  requiredRole,
  title = 'Permission denied',
  sub,
  cta,
  secondary,
  compact = false,
  testId,
  className,
}: PermissionDeniedPanelProps) {
  const roleLabel = resolveRoleLabel(requiredRole);
  const finalSub =
    sub ??
    (requiredRole
      ? `You don't have ${roleLabel} access to this panel.`
      : `You don't have access to this panel.`);

  const rootClass = ['permission-denied-panel', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      data-testid={testId ?? 'permission-denied-panel'}
      data-required-role={requiredRole ?? ''}
    >
      <div className="permission-denied-kanji" aria-hidden="true" lang="ja">
        {KANJI_SEAL}
      </div>
      <EmptyState
        module={module}
        state="error"
        title={title}
        sub={finalSub}
        cta={cta}
        secondary={secondary}
        compact={compact}
        testId={testId ? `${testId}-empty` : 'permission-denied-empty'}
      />
    </div>
  );
}
