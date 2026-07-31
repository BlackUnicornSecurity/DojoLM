// SPDX-License-Identifier: Apache-2.0
import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonHost,
  SkeletonLine,
  SkeletonLines,
} from '../primitives/LoadingSkeleton';
import { SkPageHead, SkPanel, SkTabStrip } from './_helpers';

export interface RoninSkeletonProps {
  className?: string;
  ariaLabel?: string;
}

// /admin/ronin loading placeholder. Layout: page-head, 4-tab strip,
// filter pill row, then a 9-card 3-column bounty-program grid. Card
// shapes mirror BountyEntry composition so the loading → populated
// transition reads as the same surface.
export function RoninSkeleton({
  className,
  ariaLabel = 'Loading Ronin',
}: RoninSkeletonProps = {}) {
  return (
    <SkeletonHost className={className} ariaLabel={ariaLabel}>
      <SkPageHead eyebrowWidth="100px" titleWidth="150px" />
      <SkTabStrip count={4} labelWidth="82px" />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SkeletonBox width="140px" height="32px" radius="pill" />
        <SkeletonBox width="140px" height="32px" radius="pill" />
        <SkeletonBox width="140px" height="32px" radius="pill" />
        <SkeletonBox width="140px" height="32px" radius="pill" />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <SkPanel key={i} style={{ minHeight: 192 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <SkeletonBox width="58px" height="22px" radius="pill" />
              <SkeletonLine width="48px" height="11px" />
            </div>
            <SkeletonLine width="78%" height="15px" />
            <div style={{ marginTop: 8 }}>
              <SkeletonLines count={2} lineHeight="11px" widths={['96%', '64%']} />
            </div>
            <div style={{ marginTop: 18 }}>
              <SkeletonLine width="44%" height="10px" />
              <div style={{ marginTop: 6 }}>
                <SkeletonBox width="100%" height="6px" radius="pill" />
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <SkeletonCircle size="20px" />
                <SkeletonCircle size="20px" />
                <SkeletonCircle size="20px" />
              </div>
              <SkeletonLine width="56px" height="11px" />
            </div>
          </SkPanel>
        ))}
      </div>
    </SkeletonHost>
  );
}
