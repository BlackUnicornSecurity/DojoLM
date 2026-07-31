// SPDX-License-Identifier: Apache-2.0
import { DiffBlock, type DiffLine } from './DiffBlock';

export type GoldenDiffStatus = 'match' | 'drift' | 'fail';

export interface GoldenDiffProps {
  /** Suite name (e.g. `"jailbreak-canary-v3"`). Capped at 80 chars. */
  readonly suite: string;
  /** Golden hash (e.g. `"sha256:0xabc…1234"`). Capped at 64 chars (mono display). */
  readonly hash: string;
  /** Comparison status. Drives the chip + outline tone. */
  readonly status: GoldenDiffStatus;
  /** Diff lines. Forwarded to `<DiffBlock>` (which applies its own caps). */
  readonly lines: readonly DiffLine[];
  /** Optional attempt counter (e.g. `"3 / 5"`). Capped at 16 chars. */
  readonly attempts?: string;
  /** Optional captured-at timestamp (e.g. `"2026-04-25 14:32"`). Capped at 32 chars. */
  readonly capturedAt?: string;
  /** Accessible label override for the wrapper figure. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_SUITE = 80;
const MAX_HASH = 64;
const MAX_ATTEMPTS = 16;
const MAX_TS = 32;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const STATUS_TO_CHIP: Readonly<Record<GoldenDiffStatus, string>> = {
  match: 'jade',
  drift: 'warn',
  fail: 'red',
};

/**
 * Hattori golden-suite diff. Wraps a `<DiffBlock>` (YR.6.7) with
 * golden-suite metadata (suite name, golden hash, status chip,
 * attempt count, captured timestamp). Used by `/admin/hattori`
 * golden-suite review surface and the Hattori block-out report.
 */
export function GoldenDiff({
  suite,
  hash,
  status,
  lines,
  attempts,
  capturedAt,
  ariaLabel,
  className,
  testId,
}: GoldenDiffProps) {
  const cappedSuite = cap(suite, MAX_SUITE);
  const cappedHash = cap(hash, MAX_HASH);
  const cappedAttempts = attempts !== undefined ? cap(attempts, MAX_ATTEMPTS) : undefined;
  const cappedCapturedAt = capturedAt !== undefined ? cap(capturedAt, MAX_TS) : undefined;
  const summary = ariaLabel ?? `Golden diff: ${cappedSuite} — ${status}`;
  const rootClass = `golden-diff state-${status}${className ? ` ${className}` : ''}`;
  return (
    <div
      className={rootClass}
      role="figure"
      aria-label={summary}
      data-testid={testId ?? 'golden-diff'}
      data-status={status}
    >
      <header className="golden-diff-head">
        <div className="golden-diff-head-meta">
          <span className="golden-diff-suite">{cappedSuite}</span>
          <span className="golden-diff-hash" title={cappedHash}>
            {cappedHash}
          </span>
        </div>
        <div className="golden-diff-head-chips">
          <span className={`chip ${STATUS_TO_CHIP[status]}`.trim()}>
            <span className="dot" />
            {status.toUpperCase()}
          </span>
          {cappedAttempts ? (
            <span className="golden-diff-attempts">{cappedAttempts}</span>
          ) : null}
          {cappedCapturedAt ? (
            <span className="golden-diff-ts">{cappedCapturedAt}</span>
          ) : null}
        </div>
      </header>
      <DiffBlock lines={lines} summary decorative />
    </div>
  );
}
