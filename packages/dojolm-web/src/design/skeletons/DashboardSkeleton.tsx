// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonHost,
  SkeletonLine,
  SkeletonLines,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel } from './_helpers';

export interface DashboardSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// / (Sensei dashboard) loading placeholder. Layout: page-head, 5-CTA
// pill strip, onboarding card with 5 inline steps, then a 3-zone widget
// grid (3-stacked + 2-stacked + 1-wide). Heights match the dashboard's
// actual zones so the populated state slides in without movement.
export function DashboardSkeleton({
  className,
  ariaLabel = 'Loading Sensei Dashboard',
}: DashboardSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="80px" titleWidth="220px" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox key={i} height="48px" radius="pill" />
        ))}
      </div>
      <SkPanel style={{ minHeight: 192, marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <SkeletonLine width="120px" height="10px" />
            <SkeletonLine width="38%" height="18px" />
            <div style={{ marginTop: 4, maxWidth: '70%' }}>
              <SkeletonLines count={2} lineHeight="12px" widths={['94%', '70%']} />
            </div>
          </div>
          <SkeletonBox width="110px" height="32px" radius="pill" />
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} width="100%" height="42px" radius="card" />
          ))}
        </div>
      </SkPanel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkPanel key={i} style={{ minHeight: 92 }}>
              <SkeletonLine width="60%" height="11px" />
              <div style={{ marginTop: 12 }}>
                <SkeletonLine width="36%" height="22px" />
              </div>
              <div style={{ marginTop: 6 }}>
                <SkeletonLine width="48%" height="10px" />
              </div>
            </SkPanel>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <SkPanel key={i} style={{ minHeight: 144 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <SkeletonLine width="48%" height="11px" />
                <SkeletonBox width="48px" height="20px" radius="pill" />
              </div>
              <div style={{ marginTop: 14 }}>
                <SkeletonLines count={3} lineHeight="12px" widths={['92%', '84%', '64%']} />
              </div>
            </SkPanel>
          ))}
        </div>
        <SkPanel style={{ minHeight: 302 }}>
          <SkeletonLine width="58%" height="11px" />
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <SkeletonCircle size="20px" />
                <SkeletonLine
                  width={['78%', '72%', '64%', '82%', '66%', '74%'][i]}
                  height="12px"
                />
                <div style={{ marginLeft: 'auto' }}>
                  <SkeletonBox width="40px" height="18px" radius="pill" />
                </div>
              </div>
            ))}
          </div>
        </SkPanel>
      </div>
    </SkeletonHost>
  );
}
