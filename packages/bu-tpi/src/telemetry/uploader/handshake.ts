// SPDX-License-Identifier: Apache-2.0
/**
 * install_token handshake — client stub (W1 scope: types + signatures only).
 *
 * W4 implements the transport, persistence, and retry logic per the internal
 * install-token handshake spec (the full endpoint spec, request/response shapes,
 * token lifecycle, and client-side storage rules).
 *
 * Parent: Gap 8+ Amendment §3.1 (HIGH-1 spoof mitigation), §4.6 (DDoS posture).
 *
 * @monetizes none — infrastructure primitive; enables all downstream products.
 */

import type { BuildChannel } from '../types.js';

/**
 * Handshake request payload.
 *
 * @see the internal install-token handshake spec.
 */
export interface HandshakeRequest {
  /** SHA256(random-per-install-salt || installed-at); stored in ~/.dojolm/install-id. */
  readonly installId: string;
  /** Current build channel — dictates whether handshake runs at all. */
  readonly buildChannel: BuildChannel;
  /** Current SDK version string, e.g. `bu-tpi@0.2.0`. */
  readonly sdkVersion: string;
}

/**
 * Handshake response payload.
 *
 * @see the internal install-token handshake spec.
 */
export interface HandshakeResponse {
  /** Opaque token; format `tok_v1_<payload>.<signature>`. */
  readonly installToken: string;
  /** Server-issued timestamp; enables client clock-skew detection. */
  readonly serverTs: string;
  /** ISO-8601; token TTL 365 days. Client re-handshakes 30 days prior. */
  readonly expiresAt: string;
  /** Signing-key ID from hierarchical chain (§5.7); opaque to client. */
  readonly keyId: string;
}

/** Well-typed error codes for handshake failures (maps to spec §2.4). */
export type HandshakeErrorCode =
  | 'malformed_handshake'
  | 'install_banned'
  | 'token_already_issued'
  | 'rate_limited'
  | 'ingest_unavailable'
  | 'network_failure'
  | 'invalid_response';

/**
 * Perform the install_token handshake against `ingest.dojolm.com/v1/handshake`.
 *
 * W1 scope: signature only. Throws `HandshakeNotImplementedError` if invoked.
 * W4 implements: POST → TLS 1.3 → parse → validate → return.
 *
 * Client-side flow (per spec §5):
 *   1. On first run, if `~/.dojolm/install-token` missing → call this.
 *   2. On ingest 401/403 → purge token file, call this, retry batch.
 *   3. 30 days before `expiresAt` → proactively call this to renew.
 *
 * Must be idempotent within a 60s window per installId (spec §2.4 `409`).
 *
 * @param req - request payload (installId, buildChannel, sdkVersion)
 * @returns the server-issued token + metadata
 * @throws on network failure, 4xx, 5xx, malformed response
 */
export async function handshake(
  _req: HandshakeRequest,
): Promise<HandshakeResponse> {
  throw new HandshakeNotImplementedError();
}

/** Marker error thrown by the stub — replaced in W4. */
export class HandshakeNotImplementedError extends Error {
  readonly code = 'TELEMETRY.HANDSHAKE.NOT_IMPLEMENTED' as const;
  constructor() {
    super(
      'handshake() is a W1 stub. Implementation lands in Phase 0.5 W4. ' +
        'See the install-token handshake spec.',
    );
    this.name = 'HandshakeNotImplementedError';
  }
}
