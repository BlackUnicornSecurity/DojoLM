/**
 * File: v1-deprecation.ts
 * Purpose: Shared deprecation headers for v1 API stubs (RFC 8594 Sunset + RFC 9745 Deprecation)
 * Story: PR-4g.1 — Endpoint deprecation
 */

/** RFC 8594 Sunset date — after this date, endpoints may return 410 Gone */
export const SUNSET_DATE = 'Tue, 30 Jun 2026 00:00:00 GMT'

/** Unix timestamp for the deprecation date (2026-04-10) */
const DEPRECATION_TIMESTAMP = '@1744243200'

/**
 * Build deprecation response headers for a v1 API stub.
 * Includes RFC 8594 Sunset, RFC 9745 Deprecation, and Link successor-version.
 */
export function deprecationHeaders(successorPath: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Sunset': SUNSET_DATE,
    'Deprecation': DEPRECATION_TIMESTAMP,
    'Link': `<${successorPath}>; rel="successor-version"`,
  }
}
