/**
 * S61: THREATFEED URL Validator
 * Validates source URLs against allowlist and blocks internal/private IPs.
 * Per SME CRIT-05: block RFC1918/localhost/link-local.
 */

import type { URLAllowlist } from './types.js';
import { DEFAULT_URL_ALLOWLIST } from './types.js';

/**
 * Check if an IP address is internal/private.
 * Blocks: RFC1918, localhost, link-local, multicast, broadcast.
 */
export function isInternalIP(ip: string): boolean {
  // IPv4 private ranges
  if (/^10\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;

  // Localhost
  if (/^127\./.test(ip)) return true;
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

  // Link-local
  if (/^169\.254\./.test(ip)) return true;
  if (/^fe80:/i.test(ip)) return true;

  // Multicast
  if (/^(22[4-9]|23[0-9])\./.test(ip)) return true;
  if (/^ff/i.test(ip)) return true;

  // Broadcast
  if (ip === '255.255.255.255') return true;

  // Cloud metadata endpoints
  if (ip === '169.254.169.254') return true;

  // Null/unspecified
  if (ip === '0.0.0.0' || ip === '::') return true;

  return false;
}

/**
 * Validate a source URL against the allowlist and security rules.
 */
export function validateSourceURL(
  url: string,
  allowlist: URLAllowlist = DEFAULT_URL_ALLOWLIST
): { valid: boolean; reason?: string } {
  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Protocol check
  if (allowlist.protocols.length > 0 && !allowlist.protocols.includes(parsed.protocol.replace(':', ''))) {
    return { valid: false, reason: `Protocol ${parsed.protocol} not allowed` };
  }

  // Block non-HTTPS by default
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS URLs are allowed' };
  }

  // Block internal hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return { valid: false, reason: 'Localhost URLs are blocked' };
  }

  // Check if hostname is an IP
  const ipv4Match = hostname.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match && isInternalIP(ipv4Match[1])) {
    return { valid: false, reason: 'Internal IP addresses are blocked' };
  }

  // Domain allowlist (if configured)
  if (allowlist.domains.length > 0) {
    const isDomainAllowed = allowlist.domains.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );
    if (!isDomainAllowed) {
      return { valid: false, reason: `Domain ${hostname} not in allowlist` };
    }
  }

  // Block common internal domains
  const blockedDomains = [
    'internal', 'intranet', 'corp', 'local',
    'metadata.google.internal', 'instance-data',
  ];
  for (const blocked of blockedDomains) {
    if (hostname.includes(blocked)) {
      return { valid: false, reason: `Domain contains blocked keyword: ${blocked}` };
    }
  }

  return { valid: true };
}
