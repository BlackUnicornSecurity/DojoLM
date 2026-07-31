// SPDX-License-Identifier: Apache-2.0
/**
 * EnvChip — TopBar runtime-environment indicator.
 *
 * E6.S4 (2026-05-08) — retires F-8-007 (P1, "TopBar has no instance /
 * environment / workspace identifier"). Plan ref:
 * `audit/REMEDIATION-PLAN.md:690-697`.
 *
 * Reads `NEXT_PUBLIC_APP_ENV` and renders a colour-coded chip in the
 * `topbar-right` slot:
 *   - PROD     → `.chip.red`   (torii red, single torii red per G1)
 *   - STAGING  → `.chip.warn`  (gold)
 *   - DEV      → `.chip.jade`  (jade)
 *   - else     → `.chip.ghost` (token-driven neutral fallback)
 *
 * The chip's accessible name is the visible label (the env name), so
 * the WCAG SC 4.1.2 (Name, Role, Value) contract is satisfied without
 * adding `aria-label`. The build SHA — when available via
 * `NEXT_PUBLIC_GIT_SHA` — is surfaced through the native `title`
 * attribute, which most browsers/screen readers expose as a tooltip /
 * accessible description. We prefer `title` over the `role="tooltip"`
 * pattern because:
 *   - The chip is a passive indicator, not an interactive control —
 *     no popover state machine is warranted.
 *   - The information is supplementary; if the operator can't read the
 *     tooltip the chip is still useful (the env name remains visible).
 *   - It composes with existing `.chip` CSS without adding any new
 *     focus-trap / dismiss-on-Escape machinery.
 *
 * The chip is NOT a live region — it announces a static deployment
 * fact, not a status update — so no `role="status"` / `aria-live`. The
 * F-3-009 audit note explicitly warned that dead `role="status"` on a
 * static chip corrodes screen-reader trust by causing spurious
 * announcements on every render.
 *
 * Token-driven CSS only (G10 / E1.S2 lint rule):
 *   - All colours sourced from existing `.chip.{red,warn,jade,ghost}`
 *     classes in `primitives.css` (which themselves resolve through
 *     `tokens.css` — `--torii-lg`, `--gold`, `--jade`, `--fg-mute`).
 *   - No hex literals, no inline-style colour overrides.
 *
 * Reduced-motion safe (G7 GUARDRAIL):
 *   - The chip has no animation of its own. The `.chip .dot` glow is
 *     static box-shadow; no transitions / keyframes.
 *
 * Build-SHA injection (Next.js):
 *   - At build time, `next.config.ts` reads
 *     `process.env.NEXT_PUBLIC_GIT_SHA` (set by the deploy script) and
 *     inlines it into the client bundle. When unset (local `next dev`
 *     without an injected SHA) the tooltip falls back to "build SHA
 *     unavailable" so the absence is visible rather than misleading.
 *   - Short SHA is the first 7 characters per Git convention.
 */

'use client';

export type EnvKind = 'prod' | 'staging' | 'dev' | 'unknown';

/**
 * Internal mapping of the resolved env kind onto the `.chip.*` class
 * modifier. Centralised so tests can pin the mapping without
 * re-implementing it.
 */
export const ENV_CHIP_CLASS: Readonly<Record<EnvKind, string>> = {
  prod: 'red',
  staging: 'warn',
  dev: 'jade',
  unknown: 'ghost',
};

/** The visible label for each env kind. */
export const ENV_CHIP_LABEL: Readonly<Record<EnvKind, string>> = {
  prod: 'PROD',
  staging: 'STAGING',
  dev: 'DEV',
  unknown: 'ENV',
};

const SHORT_SHA_LENGTH = 7;
const BUILD_SHA_UNAVAILABLE = 'build SHA unavailable';

/**
 * Pure helper — normalise the raw env-var value into one of the four
 * kinds. Case-insensitive; accepts the canonical names plus a couple
 * of common aliases ("production" / "prd", "stage" / "stg").
 *
 * Defaults to `dev` when unset (most permissive — local development).
 * Defaults to `unknown` when set to a value we don't recognise (so the
 * chip still renders; the operator can see the raw value via the
 * `data-env` attribute).
 */
export function resolveEnvKind(rawValue: string | undefined): EnvKind {
  if (rawValue === undefined || rawValue.trim() === '') return 'dev';
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'prod' || normalized === 'production' || normalized === 'prd') {
    return 'prod';
  }
  if (
    normalized === 'staging' ||
    normalized === 'stage' ||
    normalized === 'stg'
  ) {
    return 'staging';
  }
  if (normalized === 'dev' || normalized === 'development') {
    return 'dev';
  }
  return 'unknown';
}

/**
 * Pure helper — derive the visible label. When the kind is `unknown`
 * we surface the raw value (uppercased) so the chip still communicates
 * something meaningful.
 */
export function resolveEnvLabel(
  kind: EnvKind,
  rawValue: string | undefined,
): string {
  if (kind === 'unknown' && rawValue && rawValue.trim() !== '') {
    return rawValue.trim().toUpperCase();
  }
  return ENV_CHIP_LABEL[kind];
}

/**
 * Pure helper — format the SHA as a 7-char prefix wrapped in a
 * tooltip-friendly string. Falls back to the documented "unavailable"
 * sentinel when no SHA is available.
 */
export function formatBuildShaTooltip(rawSha: string | undefined): string {
  if (!rawSha || rawSha.trim() === '') return BUILD_SHA_UNAVAILABLE;
  const trimmed = rawSha.trim();
  // CONT-R2-001 — the Dockerfile wires NEXT_PUBLIC_GIT_SHA=${BUILD_SHA},
  // whose build-arg defaults to the literal "unknown" when the deploy
  // passes no SHA. Treat that sentinel as unavailable (mirrors
  // /api/build-info's `!== 'unknown'` check) rather than rendering a
  // bogus "Build unknow".
  if (trimmed.toLowerCase() === 'unknown') return BUILD_SHA_UNAVAILABLE;
  const shortSha = trimmed.slice(0, SHORT_SHA_LENGTH);
  return `Build ${shortSha}`;
}

export interface EnvChipProps {
  /**
   * Override for the runtime env-var. Lets tests + canvas previews pin
   * a specific kind without mutating `process.env`. When unset (the
   * production code path) the component reads
   * `process.env.NEXT_PUBLIC_APP_ENV`.
   */
  readonly envOverride?: string;
  /**
   * Override for the build-SHA env-var. Same rationale as `envOverride`.
   */
  readonly shaOverride?: string;
  /** Compose extra layout context (rare — most callers pass nothing). */
  readonly className?: string;
  /** Override `data-testid="env-chip"` default. */
  readonly testId?: string;
}

export function EnvChip({
  envOverride,
  shaOverride,
  className,
  testId,
}: EnvChipProps = {}) {
  const rawEnv = envOverride ?? process.env.NEXT_PUBLIC_APP_ENV;
  const rawSha = shaOverride ?? process.env.NEXT_PUBLIC_GIT_SHA;

  const kind = resolveEnvKind(rawEnv);
  const label = resolveEnvLabel(kind, rawEnv);
  const tooltip = formatBuildShaTooltip(rawSha);
  const modifier = ENV_CHIP_CLASS[kind];

  const rootClass = ['chip', modifier, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={rootClass}
      title={tooltip}
      data-testid={testId ?? 'env-chip'}
      data-env={kind}
      data-env-label={label}
    >
      <span className="dot" />
      {label}
    </span>
  );
}

export default EnvChip;
