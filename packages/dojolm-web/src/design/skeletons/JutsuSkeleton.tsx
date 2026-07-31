// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonHost,
  SkeletonLine,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel, SkTabStrip } from './_helpers';

export interface JutsuSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// /admin/jutsu loading placeholder. Layout: page-head, 4-tab strip, a
// caption row, and an 8-card 4-column model grid. Card dimensions
// match the model-card heights so the populated grid hot-swaps without
// reflow.
export function JutsuSkeleton({
  className,
  ariaLabel = 'Loading Jutsu',
}: JutsuSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="80px" titleWidth="160px" />
      <SkTabStrip count={4} labelWidth="84px" />
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <SkeletonLine width="180px" height="13px" />
        <div style={{ display: 'flex', gap: 8 }}>
          <SkeletonBox width="92px" height="32px" radius="pill" />
          <SkeletonBox width="92px" height="32px" radius="pill" />
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkPanel key={i} style={{ minHeight: 152 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <SkeletonBox width="36px" height="36px" radius="card" />
              <SkeletonBox width="34px" height="20px" radius="pill" />
            </div>
            <div style={{ marginTop: 12 }}>
              <SkeletonLine width="68%" height="14px" />
              <div style={{ marginTop: 6 }}>
                <SkeletonLine width="46%" height="10px" />
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <SkeletonLine width="36%" height="11px" />
              <SkeletonLine width="28%" height="11px" />
            </div>
            <div style={{ marginTop: 8 }}>
              <SkeletonBox width="100%" height="5px" radius="pill" />
            </div>
          </SkPanel>
        ))}
      </div>
    </SkeletonHost>
  );
}
