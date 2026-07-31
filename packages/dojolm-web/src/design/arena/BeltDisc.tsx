// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';

// Nine-tier dojo belt ladder + unranked seed. Epic 4B.5 extended the
// union from the original five-tier visual vocabulary (white, blue,
// purple, brown, black) to the full nine-belt ladder locked in
// the E4B design decisions §8. The added tiers (yellow, orange,
// green, red) pair with ordering in `belt-ledger-source.ts`'s
// `BELT_TIERS` constant — keep the two in sync.
export type Belt =
  | 'black'
  | 'red'
  | 'brown'
  | 'purple'
  | 'blue'
  | 'green'
  | 'orange'
  | 'yellow'
  | 'white'
  | 'unranked';

export interface BeltDiscProps {
  readonly belt: Belt;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// Short mono label ramp — deliberately NOT kanji per guardrails §5.
// The two-letter code pairs with the color disc so screen-reader users hear
// the belt name via aria-label while sighted users see shape + color + code.
const SHORT_LABEL: Readonly<Record<Belt, string>> = {
  black: 'BK',
  red: 'RD',
  brown: 'BR',
  purple: 'PU',
  blue: 'BL',
  green: 'GR',
  orange: 'OR',
  yellow: 'YE',
  white: 'WH',
  unranked: '—',
};

export function BeltDisc({ belt, className = '', style }: BeltDiscProps) {
  const label = SHORT_LABEL[belt];
  return (
    <span
      className={`arena-belt-disc belt-${belt} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={`${belt} belt`}
      data-testid="arena-belt-disc"
    >
      {label}
    </span>
  );
}
