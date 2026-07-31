// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from 'react';
import { SkeletonBox, SkeletonLine } from '../primitives/LoadingSkeleton';

// Shared composition helpers for module-level skeletons. Not exported
// from the design barrel — these are internal composition glue only.

export function SkPanel({
  children,
  padding = 18,
  style,
}: {
  children?: ReactNode;
  padding?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--b-0)',
        borderRadius: 'var(--r-xl)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SkPageHead({
  eyebrowWidth = '120px',
  titleWidth = '180px',
  withStatus = true,
}: {
  eyebrowWidth?: CSSProperties['width'];
  titleWidth?: CSSProperties['width'];
  withStatus?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        marginBottom: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SkeletonBox width="38px" height="38px" radius="card" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonLine width={eyebrowWidth} height="10px" />
          <SkeletonLine width={titleWidth} height="18px" />
        </div>
      </div>
      {withStatus && <SkeletonBox width="120px" height="26px" radius="pill" />}
    </div>
  );
}

export function SkTabStrip({
  count = 4,
  labelWidth = '80px',
}: {
  count?: number;
  labelWidth?: CSSProperties['width'];
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'var(--bg-2)',
        border: '1px solid var(--b-0)',
        borderRadius: 'var(--r-lg)',
        width: 'fit-content',
        marginBottom: 18,
      }}
    >
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '8px 14px',
            background: i === 0 ? 'rgba(var(--torii-rgb), 0.08)' : 'transparent',
            border: '1px solid ' + (i === 0 ? 'var(--b-1)' : 'transparent'),
            borderRadius: 'var(--r-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <SkeletonBox width="14px" height="14px" radius="pill" />
          <SkeletonLine width={labelWidth} height="12px" />
        </div>
      ))}
    </div>
  );
}
