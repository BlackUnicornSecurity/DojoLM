// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonHost,
  SkeletonLine,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel } from './_helpers';

export interface BushidoSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// /admin/bushido loading placeholder. Composition matches the populated
// Bushido Book page layout: page-head row, two-column body (Score gauge
// circle on the left, Framework Coverage table on the right), and the
// selected-framework disclosure accordion below. Dimensions match the
// real page so the loading → populated crossfade has zero layout shift.
export function BushidoSkeleton({
  className,
  ariaLabel = 'Loading Bushido Book',
}: BushidoSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="110px" titleWidth="200px" />
      <div className="skel-module-2col" style={{ marginBottom: 16 }}>
        <SkPanel
          padding={22}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <SkeletonCircle size="240px" />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
              width: '100%',
            }}
          >
            <SkeletonLine width="58%" height="14px" />
            <SkeletonLine width="78%" height="11px" />
          </div>
        </SkPanel>
        <SkPanel padding={0}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--b-0)',
            }}
          >
            <SkeletonLine width="180px" height="12px" />
            <SkeletonBox width="110px" height="24px" radius="pill" />
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 8px',
                  borderRadius: 'var(--r-sm)',
                  background: i === 0 ? 'rgba(var(--white-rgb), 0.025)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <SkeletonBox width="14px" height="14px" radius="pill" />
                  <SkeletonLine
                    width={['44%', '38%', '46%', '40%', '36%', '42%'][i % 6]}
                    height="13px"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <SkeletonLine width="36px" height="12px" />
                  <SkeletonBox width="20px" height="20px" radius="pill" />
                </div>
              </div>
            ))}
          </div>
        </SkPanel>
      </div>
      <SkPanel padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonLine width="140px" height="10px" />
            <SkeletonLine width="220px" height="16px" />
          </div>
          <SkeletonBox width="120px" height="28px" radius="pill" />
        </div>
      </SkPanel>
    </SkeletonHost>
  );
}
