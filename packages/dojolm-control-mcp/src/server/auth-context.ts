// SPDX-License-Identifier: Apache-2.0
/**
 * Auth-context resolution — confused-deputy-safe.
 *
 * The MCP never holds an ambient platform credential on the HTTP transport: it
 * forwards the CALLER's key so the platform's `withAuth` derives the role from
 * the caller's own scopes. The single shared secret here is only the
 * confirmation-token HMAC key (NOT a platform credential).
 *
 *  - stdio (local single user): key + base URL from env.
 *  - HTTP (remote): per-request `Authorization: Bearer …` → forwarded; base URL
 *    from env. NEVER falls back to an ambient env key (else every caller would
 *    inherit that role).
 */

import { createHash } from 'node:crypto';
import type { AuthContext } from '../types.js';

function shortHash(v: string): string {
  return createHash('sha256').update(v).digest('hex').slice(0, 16);
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

/** Resolve auth for the stdio transport from the environment. */
export function resolveStdioAuth(env: NodeJS.ProcessEnv = process.env): AuthContext {
  const baseUrl = env.DOJOLM_BASE_URL ?? DEFAULT_BASE_URL;
  const apiKey = env.DOJOLM_API_KEY || undefined;
  return {
    baseUrl,
    apiKey,
    identity: apiKey ? `key:${shortHash(apiKey)}` : 'stdio:anonymous',
  };
}

/** Extract a bearer token from an Authorization header value. */
export function bearerFrom(authorization: string | undefined | null): string | undefined {
  if (!authorization) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return m?.[1]?.trim() || undefined;
}

/**
 * Resolve auth for the HTTP transport from the request's Authorization header.
 * NEVER reads an ambient env key — an unauthenticated caller stays
 * unauthenticated (the platform then rejects with 401/403).
 */
export function resolveHttpAuth(
  authorization: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
): AuthContext {
  const baseUrl = env.DOJOLM_BASE_URL ?? DEFAULT_BASE_URL;
  const apiKey = bearerFrom(authorization);
  return {
    baseUrl,
    apiKey,
    identity: apiKey ? `key:${shortHash(apiKey)}` : 'http:anonymous',
  };
}
