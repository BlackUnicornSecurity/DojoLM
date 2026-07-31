// SPDX-License-Identifier: Apache-2.0
/**
 * Per-surface cosign signer BACKEND selector + keyless config assembly.
 *
 * E1-PHASE-4-M2 slice 2 (MOAT-1 web wire). Each of the three dojolm-web
 * cosign signer selectors — eval-attest (`eval-run-attestor.ts`), onigaeshi
 * audit (`onigaeshi/worm-store.ts`), and bushido sign-off
 * (`bushido/signoff-signer.ts`) — chooses its Rekor backend
 * (`private-rekor` | `fulcio-keyless` | `in-memory-test`) from its OWN env.
 *
 * INDEPENDENCE (blueprint §4 S2 / handoff §5): this module is a PURE,
 * per-surface-PARAMETERISED parser — NOT a shared config. Each surface keeps
 * its own enable flag, its own Rekor URL var, and its own keyless var prefix;
 * it calls these helpers WITH its own names, so the three surfaces stay
 * independently deployable (flipping `DOJOLM_EVAL_ATTEST_BACKEND` never touches
 * audit/sign-off). The shared thing is the mechanism, exactly like the shared
 * `buildSigner` factory in `bu-tpi/onigaeshi` — never the configuration.
 *
 * CRIT-2 / R-T1 (the one thing that matters): the `fulcio-keyless` backend
 * does NOT make the DSSE payload safe — `operatorId` / `signerUsernames` are
 * clear in the payload regardless of backend; they are safe only behind an
 * authenticated-read Rekor. `buildKeylessConfigFromEnv` THREADS
 * `rekorReadAuthAttested` from the per-surface `*_REKOR_READ_AUTH_ATTESTED`
 * env (`=== 'true'`); it is NEVER hardcoded true. A deploy that has not
 * attested an authenticated-read Rekor therefore fails to build the keyless
 * signer (`buildSigner` → `validateSignerConfig` throws outside CI) — the
 * runtime gate the R-T1 hole exists to prevent.
 *
 * License: Apache-2.0.
 */

import type {
  CosignCliBuildConfig,
  OidcTokenField,
  OidcTokenSourceConfig,
} from 'bu-tpi/onigaeshi';

/** The per-surface backend selection (mirrors `RekorBackend` minus public). */
export type SignerBackendSelection =
  | 'private-rekor'
  | 'fulcio-keyless'
  | 'in-memory-test';

/** Type guard for the backend selection union (avoids a widening cast). */
function isSignerBackend(value: string): value is SignerBackendSelection {
  return (
    value === 'private-rekor' ||
    value === 'fulcio-keyless' ||
    value === 'in-memory-test'
  );
}

/**
 * Resolve a surface's backend selection from env, generalising the legacy
 * `*_DEV_BACKEND=in-memory-test` override.
 *
 *   - `${selectorPrefix}_BACKEND` (when set) is authoritative; it MUST be one
 *     of `private-rekor` | `fulcio-keyless` | `in-memory-test` (else throw).
 *   - When `*_BACKEND` is unset, the legacy `${selectorPrefix}_DEV_BACKEND ===
 *     'in-memory-test'` override still selects the in-memory signer (backward
 *     compat — pre-M-2 deploys + tests keep working unchanged).
 *   - Otherwise the default is `private-rekor` (static-key path) — unchanged.
 *
 * Both reads are `.trim()`'d so a stray newline/space from a ConfigMap or `.env`
 * line fails safe (whitespace-only → treated as unset) rather than bricking the
 * surface with an opaque "must be one of" error.
 *
 * `selectorPrefix` examples: `DOJOLM_EVAL_ATTEST`, `SIGSTORE_AUDIT`,
 * `SIGSTORE_SIGNOFF`.
 */
export function resolveSignerBackend(
  selectorPrefix: string,
): SignerBackendSelection {
  const explicit = process.env[`${selectorPrefix}_BACKEND`]?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    if (!isSignerBackend(explicit)) {
      throw new Error(
        `[cosign-signer-backend-env] ${selectorPrefix}_BACKEND must be one of ` +
          `private-rekor | fulcio-keyless | in-memory-test (got '${explicit}')`,
      );
    }
    return explicit;
  }
  // Legacy override (pre-M-2 contract): only the exact `in-memory-test` value
  // triggers it, matching the prior selector behaviour byte-for-byte.
  if (process.env[`${selectorPrefix}_DEV_BACKEND`]?.trim() === 'in-memory-test') {
    return 'in-memory-test';
  }
  return 'private-rekor';
}

/**
 * The per-surface inputs `buildKeylessConfigFromEnv` needs that DON'T follow
 * the keyless var prefix uniformly: the Rekor URL (its env var name differs
 * per surface — `DOJOLM_EVAL_REKOR_URL` vs the shared `SIGSTORE_REKOR_URL`)
 * and the shared cosign binary path. They are read by the caller (so the
 * per-surface contract stays visible at the call site) and passed in.
 */
export interface KeylessSurfaceEnv {
  /** The selector's `*_BACKEND` var name — used only in error messages. */
  readonly backendVar: string;
  /** Prefix for the keyless-specific vars (`<prefix>_FULCIO_URL`, …). */
  readonly keylessPrefix: string;
  /** The surface's resolved Rekor URL (read by the caller from its own var). */
  readonly rekorUrl: string | undefined;
  /** The surface's Rekor URL var name — used only in error messages. */
  readonly rekorUrlVar: string;
  /** The shared `COSIGN_BINARY_PATH` value (read by the caller). */
  readonly cosignBinaryPath: string | undefined;
}

/**
 * Assemble a `fulcio-keyless` {@link CosignCliBuildConfig} from a surface's
 * env. Reads (under `surface.keylessPrefix`):
 *
 *   - `<prefix>_FULCIO_URL`              → `fulcioUrl`
 *   - `<prefix>_OIDC_ISSUER`            → `oidcIssuer` (+ token-source issuer pin)
 *   - `<prefix>_OIDC_AUDIENCE`          → token-source expected audience
 *   - `<prefix>_CERT_IDENTITY`         → `certificateIdentity` (cert SAN @ verify)
 *   - `<prefix>_REKOR_READ_AUTH_ATTESTED` → `rekorReadAuthAttested` (=== 'true')
 *   - `<prefix>_OIDC_TOKEN_SOURCE` + variant vars → {@link OidcTokenSourceConfig}
 *
 * plus the caller-supplied Rekor URL + `COSIGN_BINARY_PATH`. Throws a single
 * clear error naming every missing required var. Does NOT set the static-key
 * fields (they are mutually exclusive with keyless — `validateSignerConfig`
 * enforces it). `rekorReadAuthAttested` is threaded from env, never hardcoded
 * (CRIT-2): a falsy/absent value yields `false`, so `buildSigner` refuses to
 * build outside CI.
 */
export function buildKeylessConfigFromEnv(
  surface: KeylessSurfaceEnv,
): CosignCliBuildConfig {
  const { backendVar, keylessPrefix, rekorUrl, rekorUrlVar, cosignBinaryPath } =
    surface;
  const fulcioUrl = process.env[`${keylessPrefix}_FULCIO_URL`];
  const oidcIssuer = process.env[`${keylessPrefix}_OIDC_ISSUER`];
  const oidcAudience = process.env[`${keylessPrefix}_OIDC_AUDIENCE`];
  const certificateIdentity = process.env[`${keylessPrefix}_CERT_IDENTITY`];

  const missing: string[] = [];
  if (!rekorUrl) missing.push(rekorUrlVar);
  if (!cosignBinaryPath) missing.push('COSIGN_BINARY_PATH');
  if (!fulcioUrl) missing.push(`${keylessPrefix}_FULCIO_URL`);
  if (!oidcIssuer) missing.push(`${keylessPrefix}_OIDC_ISSUER`);
  if (!oidcAudience) missing.push(`${keylessPrefix}_OIDC_AUDIENCE`);
  if (!certificateIdentity) missing.push(`${keylessPrefix}_CERT_IDENTITY`);
  if (missing.length > 0) {
    throw new Error(
      `[cosign-signer-backend-env] ${backendVar}=fulcio-keyless requires ` +
        `${missing.join(', ')} (+ a ${keylessPrefix}_OIDC_TOKEN_SOURCE and ` +
        `${keylessPrefix}_REKOR_READ_AUTH_ATTESTED=true)`,
    );
  }

  // Non-null after the guard above; narrow for the type-checker.
  const oidcTokenSource = buildTokenSourceConfig(
    keylessPrefix,
    oidcAudience as string,
    oidcIssuer as string,
  );

  return {
    backend: 'fulcio-keyless',
    rekorUrl: rekorUrl as string,
    cosignBinaryPath: cosignBinaryPath as string,
    fulcioUrl: fulcioUrl as string,
    oidcIssuer: oidcIssuer as string,
    certificateIdentity: certificateIdentity as string,
    oidcTokenSource,
    // CRIT-2: threaded from env, NEVER hardcoded true. Absent/falsy → false →
    // buildSigner refuses (outside CI). The operator attests an
    // authenticated-read Rekor by setting `<prefix>_REKOR_READ_AUTH_ATTESTED=true`.
    rekorReadAuthAttested:
      process.env[`${keylessPrefix}_REKOR_READ_AUTH_ATTESTED`] === 'true',
  };
}

/**
 * Build the {@link OidcTokenSourceConfig} for a surface from
 * `<prefix>_OIDC_TOKEN_SOURCE` ∈ `file` | `env` | `endpoint` and the
 * variant-specific vars. The expected `aud`/`iss` are pinned to the surface's
 * `<prefix>_OIDC_AUDIENCE` / `<prefix>_OIDC_ISSUER` (the token source itself
 * re-asserts them at acquisition — anti-pattern #15). Throws on a missing /
 * unknown kind or a missing variant var.
 */
function buildTokenSourceConfig(
  prefix: string,
  expectedAudience: string,
  expectedIssuer: string,
): OidcTokenSourceConfig {
  const kind = process.env[`${prefix}_OIDC_TOKEN_SOURCE`];
  switch (kind) {
    case 'file': {
      const path = process.env[`${prefix}_OIDC_TOKEN_FILE`];
      if (!path) {
        throw new Error(
          `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_SOURCE=file requires ${prefix}_OIDC_TOKEN_FILE`,
        );
      }
      return { kind: 'file', path, expectedAudience, expectedIssuer };
    }
    case 'env': {
      const variable = process.env[`${prefix}_OIDC_TOKEN_VAR`];
      if (!variable) {
        throw new Error(
          `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_SOURCE=env requires ${prefix}_OIDC_TOKEN_VAR`,
        );
      }
      return { kind: 'env', variable, expectedAudience, expectedIssuer };
    }
    case 'endpoint': {
      const url = process.env[`${prefix}_OIDC_TOKEN_URL`];
      if (!url) {
        throw new Error(
          `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_SOURCE=endpoint requires ${prefix}_OIDC_TOKEN_URL`,
        );
      }
      const tokenFieldRaw = process.env[`${prefix}_OIDC_TOKEN_FIELD`];
      const body = process.env[`${prefix}_OIDC_TOKEN_BODY`];
      const headers = parseHeaders(
        prefix,
        process.env[`${prefix}_OIDC_TOKEN_HEADERS`],
      );
      return {
        kind: 'endpoint',
        url,
        expectedAudience,
        expectedIssuer,
        ...(tokenFieldRaw
          ? { tokenField: asTokenField(prefix, tokenFieldRaw) }
          : {}),
        ...(body ? { body } : {}),
        ...(headers ? { headers } : {}),
      };
    }
    default:
      throw new Error(
        `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_SOURCE must be one of ` +
          `file | env | endpoint (got '${kind ?? '(unset)'}')`,
      );
  }
}

/** Narrow an operator-supplied token-field string to the closed union. */
function asTokenField(prefix: string, value: string): OidcTokenField {
  if (value === 'id_token' || value === 'access_token') return value;
  throw new Error(
    `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_FIELD must be id_token or access_token (got '${value}')`,
  );
}

/**
 * Parse the optional `<prefix>_OIDC_TOKEN_HEADERS` JSON object (e.g. a
 * `Content-Type` for a Dex token endpoint). Returns undefined when unset;
 * throws when the value is not a JSON object of string values.
 */
function parseHeaders(
  prefix: string,
  raw: string | undefined,
): Record<string, string> | undefined {
  if (raw === undefined || raw.length === 0) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_HEADERS is not valid JSON`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_HEADERS must be a JSON object of string values`,
    );
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      throw new Error(
        `[cosign-signer-backend-env] ${prefix}_OIDC_TOKEN_HEADERS['${key}'] must be a string`,
      );
    }
    out[key] = value;
  }
  return out;
}
