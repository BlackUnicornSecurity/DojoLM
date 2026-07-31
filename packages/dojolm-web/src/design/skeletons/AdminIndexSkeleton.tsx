// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonHost,
  SkeletonLine,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel } from './_helpers';

export interface AdminIndexSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// /admin landing page loading placeholder. Layout: page-head, a wide
// platform-info card, then a 12-card 3-column grid mirroring V1's
// 12-tab admin shell so the surface reads as the same page during load.
export function AdminIndexSkeleton({
  className,
  ariaLabel = 'Loading Admin index',
}: AdminIndexSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="60px" titleWidth="160px" />
      <SkPanel style={{ minHeight: 100, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <SkeletonBox width="48px" height="48px" radius="card" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SkeletonLine width="180px" height="14px" />
              <SkeletonLine width="280px" height="11px" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonBox width="92px" height="32px" radius="pill" />
            <SkeletonBox width="92px" height="32px" radius="pill" />
          </div>
        </div>
      </SkPanel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <SkPanel key={i} style={{ minHeight: 112 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <SkeletonBox width="34px" height="34px" radius="card" />
              <SkeletonBox width="36px" height="18px" radius="pill" />
            </div>
            <SkeletonLine width="56%" height="13px" />
            <div style={{ marginTop: 6 }}>
              <SkeletonLine
                width={
                  ['92%', '78%', '84%', '70%', '86%', '74%', '90%', '80%', '88%', '72%', '82%', '76%'][i]
                }
                height="11px"
              />
            </div>
          </SkPanel>
        ))}
      </div>
    </SkeletonHost>
  );
}
