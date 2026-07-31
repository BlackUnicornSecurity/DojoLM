// SPDX-License-Identifier: Apache-2.0
'use client';

import { type ReactNode } from 'react';

import { SegmentedSubTabs, type SegmentedSubTabItem } from './SegmentedSubTabs';

export interface PillTabItem {
  id: string;
  label: ReactNode;
}

export interface PillTabsProps {
  items: readonly PillTabItem[];
  active: string;
  onChange: (id: string) => void;
  /** Accessible label for the tab list. */
  ariaLabel?: string;
}

let deprecationWarned = false;
function warnDeprecation() {
  if (deprecationWarned) return;
  if (typeof process === 'undefined' || process.env.NODE_ENV === 'production') return;
  deprecationWarned = true;
  console.warn(
    '[Deprecated] <PillTabs> is a deprecation shim. Migrate to <SegmentedSubTabs mode="pill"> ' +
      'from @/design/primitives (anchor primitive B.2 of UI coherence plan v4).',
  );
}

/**
 * @deprecated Use `SegmentedSubTabs` (mode="pill") from
 * `@/design/primitives` instead. PillTabs is a thin re-export shim
 * kept for one release cycle so existing Buki / Jutsu / Kotoba /
 * Hattori / Kagami / Mitsuke / Scanner / validation callers continue
 * working without modification. The Phase 2 sweep will replace these
 * imports inline; the shim will then be removed.
 *
 * Behavior: identical to <SegmentedSubTabs mode="pill" /> with the
 * legacy `items: {id, label: ReactNode}` shape coerced to the rich
 * SegmentedSubTabItem contract. Emits a one-shot dev-only console
 * warning on first render in any session.
 */
export function PillTabs({ items, active, onChange, ariaLabel }: PillTabsProps) {
  warnDeprecation();
  const mapped: SegmentedSubTabItem[] = items.map((item) => ({
    id: item.id,
    label: typeof item.label === 'string' ? item.label : String(item.id),
  }));
  return (
    <SegmentedSubTabs
      items={mapped}
      active={active}
      onChange={onChange}
      ariaLabel={ariaLabel ?? ''}
      mode="pill"
    />
  );
}

export const __pillTabsResetDeprecationWarningForTest = () => {
  deprecationWarned = false;
};
