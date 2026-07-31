// SPDX-License-Identifier: Apache-2.0
/**
 * Browser-side CSRF cookie reader (YR.14.1).
 *
 * Mirrors the cookie name in `lib/auth/route-guard.ts:CSRF_COOKIE_NAME`.
 * Returns `null` when run server-side (no `document`) or when the cookie
 * is absent. Extracted from per-page copies in `/admin/flags`,
 * `/admin/users`, and `/admin/settings` so a future cookie-name rename
 * is a one-file change.
 */
const CSRF_COOKIE_NAME = 'tpi_csrf';

export function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
      ?.split('=')[1] ?? null
  );
}
