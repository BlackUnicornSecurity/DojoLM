// SPDX-License-Identifier: Apache-2.0
/**
 * OIDC token source — supplies the short-lived OIDC token the Fulcio
 * keyless flow exchanges for a signing certificate.
 *
 * E1-PHASE-4-M2 slice 1. The token is a BEARER SECRET (blueprint §3.2 /
 * §5 anti-patterns #1, #15), so this module is deliberately strict:
 *
 *   - `acquire()` returns a **`Buffer`** (JS strings are immutable → not
 *     zeroizable). The caller (keyless adapter) `.fill(0)`s it after use.
 *   - The token is fetched **per-`sign()` call**, never cached on the
 *     signer — `buildOidcTokenSource` resolves NOTHING at construction;
 *     each `acquire()` re-reads/re-fetches.
 *   - The `aud` + `iss` claims are **PINNED at acquisition** — a token
 *     minted for issuer X (or audience Y) must not be silently used
 *     against a different Fulcio. On mismatch the intermediate Buffer is
 *     `.fill(0)`'d before the throw.
 *   - The raw token NEVER appears in a thrown error, a log, or the
 *     returned error chain.
 *
 * Three §0-supported variants (issuer = self-hosted Fulcio fileca + Dex):
 *   - `file`     — read a mounted token file (e.g. a projected SA token).
 *   - `env`      — read a named env var.
 *   - `endpoint` — POST to a Dex token endpoint via Node-core `fetch`
 *                  (ZERO npm deps — blueprint Q3 shell-to-cosign posture).
 *
 * Note: the `env`/`endpoint` variants necessarily hold the token as a JS
 * string transiently (env value / parsed JSON) before it is copied into a
 * Buffer; that string is not zeroizable and is left to GC. The persistent
 * holding form is always the Buffer.
 *
 * License: Apache-2.0.
 */

import { readFile } from 'node:fs/promises';

/** Which OIDC response field carries the token (endpoint variant). */
export type OidcTokenField = 'id_token' | 'access_token';

/**
 * Declarative token-source configuration. The factory builds an
 * {@link OidcTokenSource} port from it; the web wire (S2) constructs this
 * from per-surface env. Every variant pins the expected `aud` + `iss`.
 */
export type OidcTokenSourceConfig =
  | {
      readonly kind: 'file';
      /** Absolute path to a file whose contents are the OIDC token. */
      readonly path: string;
      readonly expectedAudience: string;
      readonly expectedIssuer: string;
    }
  | {
      readonly kind: 'env';
      /** Name of the env var carrying the OIDC token. */
      readonly variable: string;
      readonly expectedAudience: string;
      readonly expectedIssuer: string;
    }
  | {
      readonly kind: 'endpoint';
      /** Dex (or other OIDC) token endpoint URL. */
      readonly url: string;
      /** Optional request headers (e.g. content-type, basic auth). */
      readonly headers?: Readonly<Record<string, string>>;
      /** Optional request body (e.g. url-encoded grant params). */
      readonly body?: string;
      /** Response field to read (default `id_token`). */
      readonly tokenField?: OidcTokenField;
      readonly expectedAudience: string;
      readonly expectedIssuer: string;
    };

/**
 * Port that yields a fresh OIDC token on demand. `acquire()` is called
 * once per `sign()`; the returned Buffer is the caller's to zeroize.
 */
export interface OidcTokenSource {
  readonly expectedAudience: string;
  readonly expectedIssuer: string;
  acquire(): Promise<Buffer>;
}

/**
 * Build an {@link OidcTokenSource} from declarative config. Performs NO
 * I/O at construction — the token is resolved lazily, per `acquire()`.
 */
export function buildOidcTokenSource(config: OidcTokenSourceConfig): OidcTokenSource {
  return {
    expectedAudience: config.expectedAudience,
    expectedIssuer: config.expectedIssuer,
    async acquire(): Promise<Buffer> {
      const raw = await readRawToken(config);
      const buf = Buffer.from(raw, 'utf8');
      try {
        assertTokenClaims(raw, config.expectedAudience, config.expectedIssuer);
      } catch (err) {
        // Zeroize the secret-bearing Buffer before propagating (R-T1).
        buf.fill(0);
        throw err;
      }
      return buf;
    },
  };
}

function readRawToken(config: OidcTokenSourceConfig): Promise<string> {
  switch (config.kind) {
    case 'file':
      return readFileToken(config.path);
    case 'env':
      return readEnvToken(config.variable);
    case 'endpoint':
      return readEndpointToken(config);
  }
}

async function readFileToken(path: string): Promise<string> {
  const raw = await readFile(path, 'utf8');
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(`[oidc-token-source] token file is empty: ${path}`);
  }
  return trimmed;
}

async function readEnvToken(variable: string): Promise<string> {
  const raw = process.env[variable];
  if (raw === undefined) {
    throw new Error(`[oidc-token-source] token env var '${variable}' is not set`);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(`[oidc-token-source] token env var '${variable}' is empty`);
  }
  return trimmed;
}

async function readEndpointToken(config: {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly tokenField?: OidcTokenField;
}): Promise<string> {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: config.headers ?? {},
    body: config.body ?? null,
  });
  if (!res.ok) {
    throw new Error(
      `[oidc-token-source] token endpoint returned HTTP ${res.status}`,
    );
  }
  const body = (await res.json()) as Record<string, unknown> | null;
  const field = config.tokenField ?? 'id_token';
  const token = body === null ? undefined : body[field];
  if (typeof token !== 'string') {
    throw new Error(
      `[oidc-token-source] token endpoint response missing '${field}'`,
    );
  }
  return token.trim();
}

/**
 * Decode the JWT payload (UNVERIFIED — Fulcio verifies the signature
 * against the issuer's JWKS server-side) and assert the `iss` + `aud`
 * claims match what the operator pinned. This catches a token-source
 * misconfiguration (issuer X token wired to Fulcio Y) BEFORE the bearer
 * secret ever reaches cosign. Throws on any mismatch; error messages
 * carry only the EXPECTED (operator-configured) values — never the token.
 */
function assertTokenClaims(
  rawToken: string,
  expectedAudience: string,
  expectedIssuer: string,
): void {
  const segments = rawToken.split('.');
  if (segments.length !== 3) {
    throw new Error(
      '[oidc-token-source] token is not a well-formed JWT (expected three dot-separated segments)',
    );
  }
  const payloadSegment = segments[1];
  if (!payloadSegment) {
    throw new Error(
      '[oidc-token-source] token is not a well-formed JWT (empty payload segment)',
    );
  }
  let claims: unknown;
  try {
    const payloadJson = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    claims = JSON.parse(payloadJson);
  } catch {
    throw new Error(
      '[oidc-token-source] JWT payload segment is not valid JSON',
    );
  }
  if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) {
    throw new Error('[oidc-token-source] JWT claims are not a JSON object');
  }
  const { iss, aud } = claims as { iss?: unknown; aud?: unknown };
  if (iss !== expectedIssuer) {
    throw new Error(
      `[oidc-token-source] token issuer claim does not match the pinned issuer (expected ${expectedIssuer})`,
    );
  }
  const audMatches =
    (typeof aud === 'string' && aud === expectedAudience) ||
    (Array.isArray(aud) && aud.includes(expectedAudience));
  if (!audMatches) {
    throw new Error(
      `[oidc-token-source] token audience claim does not include the pinned audience (expected ${expectedAudience})`,
    );
  }
}
