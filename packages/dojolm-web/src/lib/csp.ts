/**
 * File: csp.ts
 * Purpose: CSP directive builder — shared between middleware (per-request) and tests
 * Story: H-04 — CSP nonces, remove unsafe-inline from script-src
 */

/**
 * Build a Content-Security-Policy string with a per-request nonce.
 *
 * Notes:
 * - script-src uses 'nonce-{nonce}' instead of 'unsafe-inline' (H-04).
 * - style-src keeps 'unsafe-inline' for Tailwind runtime injection (separate ticket).
 * - connect-src 'self': all LLM API calls are server-side proxied.
 */
export function buildCsp(nonce: string, isDev: boolean, forceHttps: boolean): string {
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}'`

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // style-src 'unsafe-inline' required: Next.js/Tailwind injects inline styles at runtime
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // All LLM API calls are server-side proxied; browser only talks to local server
    "connect-src 'self'",
    // Story 13.7: frame-ancestors 'none' to prevent clickjacking
    "frame-ancestors 'none'",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Story 13.7: upgrade-insecure-requests — only when explicitly enabled
    ...(forceHttps ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}
