// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonHost,
  SkeletonLine,
  SkeletonLines,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel, SkTabStrip } from './_helpers';

export interface BukiSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// /admin/buki loading placeholder. Composition: page-head, 4-tab strip,
// filters row, then two stacked fixture-category sections each with a
// 3-column card grid. Mirrors the Fixture Explorer's actual layout so
// the loading → populated transition holds its dimensions.
export function BukiSkeleton({
  className,
  ariaLabel = 'Loading Buki Forge',
}: BukiSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="90px" titleWidth="120px" />
      <SkTabStrip count={4} labelWidth="78px" />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SkeletonLine width="140px" height="14px" />
          <SkeletonBox width="44px" height="22px" radius="pill" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SkeletonBox width="80px" height="32px" radius="pill" />
          <SkeletonBox width="90px" height="32px" radius="pill" />
          <SkeletonBox width="74px" height="32px" radius="pill" />
          <SkeletonBox width="100px" height="32px" radius="pill" />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <SkeletonBox width="110px" height="32px" radius="pill" />
      </div>
      {[0, 1].map((sec) => (
        <div
          key={sec}
          style={{
            marginBottom: 18,
            borderLeft: '2px solid var(--b-1)',
            paddingLeft: 14,
          }}
        >
          <SkeletonLine width="160px" height="11px" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
              marginTop: 10,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <SkPanel key={i} style={{ minHeight: 168 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 14,
                  }}
                >
                  <SkeletonBox width="34px" height="34px" radius="card" />
                  <SkeletonBox width="24px" height="20px" radius="pill" />
                </div>
                <SkeletonLine width="58%" height="14px" />
                <div style={{ marginTop: 8 }}>
                  <SkeletonLines count={2} lineHeight="11px" widths={['92%', '74%']} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <SkeletonBox width="100%" height="6px" radius="pill" />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                  <SkeletonLine width="44px" height="10px" />
                  <SkeletonLine width="44px" height="10px" />
                  <SkeletonLine width="44px" height="10px" />
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <SkeletonBox width="68px" height="22px" radius="pill" />
                  <SkeletonLine width="36px" height="11px" />
                </div>
              </SkPanel>
            ))}
          </div>
        </div>
      ))}
    </SkeletonHost>
  );
}
