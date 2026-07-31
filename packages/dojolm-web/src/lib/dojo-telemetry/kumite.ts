// SPDX-License-Identifier: Apache-2.0
/**
 * Adapter: bu-tpi `LongMatchEmitter` → dojolm-web DojoEvent sink.
 *
 * `runLongMatch` already constructs and redacts `KumiteMatchTurnEvent`
 * shapes; this adapter just validates + fans them out through the
 * DojoEvent emitter. The adapter intentionally swallows errors — a
 * telemetry failure must never break the match loop.
 */

import type {
  KumiteMatchTurnEvent,
  TelemetryEmitter,
} from 'bu-tpi/telemetry';
import type {
  LongMatchEmitter,
  LongMatchTelemetryEnvelope,
} from 'bu-tpi/long-match';
import { getDojoEmitter } from './emitter.js';
import { loadEnvelopeFromEnv, type DojoTelemetryEnvelope } from './envelope.js';
import { makeSafeEmit } from './safe-emit.js';

export interface KumiteTelemetryBundle {
  readonly emitter: LongMatchEmitter;
  readonly envelope: LongMatchTelemetryEnvelope;
}

/**
 * Build a `LongMatchEmitter` bound to the DojoEvent sink singleton.
 * Returns the envelope alongside so the caller can pass both to
 * `runLongMatch` as `deps.telemetryEmitter` + `deps.telemetryEnvelope`.
 */
export function buildKumiteTelemetry(
  dojoEmitter: TelemetryEmitter = getDojoEmitter(),
  envelope: DojoTelemetryEnvelope = loadEnvelopeFromEnv(),
): KumiteTelemetryBundle {
  const safeEmit = makeSafeEmit(dojoEmitter);
  const longMatchEmitter: LongMatchEmitter = {
    emitTurn(event: KumiteMatchTurnEvent): void {
      safeEmit(event);
    },
  };

  return {
    emitter: longMatchEmitter,
    envelope: {
      installId: envelope.installId,
      installToken: envelope.installToken,
      buildChannel: envelope.buildChannel,
      sdkVersion: envelope.sdkVersion,
      tenantId: envelope.tenantId,
    },
  };
}
