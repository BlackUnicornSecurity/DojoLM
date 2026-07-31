// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * File: FindingsCategoryGroup.tsx
 * Purpose: TICKET-S-306 — V1-canonical findings grouping primitive for
 *          /admin/scanner. Renders the Findings panel body grouped by the
 *          3 V1-canonical category classes (Direct Override / Jailbreak /
 *          Encoded) plus the explicit `'other'` residual bucket.
 *
 * Mounted inside the existing `<Panel title="Findings">` in `ScannerClient.tsx`.
 * Extracted to a sibling primitive because the host file already crossed the
 * project 800-line ceiling under TICKET-A-405. Mirrors the A-405 / S-302
 * extraction pattern.
 *
 * Surface contract:
 *   - Takes the already-built `readonly AttackRowItem[]` + the parallel
 *     `readonly FindingCategoryClass[]` (one entry per item, in the same
 *     order). Caller is responsible for pre-bucketing so this primitive
 *     stays a pure render layer (no business logic, easy to unit-test).
 *   - Renders one section per category class IN THE CANONICAL ORDER
 *     defined by `FINDING_CATEGORY_CLASSES`. A section is suppressed when
 *     its bucket is empty so the panel doesn't show 4 hollow headers.
 *   - When ALL buckets are empty, renders the existing wb-hint copy via
 *     the `emptyMessage` prop so the consumer keeps full control of the
 *     "no scan run yet" vs "clean" distinction.
 *
 * Closed-enum + R-T1 §10.16 discipline:
 *   - Section heading copy, aria-label, className, and test-id all flow
 *     through the closed maps in `finding-categorization.ts`. No template
 *     literal mints any of these from a raw enum value.
 *   - The category-class array is iterated via `FINDING_CATEGORY_CLASSES`
 *     (frozen tuple) — no caller-provided ordering can ever bypass the
 *     canonical order.
 *
 * Boundaries:
 *   - Does NOT add new admin routes or auth changes.
 *   - Does NOT modify the `<AttackRow>` design primitive (re-uses).
 *   - Does NOT modify S-301 / S-302 / A-405 panels.
 *   - Zero new npm deps.
 */

import type { ReactElement, ReactNode } from 'react';

import { AttackRow, type AttackRowItem } from '@/design';

import {
  FINDING_CATEGORY_CLASSES,
  FINDING_CATEGORY_CLASS_NAME,
  FINDING_CATEGORY_LABEL,
  FINDING_CATEGORY_TEST_ID,
  type FindingCategoryClass,
} from '@/lib/scanner/finding-categorization';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Categorized finding row — single co-located shape carrying both the
 * AttackRow render data AND the closed-enum category class. Pass-1
 * reviewer fold-in: prior contract took two parallel arrays
 * (`items[]` + `categories[]`) which were silent-misalign-prone. Pairing
 * them here makes the contract impossible to break at the call site.
 */
export interface CategorizedFindingRow {
  readonly item: AttackRowItem;
  readonly category: FindingCategoryClass;
}

export interface FindingsCategoryGroupProps {
  /**
   * The findings to render, already capped + mapped to `AttackRowItem`s
   * AND tagged with their `FindingCategoryClass` by the consumer
   * (`ScannerClient.tsx`). The primitive is a pure render layer — it
   * does NOT re-cap, re-sanitize, re-map, or re-categorize.
   */
  readonly rows: readonly CategorizedFindingRow[];
  /**
   * Copy shown when `rows` is empty. The consumer owns the distinction
   * between "no scan run yet" and "scan ran but came back clean" so
   * we accept the message as a prop.
   */
  readonly emptyMessage: string;
  /**
   * Optional helper line rendered under the empty-state title (design
   * `.empty p`). Consumer passes it only for the "no scan run yet" case;
   * omitted for the "clean" case where no helper copy is specified.
   */
  readonly emptyHelper?: ReactNode;
  /** Stable test-id for the empty-state node. Defaults to `'s306-empty'`. */
  readonly emptyTestId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Group rows by category class, preserving insertion order within each
 * bucket. Pure function — no side effects, deterministic, immutable.
 *
 * Pass-1 reviewer fold-in: refactored to immutable `Object.fromEntries`
 * + `filter` per bucket (project R-T1 immutability rule:
 * "ALWAYS create new objects, NEVER mutate existing ones"). The prior
 * .push-based accumulator violated the rule even though the buckets
 * were function-local. The single-row-with-category contract also
 * eliminates the parallel-array misalignment risk.
 *
 * Returns a frozen record keyed by `FindingCategoryClass`, with each
 * value being a fresh `AttackRowItem[]`.
 */
function groupRowsByCategory(
  rows: readonly CategorizedFindingRow[],
): Readonly<Record<FindingCategoryClass, readonly AttackRowItem[]>> {
  return Object.freeze(
    Object.fromEntries(
      FINDING_CATEGORY_CLASSES.map((cat) => [
        cat,
        Object.freeze(rows.filter((r) => r.category === cat).map((r) => r.item)),
      ]),
    ) as Record<FindingCategoryClass, readonly AttackRowItem[]>,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Render the findings list grouped by V1-canonical category class.
 *
 * @see TICKET-S-306 — Findings categorization spec
 */
export function FindingsCategoryGroup({
  rows,
  emptyMessage,
  emptyHelper,
  emptyTestId = 's306-empty',
}: FindingsCategoryGroupProps): ReactElement {
  const buckets = groupRowsByCategory(rows);

  // All-empty short-circuit. Renders the design's centered in-table empty
  // state (kanji + title + optional helper) — the reference ceremony, not a
  // bare skeleton row. Stable empty-state node retained for AT + tests.
  if (rows.length === 0) {
    return (
      <div className="empty" data-testid={emptyTestId}>
        <div className="kj" aria-hidden="true">
          見
        </div>
        <h4>{emptyMessage}</h4>
        {emptyHelper ? <p>{emptyHelper}</p> : null}
      </div>
    );
  }

  return (
    // Outer test-id `scanner-findings-list` preserved from the pre-S-306
    // ungrouped render so sister tests (page.test.tsx, future flows) keep
    // detecting the populated findings region without churn. Adds the
    // S-306-specific `s306-findings-grouped` test-id alongside.
    <div data-testid="scanner-findings-list">
      <div
        data-testid="s306-findings-grouped"
        aria-label="Scanner findings grouped by category"
      >
      {FINDING_CATEGORY_CLASSES.map((cat) => {
        const bucket = buckets[cat];
        if (bucket.length === 0) return null;
        const label = FINDING_CATEGORY_LABEL[cat];
        const className = FINDING_CATEGORY_CLASS_NAME[cat];
        const testId = FINDING_CATEGORY_TEST_ID[cat];
        const headingId = `${testId}-heading`;
        return (
          <section
            key={cat}
            className={className}
            aria-labelledby={headingId}
            data-testid={testId}
          >
            <h3
              id={headingId}
              className="yr4-cat-heading"
              data-testid={`${testId}-heading`}
            >
              {label}
              <span className="yr4-cat-count" aria-label={`${label} count ${bucket.length}`}>
                {' '}
                · {bucket.length}
              </span>
            </h3>
            <div
              className="yr4-data-list"
              role="list"
              data-testid={`${testId}-list`}
              aria-label={`${label} findings`}
            >
              {bucket.map((item) => (
                <AttackRow key={item.id ?? item.title} item={item} />
              ))}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}
