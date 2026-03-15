/**
 * H17.2: Target Connector
 * Handles target URL validation (SSRF protection), health checks,
 * rate-limited request sending, and credential sanitization.
 *
 * Index:
 * - BLOCKED_IP_PREFIXES / METADATA_IPS (line ~15)
 * - validateTargetUrl (line ~40)
 * - healthCheck (line ~100)
 * - sendRequest (line ~120)
 * - sanitizeCredentials (line ~170)
 */

import * as crypto from 'node:crypto';
import type { AuthConfig } from './types.js';

// --- SSRF Protection ---

const BLOCKED_SCHEMES = new Set(['file:', 'ftp:', 'gopher:', 'data:']);

const BLOCKED_IP_PREFIXES = [
  '10.',
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',
  '169.254.',
  '0.',
];

const METADATA_IPS = new Set([
  '169.254.169.254',
  '100.100.100.200',
  'fd00::',
]);

const BLOCKED_IPV6 = ['::1', '::ffff:127.0.0.1', 'fe80:', 'fc00:', 'fd00:'];

export interface TargetValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Validate a target URL for SSRF protection.
 * Blocks RFC1918, cloud metadata, localhost (unless allowLocalhost=true).
 */
export function validateTargetUrl(
  url: string,
  allowLocalhost: boolean = false,
): TargetValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (BLOCKED_SCHEMES.has(parsed.protocol)) {
    return { valid: false, reason: `Blocked scheme: ${parsed.protocol}` };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Unsupported scheme: ${parsed.protocol}` };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Embedded credentials not allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Localhost check
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
    if (!allowLocalhost) {
      return { valid: false, reason: 'Localhost targets not allowed' };
    }
    return { valid: true };
  }

  // Block RFC1918
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (hostname.startsWith(prefix)) {
      return { valid: false, reason: `Blocked private IP range: ${prefix}` };
    }
  }

  // Block cloud metadata
  if (METADATA_IPS.has(hostname)) {
    return { valid: false, reason: 'Cloud metadata endpoint blocked' };
  }

  // Block IPv6 reserved
  for (const v6 of BLOCKED_IPV6) {
    if (hostname.startsWith(v6) || hostname === `[${v6}]`) {
      return { valid: false, reason: 'Blocked IPv6 address' };
    }
  }

  // Block hex/octal/integer IPs
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^0[0-7]+$/.test(hostname) || /^\d+$/.test(hostname)) {
    return { valid: false, reason: 'Encoded IP addresses not allowed' };
  }

  return { valid: true };
}

// --- Health Check ---

/**
 * Perform a health check against the target URL.
 * HEAD request with 5s timeout.
 */
export async function healthCheck(url: string, auth: AuthConfig): Promise<boolean> {
  try {
    const headers = buildAuthHeaders(auth);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// --- Rate-Limited Request Sending ---

let lastRequestTime = 0;

/**
 * Send a request to the target with rate limiting and auth.
 * Returns response status, body, and elapsed time.
 */
export async function sendRequest(
  url: string,
  auth: AuthConfig,
  payload: string,
  rateLimit: number,
): Promise<{ status: number; body: string; elapsed: number }> {
  // Enforce minimum interval between requests
  const minIntervalMs = 1000 / Math.max(1, Math.min(rateLimit, 50));
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < minIntervalMs) {
    await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed));
  }

  lastRequestTime = Date.now();

  const headers = buildAuthHeaders(auth);
  headers['Content-Type'] = 'application/json';
  headers['X-Request-ID'] = crypto.randomUUID();

  const startTime = performance.now();

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: payload,
  });

  const body = await response.text();
  const elapsedMs = performance.now() - startTime;

  return {
    status: response.status,
    body,
    elapsed: elapsedMs,
  };
}

/**
 * Reset the rate limiter state (used in testing).
 */
export function resetRateLimiter(): void {
  lastRequestTime = 0;
}

// --- Auth Header Builder ---

function buildAuthHeaders(auth: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (auth.type) {
    case 'api_key':
      if (auth.credentials['header'] && auth.credentials['value']) {
        headers[auth.credentials['header']] = auth.credentials['value'];
      } else if (auth.credentials['api_key']) {
        headers['X-API-Key'] = auth.credentials['api_key'];
      }
      break;
    case 'bearer':
      if (auth.credentials['token']) {
        headers['Authorization'] = `Bearer ${auth.credentials['token']}`;
      }
      break;
    case 'oauth2_client_credentials':
      if (auth.credentials['access_token']) {
        headers['Authorization'] = `Bearer ${auth.credentials['access_token']}`;
      }
      break;
  }

  return headers;
}

// --- Credential Sanitization ---

const CREDENTIAL_KEY_PATTERN = /key|token|secret|password|credential/i;

/**
 * Deep-clone an object and replace any credential values with '[REDACTED]'.
 * Matches keys containing key, token, secret, password, or credential.
 */
export function sanitizeCredentials(obj: Record<string, unknown>): Record<string, unknown> {
  return deepSanitize(obj, 0) as Record<string, unknown>;
}

function deepSanitize(value: unknown, depth: number): unknown {
  if (depth > 20) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CREDENTIAL_KEY_PATTERN.test(k)) {
        result[k] = '[REDACTED]';
      } else {
        result[k] = deepSanitize(v, depth + 1);
      }
    }
    return result;
  }

  return value;
}
