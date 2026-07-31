// SPDX-License-Identifier: Apache-2.0
/**
 * pluralize — small helper for English plural form selection.
 *
 * Story: E9.S9 — Form + copy polish cluster (NEW v3) · retires
 * F-6-025 (P2 "user(s)" shortcut sprinkled across server + UI copy).
 *
 * Motivation
 * ----------
 * The remediation plan flagged that `/admin/users` already prints
 * "1 user" / "5 users" correctly, while several other surfaces fall
 * back to the cheap "(s)" shortcut (`1 execution(s) older than 30 days`).
 * The Polish reading-level principle and Nielsen #4 (match between
 * system and the real world) both push us toward the readable form.
 *
 * Contract
 * --------
 *   pluralize(n, 'user', 'users')   →  '1 user' / '0 users' / '5 users'
 *   pluralize(2, 'octopus', 'octopodes')  →  '2 octopodes'
 *
 * Rules
 *   - English: singular only when `|n| === 1`, otherwise plural.
 *     "0 users", "-1 users", "5.5 users" all use the plural form.
 *   - The function ALWAYS returns "<n> <word>" — callers that want
 *     just the word (e.g. for typography in a separate <span>) can
 *     use `pluralizeWord` instead.
 *   - `n` is rendered as-is via `String(n)`; callers responsible for
 *     locale-aware formatting (`Intl.NumberFormat`) before calling.
 *
 * Not in scope
 *   - Non-English plural rules (i18n is out of scope per closeout doc;
 *     the platform ships en-US copy only). When i18n lands, this helper
 *     will be retired in favour of `Intl.PluralRules`.
 */

/**
 * Return the plural-form WORD for a count, without the count itself.
 *
 * @example
 *   pluralizeWord(1, 'user', 'users')   // 'user'
 *   pluralizeWord(0, 'user', 'users')   // 'users'
 *   pluralizeWord(2, 'user', 'users')   // 'users'
 *   pluralizeWord(-1, 'user', 'users')  // 'users'
 */
export function pluralizeWord(
  n: number,
  singular: string,
  plural: string,
): string {
  return Math.abs(n) === 1 ? singular : plural;
}

/**
 * Return "<n> <word>" with the word selected by `n`.
 *
 * @example
 *   pluralize(1, 'user', 'users')        // '1 user'
 *   pluralize(0, 'user', 'users')        // '0 users'
 *   pluralize(5, 'execution', 'executions')  // '5 executions'
 *   pluralize(1, 'octopus', 'octopodes') // '1 octopus'
 */
export function pluralize(
  n: number,
  singular: string,
  plural: string,
): string {
  return `${n} ${pluralizeWord(n, singular, plural)}`;
}
