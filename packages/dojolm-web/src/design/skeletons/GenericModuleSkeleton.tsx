// SPDX-License-Identifier: Apache-2.0
/**
 * GenericModuleSkeleton — HAGANE E3.S1 (audit C5: zero loading.tsx
 * under (shell)/admin — 28 routes hydrated blank).
 *
 * Route-group loading fallback for module pages that don't have a
 * bespoke A.2 skeleton: page head + KPI quartet + workbench panel,
 * matching the dominant module-page layout so the loading → populated
 * crossfade lands without a jarring shape change. Composes the same
 * atoms as the per-module skeletons.
 */

import { SkeletonHost } from '@/design/primitives/LoadingSkeleton';
import { SkPageHead, SkPanel, SkTabStrip } from './_helpers';

export interface GenericModuleSkeletonProps {
  readonly className?: string;
  readonly ariaLabel?: string;
}

export function GenericModuleSkeleton({
  className,
  ariaLabel = 'Loading module',
}: GenericModuleSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="72px" titleWidth="220px" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <SkPanel style={{ minHeight: 88 }} />
        <SkPanel style={{ minHeight: 88 }} />
        <SkPanel style={{ minHeight: 88 }} />
        <SkPanel style={{ minHeight: 88 }} />
      </div>
      <SkTabStrip />
      <SkPanel style={{ minHeight: 320 }} />
    </SkeletonHost>
  );
}
