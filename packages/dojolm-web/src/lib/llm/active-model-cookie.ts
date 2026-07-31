// SPDX-License-Identifier: Apache-2.0
/**
 * Active Model Switcher — Story B helper.
 *
 * Reads the `noda-active-model` cookie from a request. Works against
 * both `Request` (used by tests) and `NextRequest` (used in
 * production). NextRequest exposes `.cookies.get(name)?.value`; the
 * fetch `Request` only exposes the `cookie` header. We try the
 * structured accessor first, then fall back to header parsing.
 */
export const ACTIVE_MODEL_COOKIE_NAME = 'noda-active-model';

export function readActiveModelCookie(
  request: Request,
): string | undefined {
  const direct = (request as Request & {
    cookies?: { get?: (key: string) => { value?: string } | undefined };
  }).cookies?.get?.(ACTIVE_MODEL_COOKIE_NAME)?.value;
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.split('=');
    if (rawName?.trim() === ACTIVE_MODEL_COOKIE_NAME) {
      const value = rest.join('=').trim();
      if (value.length > 0) return decodeURIComponent(value);
    }
  }
  return undefined;
}
