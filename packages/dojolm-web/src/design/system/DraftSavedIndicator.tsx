// SPDX-License-Identifier: Apache-2.0
/**
 * DraftSavedIndicator — F-8-009 (Wave 3hh).
 *
 * Visible indicator that pairs with the `useAdminFormDraft` hook to
 * surface "Draft saved" status on long-form admin surfaces. Rendered
 * next to the form's primary CTA so operators see immediate feedback
 * that their work-in-progress is persisted to sessionStorage.
 *
 * Composition:
 *   - Closed-enum status → label via `ADMIN_FORM_DRAFT_STATUS_COPY`.
 *   - role="status" + aria-live="polite" so SR users hear the save
 *     transition without interrupting the form-fill flow.
 *   - savedAt timestamp formatted via `toLocaleTimeString('en-US')`
 *     when present — matches the rest of the admin shell's locale-
 *     bound number/date copy. (F-8-013 is a separate followup for the
 *     i18n locale-aware path.)
 *
 * R-T1: status is a closed discriminator; timestamp is a Date
 * instance derived from `Date.now()` upstream. No operator-supplied
 * input lands in the DOM.
 */

"use client";

import {
  ADMIN_FORM_DRAFT_STATUS_COPY,
  type AdminFormDraftStatus,
} from "@/lib/hooks/use-admin-form-draft";

export interface DraftSavedIndicatorProps {
  readonly status: AdminFormDraftStatus;
  readonly savedAt: number | null;
  /** Stable test id. */
  readonly testId?: string;
  /** Additional className to compose. */
  readonly className?: string;
}

const STATUS_DOT_CLASS: Readonly<Record<AdminFormDraftStatus, string>> =
  Object.freeze({
    idle: "draft-indicator-dot draft-indicator-dot--idle",
    saving: "draft-indicator-dot draft-indicator-dot--saving",
    saved: "draft-indicator-dot draft-indicator-dot--saved",
    error: "draft-indicator-dot draft-indicator-dot--error",
  });

function formatTimestamp(ms: number): string {
  // Locale-aware time string. F-8-013 (the broader hardcoded-locale
  // sweep) is a separate followup; this surface explicitly opts into
  // the user's runtime locale by passing `undefined` to toLocaleTimeString.
  // The `hour12: false` keyword keeps the indicator compact (HH:MM)
  // even when the locale defaults to 12h with AM/PM.
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function DraftSavedIndicator({
  status,
  savedAt,
  testId,
  className,
}: DraftSavedIndicatorProps) {
  const rootClass = ["draft-saved-indicator", className ?? ""]
    .filter(Boolean)
    .join(" ");
  const showTimestamp = status === "saved" && savedAt !== null;
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={testId ?? "draft-saved-indicator"}
      data-status={status}
      className={rootClass}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: "var(--fg-dim)",
      }}
    >
      <span
        aria-hidden="true"
        className={STATUS_DOT_CLASS[status]}
        data-testid={testId ? `${testId}-dot` : "draft-saved-indicator-dot"}
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
        }}
      />
      <span
        data-testid={testId ? `${testId}-label` : "draft-saved-indicator-label"}
      >
        {ADMIN_FORM_DRAFT_STATUS_COPY[status]}
        {showTimestamp && (
          <>
            {" · "}
            <time dateTime={new Date(savedAt!).toISOString()}>
              {formatTimestamp(savedAt!)}
            </time>
          </>
        )}
      </span>
    </span>
  );
}
