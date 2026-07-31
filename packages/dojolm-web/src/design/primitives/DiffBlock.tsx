// SPDX-License-Identifier: Apache-2.0
export type DiffLineKind = 'add' | 'rm' | 'ctx';

export interface DiffLine {
  readonly kind: DiffLineKind;
  /** Line text. Capped at 240 chars at the prop boundary. */
  readonly text: string;
  /** Optional left-margin line number (e.g. `"42"`). Capped at 8 chars. */
  readonly ln?: string;
}

export interface DiffBlockProps {
  readonly lines: readonly DiffLine[];
  /** Optional caption (e.g. `"v3 → v4"`). Capped at 80 chars. */
  readonly caption?: string;
  /** Show a +N / -N summary above the diff. */
  readonly summary?: boolean;
  /** Accessible label override. Default: `"Diff: +X added, -Y removed"`. */
  readonly ariaLabel?: string;
  /**
   * When `true`, omit the `role="figure"` + `aria-label` on the root
   * so a parent landmark (e.g. `<GoldenDiff>`) owns the only figure
   * announcement in the AT tree. Visually identical; structurally a
   * plain `<div>`. Use only when nesting inside another figure-role
   * wrapper that already labels the diff.
   */
  readonly decorative?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_TEXT = 240;
const MAX_LN = 8;
const MAX_CAPTION = 80;
/** Render-time cap to defend against unbounded API responses (DoS). */
export const DIFF_BLOCK_MAX_LINES = 512;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const KIND_LABEL: Readonly<Record<DiffLineKind, string>> = {
  add: '+',
  rm: '-',
  ctx: ' ',
};

/**
 * Mono-font code-diff block with add (`+`)/remove (`-`)/context (` `)
 * lines. Tinted via .diff-block-line.add/rm/ctx classes; no inline
 * color literals. Cross-module primitive: Jutsu version diffs, Kotoba
 * golden-suite changes, Hattori prompt mutations, Amaterasu lineage
 * deltas. Used as the inner renderer by `<GoldenDiff>` (YR.6.8).
 */
export function DiffBlock({
  lines,
  caption,
  summary = true,
  ariaLabel,
  decorative = false,
  className,
  testId,
}: DiffBlockProps) {
  const safe = lines.slice(0, DIFF_BLOCK_MAX_LINES);
  const adds = safe.filter((l) => l.kind === 'add').length;
  const rms = safe.filter((l) => l.kind === 'rm').length;
  const cappedCaption = caption !== undefined ? cap(caption, MAX_CAPTION) : undefined;
  const derived = ariaLabel ?? `Diff: +${adds} added, -${rms} removed`;
  const rootClass = `diff-block${className ? ` ${className}` : ''}`;
  return (
    <div
      className={rootClass}
      role={decorative ? undefined : 'figure'}
      aria-label={decorative ? undefined : derived}
      data-testid={testId ?? 'diff-block'}
    >
      {(cappedCaption || summary) && (
        <div className="diff-block-head">
          {cappedCaption ? (
            <span className="diff-block-caption">{cappedCaption}</span>
          ) : (
            <span />
          )}
          {summary ? (
            <span className="diff-block-summary" aria-hidden="true">
              <span className="diff-block-summary-add">+{adds}</span>
              <span className="diff-block-summary-rm">−{rms}</span>
            </span>
          ) : null}
        </div>
      )}
      <pre className="diff-block-body">
        {safe.map((l, i) => (
          <span key={i} className={`diff-block-line ${l.kind}`}>
            {l.ln ? (
              <span className="diff-block-ln" aria-hidden="true">
                {cap(l.ln, MAX_LN)}
              </span>
            ) : null}
            <span className="diff-block-marker" aria-hidden="true">
              {KIND_LABEL[l.kind]}
            </span>
            <span className="diff-block-text">{cap(l.text, MAX_TEXT)}</span>
          </span>
        ))}
      </pre>
    </div>
  );
}
