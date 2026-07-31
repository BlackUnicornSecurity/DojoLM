// SPDX-License-Identifier: Apache-2.0
/**
 * Envelope loader for bu-tpi DojoEvent emissions.
 *
 * Every DojoEvent carries an install-scoped envelope (installId,
 * installToken, buildChannel, sdkVersion, optional tenantId). This
 * module resolves the envelope from environment variables so the
 * telemetry emitter singleton can be constructed at process boot
 * without each call site repeating the lookup.
 *
 * Env contract:
 *   DOJO_TELEMETRY_INSTALL_ID        — required in prod
 *   DOJO_TELEMETRY_INSTALL_TOKEN     — required in prod
 *   DOJO_TELEMETRY_BUILD_CHANNEL     — community | team | enterprise | sovereign
 *   DOJO_TELEMETRY_SDK_VERSION       — defaults to "dojolm-web@dev"
 *   DOJO_TELEMETRY_TENANT_ID         — optional
 *
 * Dev default: synthesises a per-process installId / token so local
 * runs do not require env wiring. Production callers MUST supply both.
 */

import { randomUUID } from 'node:crypto';

export type DojoBuildChannel = 'community' | 'team' | 'enterprise' | 'sovereign';

export interface DojoTelemetryEnvelope {
  readonly installId: string;
  readonly installToken: string;
  readonly buildChannel: DojoBuildChannel;
  readonly sdkVersion: string;
  readonly tenantId?: string;
}

export class DojoTelemetryEnvelopeError extends Error {
  readonly code = 'DOJO_TELEMETRY.ENVELOPE_INVALID' as const;
  constructor(message: string) {
    super(message);
    this.name = 'DojoTelemetryEnvelopeError';
  }
}

const VALID_CHANNELS: readonly DojoBuildChannel[] = [
  'community',
  'team',
  'enterprise',
  'sovereign',
];

function parseChannel(raw: string | undefined): DojoBuildChannel {
  if (!raw) return 'community';
  if (VALID_CHANNELS.includes(raw as DojoBuildChannel)) {
    return raw as DojoBuildChannel;
  }
  throw new DojoTelemetryEnvelopeError(
    `DOJO_TELEMETRY_BUILD_CHANNEL="${raw}" is not a valid channel. ` +
      `Expected one of: ${VALID_CHANNELS.join(', ')}.`,
  );
}

export interface LoadEnvelopeOptions {
  readonly env?: NodeJS.ProcessEnv;
  /** If true (dev mode), synthesise missing installId/installToken. */
  readonly allowDevDefaults?: boolean;
}

/**
 * Load a DojoTelemetryEnvelope from environment variables.
 *
 * Throws `DojoTelemetryEnvelopeError` when required fields are missing
 * and `allowDevDefaults` is false.
 */
export function loadEnvelopeFromEnv(
  opts: LoadEnvelopeOptions = {},
): DojoTelemetryEnvelope {
  const env = opts.env ?? process.env;
  const devDefaults =
    opts.allowDevDefaults ?? env.NODE_ENV !== 'production';

  const installId = env.DOJO_TELEMETRY_INSTALL_ID
    ?? (devDefaults ? `dev-install-${randomUUID()}` : '');
  const installToken = env.DOJO_TELEMETRY_INSTALL_TOKEN
    ?? (devDefaults ? `dev-token-${randomUUID()}` : '');

  if (!installId) {
    throw new DojoTelemetryEnvelopeError(
      'DOJO_TELEMETRY_INSTALL_ID is required in production.',
    );
  }
  if (!installToken) {
    throw new DojoTelemetryEnvelopeError(
      'DOJO_TELEMETRY_INSTALL_TOKEN is required in production.',
    );
  }

  return {
    installId,
    installToken,
    buildChannel: parseChannel(env.DOJO_TELEMETRY_BUILD_CHANNEL),
    sdkVersion: env.DOJO_TELEMETRY_SDK_VERSION ?? 'dojolm-web@dev',
    tenantId: env.DOJO_TELEMETRY_TENANT_ID,
  };
}
