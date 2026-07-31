// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/lib/error-copy.ts
 * Purpose: Canonical consumer-facing error-banner copy. The single source of
 * truth for "what string does the user see when a server call fails?".
 * Story: E6.S8 (Shared ERROR_BANNERS map) — retires F-6-007 (P0), F-S07-20
 *        (P0 dedup with F-6-007), F-617 (P0 dedup with F-6-007), and
 *        partially overlaps with F-6-020 already retired by E6.S5.
 *
 * Why this exists
 * ---------------
 * Multiple admin surfaces (api-keys, eval/run, onigaeshi, jutsu, sengoku,
 * shingan, mitsuke, amaterasu, ronin) historically translated raw server
 * codes into UI strings ad-hoc — each surface picked its own fallback,
 * some leaked literal `'forbidden'` / `'rate-limited'` / `'server'` to
 * the consumer (F-617), `Login` reflected `result.error` straight from
 * the API into the page DOM (F-6-007), and every list page printed
 * `'Network error'` as a generic chip (F-S07-20). This module collapses
 * all of those into one closed-set lookup keyed by a stable
 * {@link ServerCode} union.
 *
 * Contract (R-T1, R-T2, R-T3)
 * ---------------------------
 * - The set of `ServerCode` values is exhaustive and closed. Any new
 *   server code MUST be added to this union AND get an entry in
 *   `ERROR_BANNERS`. The audit-test in `__tests__/error-copy.test.ts`
 *   asserts that every union arm has a banner.
 * - Server-supplied free-form strings (e.g. `body.error`) MUST NOT be
 *   reflected verbatim to the consumer. Callers either pass a
 *   `ServerCode` directly (preferred), or hand a `Response` to
 *   {@link bannerForResponse} which derives the code from `res.status`.
 * - The map is `Object.freeze`-d at construction time so a stray
 *   import-time mutation throws in strict mode rather than silently
 *   diverging.
 *
 * Reading-level discipline
 * ------------------------
 * Every `body` string targets the consumer reading bar (8th-grade
 * register per F-6-028). No developer jargon (`SQLSTATE`, `errno`,
 * `EHOSTUNREACH`), no HTTP numerals in the visible string. Tone is the
 * SystemBanner contract: `'danger'` for blocking failure, `'warn'` for
 * recoverable / config-gated, `'info'` for informational.
 */

/**
 * Closed set of consumer-facing error categories. Add new categories
 * only when an existing one would be misleading — `'forbidden'` covers
 * 401/403, `'rate-limited'` covers 429, etc. The union is intentionally
 * narrow: the goal is one banner per consumer-actionable outcome, not
 * one banner per HTTP status code.
 *
 * The category names are also the sole values legal in
 * `setError(code)` style call sites — surfaces should pass the code
 * (which the lookup translates) rather than a free-form string.
 */
export type ServerCode =
  // 401 / 403 — operator lacks permission for this action.
  | 'forbidden'
  // 429 — too many requests in the rate-limit window.
  | 'rate-limited'
  // 5xx server-side failure with no specific consumer-facing remedy.
  | 'server'
  // fetch reject / DNS failure / aborted connection / CORS reject.
  | 'network'
  // 400 / 422 — request body or query failed schema validation.
  | 'invalid-input'
  // 404 — resource (engagement, key, user, etc.) not found.
  | 'not-found'
  // 409 — terminal-state collision (engagement already revoked, key
  // already revoked, double-arm, etc.).
  | 'conflict'
  // 503 — service intentionally not configured / flag-off / maintenance.
  | 'service-unavailable'
  // 401 with `code: csrf-validation-failed` — session expired.
  | 'session-expired'
  // CSRF double-submit failure surfaced separately so the consumer
  // copy can cue the operator to refresh the page.
  | 'csrf-failed'
  // 401 — wrong username/password (login-only).
  | 'invalid-credentials'
  // login-rate-limit specific — server returned 429 with a Retry-After.
  | 'too-many-attempts'
  // members magic-link 410 — invite already redeemed.
  | 'invite-dead'
  // members magic-link 503 — public beta off / member backend not configured.
  | 'members-disabled'
  // catch-all for unexpected client/server contract drift. Should be
  // rare in production; log internally and surface a soft message.
  | 'unknown';

/**
 * SystemBanner-aligned tone vocabulary. Mirrors {@link SystemBannerTone}
 * but excludes `'success'` and `'fixture'` because those are not error
 * states. We keep the type local to avoid a circular import on a leaf
 * design module from a `lib` file (which would pull React into every
 * server entry that imports `error-copy.ts`).
 *
 * Note: this is the LEGACY ERROR_BANNERS tone vocabulary (warn/danger/info
 * only). The richer E6.S12 vocabulary (warn/danger/info/success) lives on
 * {@link BannerTone_VisualTone} below; `BannerToneLegacy` is preserved
 * verbatim so the existing ERROR_BANNERS callers continue to typecheck.
 */
export type BannerToneLegacy = 'warn' | 'danger' | 'info';
/** Back-compat alias. New code should use `BannerToneLegacy` explicitly. */
export type BannerTone = BannerToneLegacy;

/**
 * Banner shape consumed by SystemBanner / inline alert chips. Callers
 * pick the rendering primitive; this map only declares the strings.
 *
 * `title` is the bold lead-in (matches `<SystemBanner title>`),
 * `body` is the consumer copy. Two fields rather than one so callers
 * can render `title` as a heading on a panel without re-parsing the
 * body, and so a chip-style surface can choose to render only `body`
 * for compactness.
 */
export interface BannerCopy {
  readonly title: string;
  readonly body: string;
  readonly tone: BannerTone;
}

/**
 * Canonical map. Frozen at module load so the closed-set invariant
 * cannot be quietly violated by a downstream patch. Every entry must
 * be present; the type system enforces this via `Record<ServerCode, …>`.
 *
 * Copy guidelines
 * - Lead with what the user can do (Nielsen #9 — guidance, not verdict).
 * - No raw codes (`'forbidden'`, `'429'`, `EHOSTUNREACH`) in the body.
 * - Imperatives are friendly, not military: "Try again in a moment."
 *   not "RETRY".
 */
export const ERROR_BANNERS: Readonly<Record<ServerCode, BannerCopy>> = Object.freeze({
  forbidden: Object.freeze({
    title: 'Permission denied',
    body: 'You do not have permission to do this. Ask an admin if you need access.',
    tone: 'danger',
  }),
  'rate-limited': Object.freeze({
    title: 'Too many requests',
    body: 'You are sending requests too fast. Wait a minute and try again.',
    tone: 'warn',
  }),
  server: Object.freeze({
    title: 'Something went wrong',
    body: 'Something went wrong on our side. Try again in a moment.',
    tone: 'danger',
  }),
  network: Object.freeze({
    title: 'Connection problem',
    body: 'We could not reach the server. Check your connection and try again.',
    tone: 'warn',
  }),
  'invalid-input': Object.freeze({
    title: 'Check your input',
    body: 'That input is not valid. Check the field hints and try again.',
    tone: 'warn',
  }),
  'not-found': Object.freeze({
    title: 'Not found',
    body: 'We could not find what you were looking for. It may have been removed.',
    tone: 'warn',
  }),
  conflict: Object.freeze({
    title: 'Already done',
    body: 'This action conflicts with the current state. Refresh to see the latest values.',
    tone: 'warn',
  }),
  'service-unavailable': Object.freeze({
    title: 'Not available yet',
    body: 'This feature is not enabled yet. Check back soon or ask an admin.',
    tone: 'info',
  }),
  'session-expired': Object.freeze({
    title: 'Session expired',
    body: 'Your session expired. Sign in again to continue.',
    tone: 'warn',
  }),
  'csrf-failed': Object.freeze({
    title: 'Session refresh needed',
    body: 'Your session needs a refresh. Reload the page and try again.',
    tone: 'warn',
  }),
  'invalid-credentials': Object.freeze({
    title: 'Sign in failed',
    body: 'That username or password is not correct. Try again.',
    tone: 'danger',
  }),
  'too-many-attempts': Object.freeze({
    title: 'Too many sign-in attempts',
    body: 'Too many sign-in attempts. Wait a minute before trying again.',
    tone: 'warn',
  }),
  'invite-dead': Object.freeze({
    title: 'Invite already used',
    body: 'This invite has already been used. Ask an admin for a fresh one.',
    tone: 'warn',
  }),
  'members-disabled': Object.freeze({
    title: 'Member access not enabled',
    body: 'Member access is not enabled yet. Check back at private-beta launch.',
    tone: 'info',
  }),
  unknown: Object.freeze({
    title: 'Something went wrong',
    body: 'Something went wrong. Try again in a moment.',
    tone: 'danger',
  }),
});

/**
 * Map an HTTP status code to a {@link ServerCode}. Default-safe: any
 * status not explicitly mapped falls into `'server'` (5xx) or
 * `'unknown'` (everything else) so a new status the API starts
 * emitting can never escape unmapped to the consumer.
 *
 * Optional `bodyCode` lets callers pass a server-supplied discriminator
 * (`{ code: 'csrf-validation-failed' }`) when the status alone is
 * ambiguous. This mirrors the SignInForm `statusFromResponse` shape.
 */
export function serverCodeFromStatus(
  status: number,
  bodyCode?: string,
): ServerCode {
  // body-code overrides — the server explicitly named the failure mode.
  if (bodyCode !== undefined) {
    if (bodyCode === 'csrf-validation-failed') return 'csrf-failed';
    if (bodyCode === 'MEMBERS_UI_DISABLED') return 'members-disabled';
    if (bodyCode === 'email-backend-unavailable') return 'members-disabled';
    if (bodyCode === 'service-not-configured') return 'service-unavailable';
  }
  // Status-only mapping. Order: most specific → most general.
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 410) return 'invite-dead';
  if (status === 422) return 'invalid-input';
  if (status === 400) return 'invalid-input';
  if (status === 429) return 'rate-limited';
  if (status === 503) return 'service-unavailable';
  if (status >= 500 && status <= 599) return 'server';
  return 'unknown';
}

/**
 * Convenience wrapper — accepts a fetch `Response` and returns the
 * {@link BannerCopy}. Reads the body once to extract a `code` field if
 * present; on parse failure falls back to status-only mapping. Never
 * throws — the goal is "produce a banner under any failure mode".
 *
 * The body-read is best-effort because some routes don't return JSON
 * on error (e.g. plain HTML 502 from a proxy); a parse failure is not
 * itself an error condition.
 */
export async function bannerForResponse(res: Response): Promise<BannerCopy> {
  let bodyCode: string | undefined;
  try {
    // Cloning is cheap for small JSON; needed because the caller may
    // also want to read the body for non-error parsing (e.g. a 200
    // mixed with a 4xx retry path). Clone fails on streamed bodies —
    // we swallow the failure and fall back to status-only mapping.
    const clone = res.clone();
    const body = (await clone.json()) as { code?: string };
    if (typeof body?.code === 'string') {
      bodyCode = body.code;
    }
  } catch {
    // not JSON, body already read, or stream unconsumable — fall
    // through to status-only mapping.
  }
  return ERROR_BANNERS[serverCodeFromStatus(res.status, bodyCode)];
}

/**
 * Lookup helper for callers that already hold a {@link ServerCode}.
 * Equivalent to `ERROR_BANNERS[code]` but expresses intent clearly at
 * the call site and keeps `ERROR_BANNERS` itself a pure data table.
 */
export function bannerForCode(code: ServerCode): BannerCopy {
  return ERROR_BANNERS[code];
}

/**
 * Convenience for the `catch (e)` branch of every fetch call site —
 * a thrown error is `'network'` by definition (the request never
 * landed). Pulled out so call sites read `setBanner(networkBanner())`
 * instead of repeating the lookup boilerplate.
 */
export function networkBanner(): BannerCopy {
  return ERROR_BANNERS.network;
}

/* ===================================================================
 * E6.S12 — Banner severity-tone reconciliation (retires F-6-024 P2)
 * ===================================================================
 *
 * Why this exists
 * ---------------
 * Pre-E6.S12, banner copy across the member-facing forms was
 * inconsistent in voice and tone:
 *   - SignInForm carried a private `ERROR_BANNERS` map with copy like
 *     "Member access is not enabled yet."
 *   - RequestInviteForm carried a sibling private `ERROR_BANNERS` map
 *     with copy like "Public beta is not open yet. Check back soon."
 *   - admin/login surfaces consume the canonical `ERROR_BANNERS`.
 *   - Per-form banners mixed `role="alert"` (members sign-in) and
 *     `<SystemBanner tone="danger">` (request-invite) for the same
 *     severity, so screen-reader behaviour diverged.
 *
 * F-6-024 (P2, Nielsen #4 — consistency & standards) called out this
 * inconsistent severity tone across forms. The remediation is a
 * single `BANNER_TONES` table that pairs each consumer-context
 * (forbidden, network, validation, safe-mode, generic) × severity
 * (error / warning / success / info) with:
 *   - `copy`     — the consumer-facing string (guidance voice, not
 *                  verdict).
 *   - `role`     — ARIA role (`'alert' | 'status'`).
 *   - `aria-live`— politeness (`'assertive' | 'polite'`).
 *   - `tone`     — visual treatment that maps to a SystemBanner tone
 *                  (and ultimately to a design token, never a
 *                  hardcoded color).
 *
 * Voice contract (F-6-024 / Nielsen #9 — recognition, not recall;
 * Nielsen #4 — consistency):
 *   - Every error banner reads as guidance, not verdict. "Sign in
 *     failed" is verdict; "That username or password is not correct.
 *     Try again." is guidance.
 *   - Forbidden copy directs the operator to ask an admin (not
 *     "Access denied" full-stop).
 *   - Network copy invites a retry ("Check your connection and try
 *     again.") — never "Network error" terse.
 *   - Validation copy specifies the failing field class — never
 *     "Cannot save" without a clue what to fix.
 *   - Safe-mode copy explains the restriction (what is gated and
 *     why) — never just "Disabled".
 *
 * Severity → SystemBanner tone mapping (visible-effect anchor):
 *   - error   → `'danger'`  (blocking failure; assertive)
 *   - warning → `'warn'`    (recoverable; assertive)
 *   - success → `'success'` (confirmation; polite)
 *   - info    → `'info'`    (informational; polite)
 *
 * Each tone declaration ALSO lists the design-token CSS variable it
 * resolves to (`tokenVar`). This is the F-6-024 anti-regression
 * surface: a future contributor cannot replace `tokenVar` with a
 * hex literal without failing the audit test.
 */

/**
 * Severity vocabulary for the F-6-024 banner-tone table. Maps onto
 * {@link SystemBannerTone} but is the user-facing vocabulary used in
 * call sites (`tones.error.forbidden` reads at intent, not at the
 * design-system primitive).
 */
export type BannerSeverity = 'error' | 'warning' | 'success' | 'info';

/**
 * Banner consumer-contexts. Closed set per F-6-024 — adding a new
 * context requires extending the union, populating an entry in every
 * severity that uses it, and updating the audit-test.
 *
 * - `forbidden`  — 401/403 paths. Voice: "Ask an admin if you need
 *                  access."
 * - `network`    — fetch reject / DNS / connection drop. Voice:
 *                  "Check your connection and try again."
 * - `validation` — 400/422 + client-side schema rejects. Voice
 *                  guides which field to fix.
 * - `safeMode`   — service-unavailable / flag-off / safe-mode
 *                  restriction. Voice explains what is gated.
 * - `generic`    — catch-all when no specific context is known.
 *                  Voice: "Try again in a moment."
 */
export type BannerContext =
  | 'forbidden'
  | 'network'
  | 'validation'
  | 'safeMode'
  | 'generic';

/**
 * ARIA contract per severity. Mirrors {@link SystemBanner}'s internal
 * mapping but is exposed in the table so a caller that renders a
 * banner directly (e.g. an inline `<div role>` chip) cannot diverge
 * from the SystemBanner posture.
 *
 * Pairing rules (cross-check with WAI-ARIA APG):
 *   - `role='alert'`  REQUIRES `aria-live='assertive'`.
 *   - `role='status'` REQUIRES `aria-live='polite'`.
 * The audit-test enforces these pairings — see banner-tones.test.ts.
 */
export type BannerRole = 'alert' | 'status';
export type BannerAriaLive = 'assertive' | 'polite';

/**
 * Visible-effect anchor: the design token that backs each tone. Used
 * by the audit-test to assert no entry inlines a hex literal. Token
 * names match the CSS custom-properties in `src/design/styles/system.css`.
 */
export type BannerToneTokenVar =
  | '--sev-high'
  | '--sev-med'
  | '--jade'
  | '--steel';

/**
 * Mirror of {@link SystemBannerTone} without the `'fixture'` variant
 * (BANNER_TONES describes error/warning/success/info — fixture is a
 * demo-data marker, not a severity).
 */
export type BannerVisualTone = 'warn' | 'danger' | 'info' | 'success';

/**
 * Single banner-tone entry — copy + a11y + visual token. Frozen at
 * construction so a downstream patch cannot retarget the entry
 * without going through this module. Named `BannerToneDef` to avoid
 * a name collision with the legacy `BannerTone` type alias above
 * (kept for back-compat with ERROR_BANNERS callers).
 */
export interface BannerToneDef {
  readonly copy: string;
  readonly role: BannerRole;
  readonly ariaLive: BannerAriaLive;
  readonly severity: BannerSeverity;
  readonly tone: BannerVisualTone;
  /**
   * CSS custom-property name (e.g. `'--sev-high'`) that supplies the
   * accent stripe colour. Stored as a token name, never a hex
   * literal, so the audit-test can spot a regression.
   */
  readonly tokenVar: BannerToneTokenVar;
}

/**
 * Severity × context table. Populated for the contexts each severity
 * uses in practice:
 *   - `error`   covers forbidden / network / validation / safeMode / generic.
 *   - `warning` covers network / validation / safeMode / generic.
 *   - `success` covers validation / generic (form submit confirmations).
 *   - `info`    covers safeMode / generic (informational notes).
 *
 * Asymmetry is deliberate — not every severity makes sense for every
 * context. `forbidden` is only ever `error` (an operator either has
 * permission or does not — there is no "warning forbidden"). The
 * audit-test pins the populated cells exactly.
 */
export interface BannerTonesShape {
  readonly error: {
    readonly forbidden: BannerToneDef;
    readonly network: BannerToneDef;
    readonly validation: BannerToneDef;
    readonly safeMode: BannerToneDef;
    readonly generic: BannerToneDef;
  };
  readonly warning: {
    readonly network: BannerToneDef;
    readonly validation: BannerToneDef;
    readonly safeMode: BannerToneDef;
    readonly generic: BannerToneDef;
  };
  readonly success: {
    readonly validation: BannerToneDef;
    readonly generic: BannerToneDef;
  };
  readonly info: {
    readonly safeMode: BannerToneDef;
    readonly generic: BannerToneDef;
  };
}

/**
 * Canonical severity × context banner table. Frozen at module load
 * so a downstream patch cannot quietly diverge. Each entry:
 *   - `copy`      guidance voice, ≤200 chars, no newlines.
 *   - `role`      ARIA role aligned with severity.
 *   - `ariaLive`  politeness aligned with role.
 *   - `severity`  echo of the outer key — kept on the entry itself so
 *                 a caller that destructures the leaf node still
 *                 carries the severity tag.
 *   - `tone`      SystemBanner visual tone.
 *   - `tokenVar`  CSS custom-property the accent colour resolves to.
 */
export const BANNER_TONES: BannerTonesShape = Object.freeze({
  error: Object.freeze({
    forbidden: Object.freeze({
      copy: 'You do not have permission to do this. Ask an admin if you need access.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'error' as const,
      tone: 'danger' as const,
      tokenVar: '--sev-high' as const,
    }),
    network: Object.freeze({
      copy: 'We could not reach the server. Check your connection and try again.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'error' as const,
      tone: 'danger' as const,
      tokenVar: '--sev-high' as const,
    }),
    validation: Object.freeze({
      copy: 'One or more fields need attention. Check the highlighted inputs and try again.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'error' as const,
      tone: 'danger' as const,
      tokenVar: '--sev-high' as const,
    }),
    safeMode: Object.freeze({
      copy: 'This action is not available while safe-mode is active. Ask an admin to lift the restriction.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'error' as const,
      tone: 'danger' as const,
      tokenVar: '--sev-high' as const,
    }),
    generic: Object.freeze({
      copy: 'Something went wrong. Try again in a moment.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'error' as const,
      tone: 'danger' as const,
      tokenVar: '--sev-high' as const,
    }),
  }),
  // E6.S12 round-2 (V5 W3aa QA — ADR-style intentional-deviation note):
  // `warning` tier uses role="alert" + aria-live="assertive" because in
  // DojoLM the warning tone surfaces conditions the operator MUST attend
  // to immediately (network loss mid-attestation, validation block on a
  // compliance sign-off, safe-mode lockout). WCAG-conventional
  // recommendation is role="status" + aria-live="polite" for recoverable
  // warnings, but recoverable-yet-deferrable warnings in this app use
  // the `info` tier instead. Reviewer note (E6.S12 QA MEDIUM): if a
  // future surface needs a non-interrupting warning, add a new tier
  // (e.g., `caution`) rather than weakening this contract.
  warning: Object.freeze({
    network: Object.freeze({
      copy: 'We could not reach the server. Check your connection and try again.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'warning' as const,
      tone: 'warn' as const,
      tokenVar: '--sev-med' as const,
    }),
    validation: Object.freeze({
      copy: 'Check the highlighted fields and try again.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'warning' as const,
      tone: 'warn' as const,
      tokenVar: '--sev-med' as const,
    }),
    safeMode: Object.freeze({
      copy: 'Some actions are restricted while safe-mode is active.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'warning' as const,
      tone: 'warn' as const,
      tokenVar: '--sev-med' as const,
    }),
    generic: Object.freeze({
      copy: 'Heads up — please review and try again.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
      severity: 'warning' as const,
      tone: 'warn' as const,
      tokenVar: '--sev-med' as const,
    }),
  }),
  success: Object.freeze({
    validation: Object.freeze({
      copy: 'All fields look good. Your changes have been saved.',
      role: 'status' as const,
      ariaLive: 'polite' as const,
      severity: 'success' as const,
      tone: 'success' as const,
      tokenVar: '--jade' as const,
    }),
    generic: Object.freeze({
      copy: 'Done — your changes have been saved.',
      role: 'status' as const,
      ariaLive: 'polite' as const,
      severity: 'success' as const,
      tone: 'success' as const,
      tokenVar: '--jade' as const,
    }),
  }),
  info: Object.freeze({
    safeMode: Object.freeze({
      copy: 'Safe-mode is active. Some controls are read-only until an admin lifts the restriction.',
      role: 'status' as const,
      ariaLive: 'polite' as const,
      severity: 'info' as const,
      tone: 'info' as const,
      tokenVar: '--steel' as const,
    }),
    generic: Object.freeze({
      copy: 'Heads up — nothing to do, just letting you know.',
      role: 'status' as const,
      ariaLive: 'polite' as const,
      severity: 'info' as const,
      tone: 'info' as const,
      tokenVar: '--steel' as const,
    }),
  }),
}) as BannerTonesShape;

/**
 * Map a {@link ServerCode} (HTTP-derived) into the matching
 * BANNER_TONES leaf so HTTP-error call sites can opt into the
 * E6.S12 voice without rewriting their fetch helpers.
 *
 * The mapping is intentionally narrow — most ServerCode values do
 * not have a 1:1 context match (e.g. `'rate-limited'`, `'conflict'`,
 * `'invite-dead'` are all narrower than the five contexts). The
 * helper exposes only the codes where the context match is clean:
 *   - `'forbidden'`           → error.forbidden
 *   - `'network'`             → error.network
 *   - `'invalid-input'`       → error.validation
 *   - `'service-unavailable'` → info.safeMode
 *   - `'members-disabled'`    → info.safeMode
 * Everything else returns `null` so the caller knows to fall back to
 * the legacy ERROR_BANNERS shape.
 */
export function bannerToneForServerCode(code: ServerCode): BannerToneDef | null {
  switch (code) {
    case 'forbidden':
      return BANNER_TONES.error.forbidden;
    case 'network':
      return BANNER_TONES.error.network;
    case 'invalid-input':
      return BANNER_TONES.error.validation;
    case 'service-unavailable':
    case 'members-disabled':
      return BANNER_TONES.info.safeMode;
    default:
      return null;
  }
}
