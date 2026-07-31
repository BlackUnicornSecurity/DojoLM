// SPDX-License-Identifier: Apache-2.0
/**
 * Security utilities for LLM provider system (P8-S78a)
 *
 * Provides SSRF protection, credential sanitization, safe JSON path validation,
 * and env-var interpolation restriction.
 *
 * Index:
 * - validateProviderUrl (line ~25)
 * - sanitizeCredentials (line ~125)
 * - validateJsonPath (line ~190)
 * - validateEnvVarRef (line ~220)
 */

import { lookup } from 'node:dns/promises';
import { lookup as lookupCb } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';
import { sanitizeUrl } from './fetch-utils.js';

// ===========================================================================
// SSRF Protection — validateProviderUrl
// ===========================================================================

/** Local provider allowlisted ports */
const LOCAL_ALLOWED_PORTS = new Set([1234, 5001, 7860, 8000, 8080, 11434]);

/** Blocked URL schemes */
const BLOCKED_SCHEMES = new Set(['file:', 'ftp:', 'gopher:', 'data:']);

/** RFC1918 and reserved IP ranges (parsed as prefix checks) */
const BLOCKED_IP_PREFIXES = [
  '10.',                  // 10.0.0.0/8
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.',  // 172.16.0.0/12
  '192.168.',             // 192.168.0.0/16
  '169.254.',             // Link-local
  '0.',                   // 0.0.0.0/8
  '127.',                 // 127.0.0.0/8 loopback (whole range, not just 127.0.0.1)
];

/** Cloud metadata IPs */
const METADATA_IPS = new Set([
  '169.254.169.254',      // AWS/GCP/Azure metadata
  '100.100.100.200',      // Alibaba metadata
  'fd00::',               // IPv6 reserved
]);

/** IPv6 blocked addresses */
const BLOCKED_IPV6 = ['::1', '::ffff:127.0.0.1', 'fe80:', 'fc00:', 'fd00:'];

const TRUSTED_INTERNAL_IPS_ENV = 'TPI_TRUSTED_INTERNAL_IPS';

/**
 * Operator-declared custom NAT64 /96 prefix(es), comma-separated (e.g.
 * `TPI_NAT64_PREFIX=2001:db8:64::/96`). This is the opt-in config knob embeddedIPv4
 * documents for NSPs OUTSIDE the two IANA/RFC-standardized blocks — those can't be
 * auto-detected (a blind extraction would false-block real IPv6 providers), so the
 * operator names their own NAT64 NSP here. Only /96 is honored (embedded IPv4 = the
 * low 32 bits, RFC 6052 §2.2); any other declared length is DROPPED (fail closed to
 * "not configured") rather than matched at the wrong bit positions. Empty by default
 * → zero behavior change.
 */
const NAT64_PREFIX_ENV = 'TPI_NAT64_PREFIX';

function isLocalHostname(hostname: string): boolean {
  // Strip a single trailing dot (FQDN root form, e.g. "localhost.") and lowercase
  // before the equality checks. The OS resolver and native fetch treat "localhost."
  // exactly like "localhost" (loopback), so this classification must too — otherwise
  // a trailing-dot host is mis-classified as remote and reaches loopback via fetch.
  const h = hostname.replace(/\.$/, '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

function isIPv4Address(value: string): boolean {
  return isIP(value) === 4;
}

/**
 * Expand an IPv6 string (compressed, and/or with an embedded dotted-quad tail like
 * `::ffff:1.2.3.4`) to its 16 octets, or null if it isn't a valid IPv6. Gated on
 * `isIP`, so the input is already well-formed — the parse only un-compresses `::`
 * and folds a trailing IPv4 into two hex groups.
 */
function ipv6ToBytes(ip: string): number[] | null {
  if (isIP(ip) !== 6) return null;
  // Drop an RFC 4007 zone id (`%eth0`) before parsing: it only ever rides on
  // link-local/multicast addresses, and if left on the dotted-quad tail it would
  // corrupt the embedded-IPv4 fold — Number('200%eth0') is NaN, which `| 0`
  // coerces to 0, silently truncating the last octet past the exact-match
  // metadata blocklist. isIP already validated the numeric parts.
  let s = ip.toLowerCase().replace(/%.*$/, '');

  // Fold a trailing embedded IPv4 (e.g. `::ffff:1.2.3.4`) into two hex groups.
  const lastColon = s.lastIndexOf(':');
  const maybeV4 = s.slice(lastColon + 1);
  if (maybeV4.includes('.')) {
    const [a, b, c, d] = maybeV4.split('.').map(Number);
    s = `${s.slice(0, lastColon + 1)}${(((a << 8) | b) >>> 0).toString(16)}:${(((c << 8) | d) >>> 0).toString(16)}`;
  }

  const [headStr, tailStr, extra] = s.split('::');
  if (extra !== undefined) return null; // more than one "::" — not valid
  const head = headStr ? headStr.split(':') : [];
  const hasGap = tailStr !== undefined;
  const tail = hasGap && tailStr ? tailStr.split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (hasGap ? missing < 0 : missing !== 0) return null;
  const groups = hasGap ? [...head, ...Array(missing).fill('0'), ...tail] : head;

  const bytes: number[] = [];
  for (const g of groups) {
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  return bytes;
}

/** NAT64 well-known prefix 64:ff9b::/96 (RFC 6052 §2.1). */
function isNat64WellKnown(b: number[]): boolean {
  return b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b
    && b.slice(4, 12).every((x) => x === 0);
}

/** NAT64 local-use prefix 64:ff9b:1::/48 (RFC 8215). */
function isNat64LocalUse(b: number[]): boolean {
  return b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b
    && b[4] === 0x00 && b[5] === 0x01;
}

/**
 * RFC 6052 §2.2: extract the 4 embedded IPv4 octets for an NSP of `pfxLen` bits.
 * The octets start at bit `pfxLen` and run contiguously EXCEPT byte 8 (bits
 * 64-71), which is a reserved zero "u" octet and is skipped for NSPs shorter than
 * /96 — this is what makes the embedded IPv4 non-contiguous for /32../64.
 */
function rfc6052Extract(b: number[], pfxLen: number): string {
  const octets: number[] = [];
  let i = pfxLen / 8;
  while (octets.length < 4) {
    if (i === 8) { i += 1; continue; } // skip the reserved u-octet
    octets.push(b[i]);
    i += 1;
  }
  return octets.join('.');
}

/**
 * If `ip` is an IPv6 address that embeds an IPv4, return every embedded dotted-quad
 * IPv4 candidate; otherwise []. Runs on DNS-RESOLVED addresses (via isBlockedIP)
 * so an internal IPv4 hidden inside an IPv6 (e.g. a malicious AAAA record) is still
 * checked against the IPv4 blocklists — the OS (or a NAT64 gateway) routes these to
 * the embedded IPv4. Feeds both the save-time gate and the connect-time pin.
 *
 * Covers IPv4-mapped `::ffff:a.b.c.d`, SIIT `::ffff:0:a.b.c.d`, deprecated
 * IPv4-compatible `::a.b.c.d`, and the two IANA/RFC-standardized NAT64 prefixes:
 * well-known 64:ff9b::/96 (RFC 6052) and local-use 64:ff9b:1::/48 (RFC 8215). For
 * the /48 block the operator's NSP length is unknown, so we extract at every RFC
 * 6052 length that keeps the /48 prefix intact (/48,/56,/64,/96 — with the bit-64
 * reserved-octet gap) and return all candidates so the caller can fail closed.
 *
 * OUT OF SCOPE: arbitrary operator-specific NAT64 NSPs outside those two blocks
 * (and NSPs shorter than /48). They're indistinguishable from a legitimate
 * global-unicast IPv6 without knowing the operator's prefix, so blind extraction
 * would false-block real IPv6 providers (e.g. a /40 read of `2606:4700::…` decodes
 * to `0.0.0.0`). Exploiting them also requires the app's OWN egress to run a
 * NAT64/CLAT gateway on that NSP — never the case on an IPv4 LAN. If such a
 * deployment appears, admit the operator's NSP via a config knob mirroring
 * TPI_TRUSTED_INTERNAL_IPS rather than widening extraction here.
 */
/**
 * Operator-declared custom NAT64 /96 networks (TPI_NAT64_PREFIX), each as its top
 * 12 network octets. Reuses ipv6ToBytes (which strips the zone id and validates via
 * isIP), so a malformed or non-/96 entry is silently dropped — fail closed to "not
 * configured", never throwing on the connect-time DNS-callback path.
 */
function parseNat64Nsps(): number[][] {
  const out: number[][] = [];
  for (const raw of (process.env[NAT64_PREFIX_ENV] || '').split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    const suffix = entry.match(/\/(\d+)$/);
    if (suffix && suffix[1] !== '96') continue; // only /96; bare = /96
    const bytes = ipv6ToBytes(entry.replace(/\/\d+$/, ''));
    if (bytes) out.push(bytes.slice(0, 12));
  }
  return out;
}

/** True if `b`'s top 96 bits match an operator-declared custom NAT64 /96 NSP. */
function matchesNat64Nsp(b: number[]): boolean {
  return parseNat64Nsps().some((nsp) => nsp.every((octet, i) => octet === b[i]));
}

function embeddedIPv4(ip: string): string[] {
  const b = ipv6ToBytes(ip);
  if (!b) return [];

  const zeroThrough = (end: number) => b.slice(0, end).every((x) => x === 0);
  const tailV4 = `${b[12]}.${b[13]}.${b[14]}.${b[15]}`;

  // IPv4-mapped ::ffff:a.b.c.d
  if (zeroThrough(10) && b[10] === 0xff && b[11] === 0xff) return [tailV4];
  // SIIT translated ::ffff:0:a.b.c.d (ffff marker one group earlier)
  if (zeroThrough(8) && b[8] === 0xff && b[9] === 0xff && b[10] === 0 && b[11] === 0) return [tailV4];
  // NAT64 well-known 64:ff9b::/96
  if (isNat64WellKnown(b)) return [tailV4];
  // Deprecated IPv4-compatible ::a.b.c.d. Match unconditionally: ::/96 is reserved
  // address space with no legitimate traffic to false-positive on, and this keeps
  // embedded 0.0.0.0/8 targets (a real SSRF class, and one of BLOCKED_IP_PREFIXES)
  // in scope. ::/::1 are still blocked via isBlockedIP's raw-string checks.
  if (zeroThrough(12)) return [tailV4];
  // NAT64 local-use 64:ff9b:1::/48 — NSP length unknown, so hand back a candidate
  // per RFC 6052 length; isBlockedIP blocks if ANY is internal (fail closed).
  if (isNat64LocalUse(b)) return [48, 56, 64, 96].map((pl) => rfc6052Extract(b, pl));
  // Operator-declared custom NAT64 /96 NSP (TPI_NAT64_PREFIX, off by default). A
  // custom NSP is unknowable without config; when declared, an address under it
  // routes its low 32 bits to the embedded IPv4, so hand that back as a candidate.
  if (matchesNat64Nsp(b)) return [tailV4];

  return [];
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) | Number(octet)) >>> 0, 0);
}

function isRfc1918Address(ip: string): boolean {
  return ip.startsWith('10.')
    || ip.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

function parseTrustedInternalEntries(): string[] {
  return (process.env[TRUSTED_INTERNAL_IPS_ENV] || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function matchesTrustedInternalEntry(ip: string, entry: string): boolean {
  if (!isIPv4Address(ip)) {
    return false;
  }

  if (entry.includes('/')) {
    const [network, prefixRaw] = entry.split('/');
    const prefix = Number(prefixRaw);
    if (!isIPv4Address(network) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    if (prefix === 0) {
      return true;
    }

    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask);
  }

  return ip === entry;
}

function isTrustedInternalIP(ip: string): boolean {
  if (!isIPv4Address(ip) || !isRfc1918Address(ip)) {
    return false;
  }

  if (METADATA_IPS.has(ip) || ip.startsWith('169.254.') || ip === '127.0.0.1') {
    return false;
  }

  return parseTrustedInternalEntries().some((entry) => matchesTrustedInternalEntry(ip, entry));
}

/**
 * Returns true if `url`'s host is localhost or an operator-trusted internal IP
 * (`TPI_TRUSTED_INTERNAL_IPS`). Providers that serve a LOCAL/internal model — e.g.
 * the Sensei brain on an internal inference box — use this to call
 * `validateProviderUrl` with `isLocal=true` for those hosts, which is what makes the
 * trusted-IP allowlist take effect (the allowlist is only honored on the isLocal
 * path). Remote/public hosts return false, so they still validate as remote. Note:
 * this is a hostname check, not DNS resolution — a bare hostname returns false.
 */
export function isLocalOrTrustedProviderHost(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  return isLocalHostname(hostname) || isTrustedInternalIP(hostname);
}

/**
 * Validate a provider URL for SSRF protection.
 *
 * @param url - The URL to validate
 * @param isLocal - If true, allows localhost with specific ports
 * @returns true if the URL is safe to use
 */
export function validateProviderUrl(url: string, isLocal: boolean = false): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Block dangerous schemes
  if (BLOCKED_SCHEMES.has(parsed.protocol)) {
    return false;
  }

  // Only allow http: and https:
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);

  if (isLocal) {
    if (!LOCAL_ALLOWED_PORTS.has(port)) {
      return false;
    }

    if (isLocalHostname(hostname)) {
      return true;
    }

    return isTrustedInternalIP(hostname);
  }

  // Handle localhost/local providers
  if (isLocalHostname(hostname)) {
    return false;
  }

  // Block all RFC1918, link-local, cloud metadata
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (hostname.startsWith(prefix)) {
      return false;
    }
  }

  // Block cloud metadata IPs
  if (METADATA_IPS.has(hostname)) {
    return false;
  }

  // Block IPv6 reserved addresses
  for (const v6 of BLOCKED_IPV6) {
    if (hostname.startsWith(v6) || hostname === `[${v6}]`) {
      return false;
    }
  }

  // Reject ALL IPv6 literals on the remote path. No legitimate frontier/remote
  // provider is addressed by a raw IPv6 literal, and the various IPv4-embedding
  // forms (mapped [::ffff:a.b.c.d], SIIT, NAT64 64:ff9b::, compatible ::a.b.c.d)
  // each route to an embedded IPv4 while slipping past the string blocklists —
  // a whole class of SSRF bypass. Hostnames are unaffected (their resolved IP is
  // checked in resolveAndValidateUrl, which unwraps embedded IPv4 via isBlockedIP).
  if (isIP(hostname.replace(/^\[|\]$/g, '')) === 6) {
    return false;
  }

  // Block hex/octal encoded IPs (e.g., 0x7f000001 = 127.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^0[0-7]+$/.test(hostname)) {
    return false;
  }

  // Block integer IP representation
  if (/^\d+$/.test(hostname)) {
    return false;
  }

  // External URLs must use HTTPS
  if (!isLocal && parsed.protocol !== 'https:') {
    return false;
  }

  return true;
}

/**
 * Check if a resolved IP address is in a blocked range.
 * Used by resolveAndValidateUrl for DNS rebinding prevention.
 */
function isBlockedIP(ip: string): boolean {
  // A resolved (or literal) IPv6 that embeds an IPv4 (mapped/SIIT/NAT64/compat)
  // routes to that IPv4, so check the raw string AND every embedded-IPv4 candidate
  // against the blocklists. (NAT64 local-use has an unknown NSP length → several
  // candidates; block if any decodes to an internal target.)
  for (const target of [ip, ...embeddedIPv4(ip)]) {
    if (BLOCKED_IP_PREFIXES.some((prefix) => target.startsWith(prefix))) return true;
    if (METADATA_IPS.has(target)) return true;
    if (target === '127.0.0.1' || target === '::1') return true;
  }
  for (const v6 of BLOCKED_IPV6) {
    if (ip.startsWith(v6)) return true;
  }
  return false;
}

/**
 * Decide whether a DNS-RESOLVED (or literal) IP may be connected to. Single
 * source of truth shared by the save-time gate (resolveAndValidateUrl) and the
 * connect-time pin (createPinnedLookup), so both apply identical rules.
 * isBlockedIP unwraps IPv4-in-IPv6 embeddings (mapped/SIIT/NAT64/compat), so an
 * internal IPv4 hidden inside an AAAA record is still caught.
 */
export function isResolvedIpAllowed(ip: string, isLocal: boolean = false): boolean {
  if (isLocal) {
    return ip === '127.0.0.1' || ip === '::1' || isTrustedInternalIP(ip);
  }
  return !isBlockedIP(ip);
}

/**
 * Build a DNS lookup that PINS and revalidates the resolved IP at socket-connect
 * time, for use as an undici connector `lookup`. This closes the TOCTOU /
 * DNS-rebinding window a synchronous pre-check leaves open: the address the socket
 * connects to is the exact one validated here (undici does not re-resolve), and it
 * is checked against the SSRF blocklists via isResolvedIpAllowed. A low-TTL record
 * that pointed at a public IP at save time but rebinds to loopback / RFC1918 /
 * 169.254.169.254 by request time is rejected before any bytes are sent. It also
 * catches an internal IPv4 delivered inside an AAAA record (custom NAT64 etc.),
 * since the real resolved address — not a hostname string — is what gets checked.
 */
export function createPinnedLookup(isLocal: boolean = false): LookupFunction {
  return (hostname, options, callback) => {
    const base = typeof options === 'number' ? { family: options } : { ...(options ?? {}) };
    // Always resolve with all:true so every A/AAAA record is validated, not just
    // the first — an attacker can list a benign public IP alongside a loopback one.
    lookupCb(hostname, { ...base, all: true }, (err, addresses) => {
      if (err) return callback(err, '', 0);
      // Fail closed on an empty result set: dereferencing addresses[0] below would
      // otherwise throw inside this DNS callback (an uncaughtException, not a clean
      // fetch rejection). No address to connect to == reject, never allow.
      if (!addresses || addresses.length === 0) {
        return callback(new Error(`SSRF: ${hostname} resolved to no addresses`), '', 0);
      }
      for (const { address } of addresses) {
        if (!isResolvedIpAllowed(address, isLocal)) {
          return callback(
            new Error(`SSRF: ${hostname} resolved to a blocked internal address`),
            '',
            0,
          );
        }
      }
      // Return in the shape the caller requested (undici/net sets options.all).
      if (typeof options === 'object' && options?.all) {
        return callback(null, addresses, addresses[0].family);
      }
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

/**
 * Resolve hostname to IP and validate against blocked ranges.
 * Prevents DNS rebinding attacks by checking the resolved IP, not just the hostname.
 *
 * @param url - The URL to validate (must already pass validateProviderUrl)
 * @param isLocal - If true, allows localhost resolved IPs
 * @returns The resolved IP address if safe, or null if blocked
 */
export async function resolveAndValidateUrl(url: string, isLocal: boolean = false): Promise<string | null> {
  // First pass: synchronous validation
  if (!validateProviderUrl(url, isLocal)) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // Strip IPv6 brackets

    // Skip DNS resolution for direct IPv4 literals — validate the literal itself.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return isResolvedIpAllowed(hostname, isLocal) ? hostname : null;
    }

    // Resolve DNS to get actual IP, then check it (DNS rebinding defense).
    const result = await lookup(hostname);
    return isResolvedIpAllowed(result.address, isLocal) ? result.address : null;
  } catch {
    return null; // DNS resolution failed
  }
}

// ===========================================================================
// Credential Sanitization — sanitizeCredentials
// ===========================================================================

/** Regex patterns matching known API key formats */
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,           // OpenAI
  /gsk_[a-zA-Z0-9]{20,}/g,          // Groq
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,     // Anthropic
  /AIza[a-zA-Z0-9_-]{30,}/g,        // Google
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi, // Bearer tokens
  /api-key:\s*[a-zA-Z0-9._-]{20,}/gi, // api-key header
];

/** Object keys that contain credentials */
const CREDENTIAL_KEYS = new Set([
  'apikey', 'api_key', 'token', 'secret', 'authorization',
  'x-api-key', 'api-key', 'password', 'credential',
]);

const MAX_DEPTH = 20;

/**
 * Deep-scrub credentials from any object for safe logging/error output.
 *
 * - Replaces strings matching API key patterns with [REDACTED]
 * - Masks values of keys matching credential names (shows last 4 chars only)
 * - Strips auth query params from URL strings
 */
export function sanitizeCredentials(obj: unknown, depth: number = 0): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH_EXCEEDED]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    let result = obj;
    for (const pattern of API_KEY_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      result = result.replace(pattern, '[REDACTED]');
    }
    // If it looks like a URL, sanitize it
    if (result.startsWith('http://') || result.startsWith('https://')) {
      result = sanitizeUrl(result);
    }
    return result;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeCredentials(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (CREDENTIAL_KEYS.has(key.toLowerCase())) {
        // Mask credential values (show last 4 chars)
        if (typeof value === 'string' && value.length > 4) {
          result[key] = '****' + value.slice(-4);
        } else {
          result[key] = '[REDACTED]';
        }
      } else {
        result[key] = sanitizeCredentials(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

// ===========================================================================
// Safe JSON Path Validation — validateJsonPath
// ===========================================================================

/**
 * Strict regex for safe JSON dot-notation paths.
 * Only allows: property.access, array[0] index, no expressions.
 */
const SAFE_JSON_PATH_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*$/;

/** Blocked path segments (prototype chain) */
const BLOCKED_PATHS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validate a JSON path for safe property access.
 *
 * Only supports simple dot notation and numeric array indices.
 * Blocks prototype chain access, expressions, and function calls.
 */
export function validateJsonPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (path.length > 200) return false;

  // Check against strict regex
  if (!SAFE_JSON_PATH_REGEX.test(path)) return false;

  // Check each segment for blocked paths
  const segments = path.split(/[.\[\]]+/).filter(Boolean);
  for (const segment of segments) {
    if (BLOCKED_PATHS.has(segment)) return false;
  }

  return true;
}

/**
 * Resolve a validated JSON path against an object.
 * Only call this with paths that passed validateJsonPath().
 */
export function resolveJsonPath(obj: unknown, path: string): unknown {
  if (!validateJsonPath(path)) {
    throw new Error(`Invalid JSON path: ${path}`);
  }

  // Use a robust segment parser that matches identifiers and numeric indices
  const segments = path.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+/g) ?? [];
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ===========================================================================
// Environment Variable Reference Validation
// ===========================================================================

/**
 * Allowlisted env-var name suffixes for config file interpolation.
 */
const ALLOWED_ENV_SUFFIXES = [
  '_API_KEY', '_BASE_URL', '_MODEL', '_ORGANIZATION_ID', '_SECRET', '_PROJECT_ID',
];

/**
 * Strict regex for allowed env var names.
 * Must start with uppercase letter, contain only uppercase/digits/underscore,
 * and end with an allowed suffix.
 */
const ENV_VAR_REGEX = /^[A-Z][A-Z0-9_]*_(API_KEY|BASE_URL|MODEL|ORGANIZATION_ID|SECRET|PROJECT_ID)$/;

/**
 * Validate an environment variable reference for safe interpolation.
 *
 * Only allows variable names matching *_API_KEY, *_BASE_URL, *_MODEL,
 * *_ORGANIZATION_ID, *_SECRET, *_PROJECT_ID patterns.
 * Rejects arbitrary env-var expansion (e.g., ${PATH}, ${HOME}).
 */
export function validateEnvVarRef(ref: string): boolean {
  if (!ref || typeof ref !== 'string') return false;
  if (ref.length > 100) return false;
  return ENV_VAR_REGEX.test(ref);
}
