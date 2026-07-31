// SPDX-License-Identifier: Apache-2.0
/**
 * DojoEvent telemetry bridge for dojolm-web.
 *
 * Accepts bu-tpi DojoEvent shapes (Sensei / Hydra / Kumite / etc.) via
 * a thin wrapper around `bu-tpi/telemetry`'s `TelemetryEmitter` +
 * configurable sink. Feature-level events (`feature_used`, etc.) remain
 * in `lib/telemetry/` — the two schemas coexist until Track E picks a
 * real sink and we consolidate.
 */

export {
  DojoTelemetryEnvelopeError,
  loadEnvelopeFromEnv,
  type DojoBuildChannel,
  type DojoTelemetryEnvelope,
  type LoadEnvelopeOptions,
} from './envelope.js';

export {
  createDojoEmitter,
  getDojoEmitter,
  resetDojoEmitter,
  type CreateDojoEmitterOptions,
  type DojoSinkKind,
} from './emitter.js';

export {
  buildKumiteTelemetry,
  type KumiteTelemetryBundle,
} from './kumite.js';

export {
  buildHydraTelemetry,
  type HydraTelemetryBundle,
} from './hydra.js';

export {
  JsonlFileSink,
  type JsonlFileSinkOptions,
} from './jsonl-file-sink.js';
