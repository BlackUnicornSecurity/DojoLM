// SPDX-License-Identifier: Apache-2.0
/**
 * Spinner — E4.S10 async-trigger inline glyph (retires F-2-212 P2).
 *
 * Tiny rotating-ring glyph that an async-trigger button can render to
 * the LEFT of its label while the request is in flight. The button
 * label MUST remain visible (the finding is "looks like click was
 * lost" because the label changed to 'Running…' AND the spinner is
 * absent — the convention this primitive enforces is: spinner + label,
 * not spinner-or-label).
 *
 * The primitive is a pure visual; aria-hidden so AT does not announce
 * the rotating glyph (the parent button already has its own
 * aria-label / live-region text). Respects prefers-reduced-motion via
 * the .sys-loading-spinner CSS class (no animation under that token).
 *
 * Sizing is fixed (14px) on purpose — every async-trigger surface
 * E4.S10 wires picks the same glyph so a Stage race button and a Run
 * probe button read as the same primitive in the operator's mental
 * model. If a larger surface needs a hero-sized spinner that is the
 * .dojo-auth-loading-spinner class (32px) — different shape, different
 * intent.
 *
 * @example
 *   <button disabled={submitting}>
 *     {submitting && <Spinner />} {submitting ? 'Staging…' : 'Stage race'}
 *   </button>
 */

import type { ReactElement } from 'react';

export interface SpinnerProps {
  /**
   * Optional override for the test anchor. Most call-sites should not
   * set this — the spinner is non-interactive and the parent button
   * already owns the testid.
   */
  readonly testId?: string;
  /**
   * Optional inline style override for sizing on a specific surface
   * (e.g. a 12-px spinner inside a chip). Default geometry is the
   * shared 14×14 .sys-loading-spinner.
   */
  readonly style?: React.CSSProperties;
}

export function Spinner({ testId, style }: SpinnerProps = {}): ReactElement {
  return (
    <span
      className="sys-loading-spinner"
      role="presentation"
      aria-hidden="true"
      data-testid={testId ?? 'async-spinner'}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        marginInlineEnd: 6,
        ...style,
      }}
    />
  );
}
