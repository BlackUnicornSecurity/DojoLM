// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';

export type SealState = 'signed' | 'pending' | 'revoked' | 'executed';

export interface SealProps {
  readonly state: SealState;
  readonly label?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// Short mono label rendered inside the disc. Plan §5 bars kanji on
// data — the short code + color carries the state signal; aria-label
// carries the full state name for screen readers. `executed` is the
// terminal success state reached after the engagement-execute POST
// chain commits (Epic 10 S10.2).
const STATE_LABEL: Readonly<Record<SealState, string>> = {
  signed: 'OK',
  pending: '···',
  revoked: '✕',
  executed: 'DONE',
};

// Seal — wax-stamp disc that accompanies a signature block. Circular
// torii-red gradient for `signed`, paper-neutral for `pending`, dark
// muted for `revoked`. Shape + color + short-code ramp — no kanji.
export function Seal({ state, label, className = '', style }: SealProps) {
  const displayLabel = label ?? STATE_LABEL[state];
  return (
    <span
      role="img"
      aria-label={`${state} seal`}
      className={`ritual-seal state-${state} ${className}`.trim()}
      style={style}
      data-testid="ritual-seal"
      data-state={state}
    >
      {displayLabel}
    </span>
  );
}
