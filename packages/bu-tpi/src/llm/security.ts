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
];

/** Cloud metadata IPs */
const METADATA_IPS = new Set([
  '169.254.169.254',      // AWS/GCP/Azure metadata
  '100.100.100.200',      // Alibaba metadata
  'fd00::',               // IPv6 reserved
]);

/** IPv6 blocked addresses */
const BLOCKED_IPV6 = ['::1', '::ffff:127.0.0.1', 'fe80:', 'fc00:', 'fd00:'];

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

  // Handle localhost/local providers
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
    if (isLocal) {
      // For local providers, only allow specific ports
      return LOCAL_ALLOWED_PORTS.has(port);
    }
    // Non-local requests to localhost are blocked
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
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (ip.startsWith(prefix)) return true;
  }
  if (METADATA_IPS.has(ip)) return true;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  for (const v6 of BLOCKED_IPV6) {
    if (ip.startsWith(v6)) return true;
  }
  return false;
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

    // Skip DNS resolution for direct IP addresses
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return isBlockedIP(hostname) && !isLocal ? null : hostname;
    }

    // Resolve DNS to get actual IP
    const result = await lookup(hostname);
    const resolvedIP = result.address;

    // Check resolved IP against blocklists (DNS rebinding defense)
    if (isBlockedIP(resolvedIP) && !isLocal) {
      return null; // DNS rebinding detected
    }

    // For local mode, only allow 127.0.0.1
    if (isLocal && resolvedIP !== '127.0.0.1' && resolvedIP !== '::1') {
      return null;
    }

    return resolvedIP;
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
