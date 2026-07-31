// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonHost,
  SkeletonLine,
  SkeletonTable,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel, SkTabStrip } from './_helpers';

export interface AtemiSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// /admin/atemi loading placeholder. Layout: page-head, mode-selector
// strip (4 modes), 5-tab subtabs strip, KPI strip (4 metrics), then a
// data table for the body. Heights match the populated Atemi layout.
export function AtemiSkeleton({
  className,
  ariaLabel = 'Loading Atemi',
}: AtemiSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="80px" titleWidth="240px" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkPanel
            key={i}
            style={{ height: 80, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <SkeletonBox width="40px" height="40px" radius="card" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <SkeletonLine width="68%" height="14px" />
              <SkeletonLine width="92%" height="10px" />
            </div>
          </SkPanel>
        ))}
      </div>
      <SkTabStrip count={5} labelWidth="92px" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkPanel key={i} style={{ height: 96 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <SkeletonLine width="52%" height="10px" />
              <SkeletonBox width="14px" height="14px" radius="pill" />
            </div>
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <SkeletonBox width="46%" height="28px" radius="pill" />
              <SkeletonBox width="40%" height="20px" radius="pill" />
            </div>
          </SkPanel>
        ))}
      </div>
      <SkPanel padding={16}>
        <SkeletonTable rows={6} cols={5} />
      </SkPanel>
    </SkeletonHost>
  );
}
