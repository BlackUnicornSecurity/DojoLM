// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';

export type TokenizedPromptTone = '' | 'attn' | 'cost' | 'masked' | 'risk';

export interface TokenizedPromptToken {
  /** Token text. Whitespace is preserved verbatim — no trim. Capped at TOKEN_TEXT_MAX. */
  readonly text: string;
  /** Optional tone — color-codes attention / cost / masking / risk. */
  readonly tone?: TokenizedPromptTone;
  /** Optional 0..1 score. When set, exposed as a `title` tooltip. */
  readonly score?: number;
  /**
   * Optional stable id. When present, used as the React key so
   * reordering / partial updates reconcile rather than remount. Falls
   * back to the array index when omitted.
   */
  readonly id?: string;
}

export interface TokenizedPromptProps {
  /** Token chips. Capped at TOKENIZED_PROMPT_MAX_TOKENS before render. */
  readonly tokens: readonly TokenizedPromptToken[];
  /** Optional accessible label override. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

/** Defensive cap on the inline token run. UI envelope ~512 tokens / row. */
export const TOKENIZED_PROMPT_MAX_TOKENS = 1024;

const TOKEN_TEXT_MAX = 64;
const ARIA_LABEL_MAX = 120;

/**
 * Static aria-fragment lookup for each tone. The summary string indexes
 * this map rather than splicing the raw `tone` value — defends against
 * runtime widening (e.g. `as TokenizedPromptTone`) carrying attacker-
 * controlled text into the AT layer.
 */
const TONE_LABEL: Record<Exclude<TokenizedPromptTone, ''>, string> = {
  attn: 'attention',
  cost: 'cost',
  masked: 'masked',
  risk: 'risk',
};

function clampScore(s: number): number {
  if (Number.isNaN(s)) return 0;
  return Math.max(0, Math.min(1, s));
}

/**
 * Kotoba inline tokenized-prompt run. Renders each token as a chip with
 * tone-driven background; whitespace within a token is preserved verbatim
 * so caller-tokenization stays visually exact (e.g. `" "` between word
 * pairs surfaces a half-em-wide gap chip). Optional 0..1 score becomes a
 * `title` tooltip. Renders as `role="figure"` with an aria-label
 * describing token count + dominant tone.
 *
 * Defensive caps: `TOKENIZED_PROMPT_MAX_TOKENS=1024`, per-token text cap
 * 64. Defends against unbounded API-supplied tokenizer outputs.
 */
export function TokenizedPrompt({
  tokens,
  ariaLabel,
  className,
  testId,
}: TokenizedPromptProps) {
  const safe = tokens.slice(0, TOKENIZED_PROMPT_MAX_TOKENS).map((t) => ({
    id: t.id,
    text: cap(t.text, TOKEN_TEXT_MAX),
    tone: t.tone ?? '',
    score: t.score !== undefined ? clampScore(t.score) : undefined,
  }));
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  const counts = safe.reduce<Record<string, number>>((acc, t) => {
    if (t.tone) {
      const word = TONE_LABEL[t.tone];
      acc[word] = (acc[word] ?? 0) + 1;
    }
    return acc;
  }, {});
  const toneSummary = Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  const summary =
    safeAriaLabel ??
    `Tokenized prompt: ${safe.length} tokens${
      toneSummary ? ` (${toneSummary})` : ''
    }`;
  const rootClass = `tokenized-prompt${className ? ` ${className}` : ''}`;
  return (
    <div
      className={rootClass}
      role="figure"
      aria-label={summary}
      data-testid={testId ?? 'tokenized-prompt'}
    >
      {safe.map((t, i) => (
        <span
          key={t.id ?? i}
          className={`tokenized-prompt-token${t.tone ? ` tone-${t.tone}` : ''}`}
          title={t.score !== undefined ? `score ${t.score.toFixed(2)}` : undefined}
        >
          {t.text}
        </span>
      ))}
    </div>
  );
}
