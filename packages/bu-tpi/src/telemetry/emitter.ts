// SPDX-License-Identifier: Apache-2.0
/**
 * TelemetryEmitter — async buffered emitter with pluggable sinks (Gap 8).
 *
 * Flow: emit(event) → Zod validate → rejectIfRaw gate (R-T1)
 *       → fan-out to all registered sinks (best-effort; sink errors logged,
 *         not thrown) → buffer drain on flush().
 *
 * Sinks are write-only from app code; querying is gated via separate
 * RBAC-protected endpoints (R-T2 mitigation).
 */

import { randomUUID } from 'node:crypto';
import { dojoEventSchema, type DojoEvent } from './events.js';
import { rejectIfRaw, TelemetryRedactionError } from './redaction.js';
import type { BaseEvent, EventFilter, TelemetrySink } from './types.js';

export class TelemetryValidationError extends Error {
  readonly code = 'TELEMETRY.VALIDATION_ERROR' as const;
  constructor(message: string) {
    super(`Telemetry event failed validation: ${message}`);
    this.name = 'TelemetryValidationError';
  }
}

export class TelemetryEmitter {
  private readonly sinks = new Map<string, TelemetrySink>();
  private readonly buffer: BaseEvent[] = [];
  private emitErrors = 0;

  /** Register a sink to receive events. Overwrites if id already exists. */
  addSink(sink: TelemetrySink): void {
    this.sinks.set(sink.id, sink);
  }

  removeSink(id: string): void {
    this.sinks.delete(id);
  }

  /** Synchronous entry-point: validate, gate, then fan-out asynchronously. */
  emit(raw: DojoEvent): void {
    // 1. Zod schema validation
    const parsed = dojoEventSchema.safeParse(raw);
    if (!parsed.success) {
      throw new TelemetryValidationError(parsed.error.message);
    }

    // 2. R-T1 raw-string gate
    rejectIfRaw(raw as unknown as Record<string, unknown>);

    const event = parsed.data as BaseEvent;

    // 3. Stamp id + ts if not already set (callers may pre-set them)
    const stamped: BaseEvent = {
      ...event,
      id: event.id || randomUUID(),
      ts: event.ts || new Date().toISOString(),
    };

    // 4. Buffer + async fan-out (errors logged but not thrown)
    this.buffer.push(stamped);
    void this.fanOut(stamped);
  }

  private async fanOut(event: BaseEvent): Promise<void> {
    const writes = Array.from(this.sinks.values()).map((sink) =>
      sink.write(event).catch((err: unknown) => {
        this.emitErrors++;
        // eslint-disable-next-line no-console
        console.error(
          `[telemetry] sink "${sink.id}" write error:`,
          err instanceof Error ? err.message : err,
        );
      }),
    );
    await Promise.allSettled(writes);
  }

  /**
   * Drain pending sink writes.  Call on process shutdown to prevent
   * event loss (batch-flush-on-shutdown requirement).
   */
  async flush(): Promise<void> {
    const flushes = Array.from(this.sinks.values())
      .filter((s) => typeof s.flush === 'function')
      .map((s) => s.flush!().catch(() => undefined));
    await Promise.allSettled(flushes);
  }

  /** Number of sink write errors since construction (diagnostic). */
  get sinkErrorCount(): number {
    return this.emitErrors;
  }

  /** Snapshot of buffered events (in-memory only; does not query sinks). */
  buffered(): readonly BaseEvent[] {
    return [...this.buffer];
  }

  /**
   * Query a named sink (if it supports querying).
   * Returns an empty async iterable if the sink is not found or has no query.
   */
  async *query(
    sinkId: string,
    filter: EventFilter = {},
  ): AsyncIterable<BaseEvent> {
    const sink = this.sinks.get(sinkId);
    if (!sink?.query) return;
    yield* sink.query(filter);
  }
}

/** Global default emitter — inject a real emitter in tests. */
export const defaultEmitter = new TelemetryEmitter();
