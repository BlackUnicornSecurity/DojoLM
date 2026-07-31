// SPDX-License-Identifier: Apache-2.0
/**
 * Two-phase confirmation gate for mutating / destructive tools.
 *
 * First `tools/call` of a `requiresConfirmation` tool returns the resolved
 * request + an HMAC `confirmationToken` WITHOUT executing. The second call with
 * `confirm: true` + the token executes. The token binds
 * {callId, tool, args-hash, identity, exp} under a per-deployment secret and is
 * single-use (a nonce store rejects replay), so it survives the stateless HTTP
 * transport and cannot be forged or replayed.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 5 * 60_000;

export interface ConfirmationClaims {
  readonly callId: string;
  readonly tool: string;
  readonly argsHash: string;
  readonly identity: string;
  readonly exp: number;
}

/** Stable KEYED hash of the resolved arguments (order-independent). Keyed by
 * the deployment secret so the digest is a real MAC — an attacker who reads the
 * (unencrypted) token payload cannot predict or correlate argument hashes. */
export function hashArgs(args: Readonly<Record<string, unknown>>, secret: string): string {
  const canonical = JSON.stringify(args, Object.keys(args).sort());
  return createHmac('sha256', secret).update(canonical).digest('hex').slice(0, 32);
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Mint a single-use confirmation token binding the claims. */
export function issueConfirmationToken(claims: ConfirmationClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export type VerifyResult =
  | { readonly ok: true; readonly claims: ConfirmationClaims }
  | { readonly ok: false; readonly reason: string };

/** The single-use nonce store. In-memory per process; swap for a shared store
 * (Redis) behind a multi-instance HTTP edge. */
export class ConfirmationStore {
  private readonly used = new Map<string, number>();

  private sweep(now: number): void {
    for (const [k, exp] of this.used) if (exp <= now) this.used.delete(k);
  }

  /**
   * Verify a token against the expected (tool, args-hash, identity), enforce
   * TTL, and consume the nonce (single-use). Returns the claims on success.
   */
  verifyAndConsume(
    token: string,
    expected: { tool: string; argsHash: string; identity: string },
    secret: string,
    now: number = Date.now(),
  ): VerifyResult {
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return { ok: false, reason: 'malformed token' };
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expectedSig = sign(payload, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad signature' };
    }

    let claims: ConfirmationClaims;
    try {
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ConfirmationClaims;
    } catch {
      return { ok: false, reason: 'malformed payload' };
    }

    if (claims.exp <= now) return { ok: false, reason: 'token expired' };
    if (claims.tool !== expected.tool) return { ok: false, reason: 'tool mismatch' };
    if (claims.argsHash !== expected.argsHash) return { ok: false, reason: 'arguments changed' };
    if (claims.identity !== expected.identity) return { ok: false, reason: 'identity mismatch' };

    this.sweep(now);
    if (this.used.has(token)) return { ok: false, reason: 'token already used' };
    this.used.set(token, claims.exp);

    return { ok: true, claims };
  }
}

/** Build the claims for a fresh confirmation challenge. */
export function buildClaims(
  callId: string,
  tool: string,
  args: Readonly<Record<string, unknown>>,
  identity: string,
  secret: string,
  now: number = Date.now(),
): ConfirmationClaims {
  return { callId, tool, argsHash: hashArgs(args, secret), identity, exp: now + TOKEN_TTL_MS };
}
