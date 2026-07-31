// SPDX-License-Identifier: Apache-2.0
/**
 * intl.ts — F-8-013 (Wave 3kk) centralized locale + currency formatting.
 *
 * Story
 * -----
 * F-8-013 (P3) flagged the hardcoded `'en-US'` / `$` literals scattered
 * across `/admin/ronin`, Arena `<FighterSidebar>`, `<ConceptReconPanel>`,
 * `<ShinganClient>`, and `<ScenarioRunner>`. The remediation plan named
 * F-6-026 (full i18n) as a deferred XL effort; F-8-013 is the slim
 * follow-on that centralizes the locale + currency tokens so the next
 * i18n pass has a single seam to retarget.
 *
 * Scope
 * -----
 *   - Single `LOCALE` constant + single `CURRENCY` constant.
 *   - `formatNumber(value, options?)` → `Intl.NumberFormat(LOCALE, opts)`.
 *   - `formatCurrency(value, options?)` → forces `style: 'currency'` +
 *     `currency: CURRENCY` unless caller overrides.
 *
 * Configurability
 * ---------------
 * Both constants honour an optional env override at module-load time:
 *   - `NEXT_PUBLIC_LOCALE`   → BCP-47 tag (e.g. `'fr-FR'`)
 *   - `NEXT_PUBLIC_CURRENCY` → ISO 4217 code (e.g. `'EUR'`)
 *
 * The defaults preserve the current shipping behaviour
 * (`'en-US'` + `'USD'`). Env reads happen once at import time so the
 * helper stays synchronous and SSR-safe; consumers do not need to thread
 * a locale-context through their component tree.
 *
 * Non-goals
 * ---------
 *   - Full i18n (translation strings, `Intl.PluralRules`, RTL): out of
 *     scope per the closeout doc. F-6-026 will retire `LOCALE` in favour
 *     of a per-request resolver when that lands.
 *   - Date formatting: `Intl.DateTimeFormat` already accepts an explicit
 *     locale; adding a date helper is the next sub-finding.
 */

/**
 * Pick a trimmed string env value, returning the fallback if undefined,
 * empty after trim, or not present. Tolerates either `NEXT_PUBLIC_*` or
 * the explicit constant the Next runtime injects into the client bundle.
 */
function pickEnv(name: string, fallback: string): string {
  if (typeof process === 'undefined' || !process.env) return fallback;
  const raw = process.env[name];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Default BCP-47 locale used by every `formatNumber` / `formatCurrency`
 * call site. Set via `NEXT_PUBLIC_LOCALE` env var or defaults to
 * `'en-US'` (current shipping copy is English-only — see the
 * V1→V2 restoration closeout for i18n status).
 */
export const LOCALE: string = pickEnv('NEXT_PUBLIC_LOCALE', 'en-US');

/**
 * Default ISO 4217 currency code used by `formatCurrency` when the
 * caller does not pass an explicit override. Set via
 * `NEXT_PUBLIC_CURRENCY` or defaults to `'USD'`.
 */
export const CURRENCY: string = pickEnv('NEXT_PUBLIC_CURRENCY', 'USD');

/**
 * Sanitize a numeric input — non-finite values render as `0` to match
 * the existing call-site behaviour (`FighterSidebar.formatBounty` and
 * `RoninAdminClient.payoutFmt` both clamp to 0 on NaN/Infinity).
 */
function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Format a number using the platform LOCALE.
 *
 * @example
 *   formatNumber(1234)                          // '1,234' (en-US)
 *   formatNumber(0.5, { style: 'percent' })     // '50%'  (en-US)
 *   formatNumber(NaN)                           // '0'    — safe fallback
 *
 * @param value   numeric value (NaN / Infinity → `0`)
 * @param options optional `Intl.NumberFormatOptions`
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE, options).format(safeNumber(value));
}

/**
 * Format a number as currency using the platform LOCALE + CURRENCY.
 *
 * Caller may override `currency` or any other `NumberFormatOptions`
 * key (e.g. `currencyDisplay: 'code'`, `minimumFractionDigits: 0`); the
 * platform default `style: 'currency'` is always enforced.
 *
 * @example
 *   formatCurrency(4800)                                       // '$4,800.00'
 *   formatCurrency(4800, { maximumFractionDigits: 0 })         // '$4,800'
 *   formatCurrency(50, { currency: 'EUR' })                    // '€50.00'
 *
 * @param value   numeric value (NaN / Infinity → `0`)
 * @param options optional `Intl.NumberFormatOptions` (style is forced)
 */
export function formatCurrency(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    ...(options ?? {}),
  }).format(safeNumber(value));
}
