// SPDX-License-Identifier: Apache-2.0
/**
 * DojoEvent telemetry emitter for dojolm-web.
 *
 * Wraps bu-tpi's `TelemetryEmitter` with an env-driven sink selection
 * + process singleton so API routes can emit Sensei/Hydra/Kumite events
 * without each route re-instantiating the pipeline.
 *
 * Sink selection:
 *   DOJO_TELEMETRY_SINK=console → ConsoleSink (dev default)
 *   DOJO_TELEMETRY_SINK=noop    → NoopSink
 *   DOJO_TELEMETRY_SINK unset   → ConsoleSink in dev, NoopSink in prod
 *
 * When Track E picks a real sink (OTLP / ClickHouse / HTTP gateway),
 * swap it in here — call sites stay unchanged.
 */

import {
  ConsoleSink,
  NoopSink,
  TelemetryEmitter,
  type TelemetrySink,
} from 'bu-tpi/telemetry';
import { JsonlFileSink } from './jsonl-file-sink.js';

export type DojoSinkKind = 'console' | 'noop' | 'jsonl';

export interface CreateDojoEmitterOptions {
  readonly env?: NodeJS.ProcessEnv;
  /** Explicit sink override — wins over env. */
  readonly sink?: TelemetrySink;
}

function resolveSinkKind(env: NodeJS.ProcessEnv): DojoSinkKind {
  const raw = env.DOJO_TELEMETRY_SINK?.toLowerCase();
  if (raw === 'console' || raw === 'noop' || raw === 'jsonl') return raw;
  return env.NODE_ENV === 'production' ? 'noop' : 'console';
}

function buildDefaultSink(kind: DojoSinkKind, env: NodeJS.ProcessEnv): TelemetrySink {
  if (kind === 'console') return new ConsoleSink();
  if (kind === 'jsonl') {
    const path = env.DOJO_TELEMETRY_JSONL_PATH ?? './telemetry-events.jsonl';
    return new JsonlFileSink({ path });
  }
  return new NoopSink();
}

/** Build a fresh emitter with its sink resolved from env (tests). */
export function createDojoEmitter(
  opts: CreateDojoEmitterOptions = {},
): TelemetryEmitter {
  const env = opts.env ?? process.env;
  const emitter = new TelemetryEmitter();
  const sink = opts.sink ?? buildDefaultSink(resolveSinkKind(env), env);
  emitter.addSink(sink);
  return emitter;
}

// ---------------------------------------------------------------------------
// Process-singleton accessor
// ---------------------------------------------------------------------------

let singleton: TelemetryEmitter | undefined;

/**
 * Return the process-scoped emitter, lazily constructed on first use.
 * Idempotent — subsequent calls return the same instance.
 */
export function getDojoEmitter(): TelemetryEmitter {
  if (!singleton) {
    singleton = createDojoEmitter();
  }
  return singleton;
}

/** Reset the singleton. Test-only. */
export function resetDojoEmitter(): void {
  singleton = undefined;
}
