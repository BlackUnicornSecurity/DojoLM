// SPDX-License-Identifier: Apache-2.0
/**
 * No-op telemetry sink — discards all events silently.
 * Use in tests or when a real sink is not configured.
 */

import type { BaseEvent, EventFilter, TelemetrySink } from '../types.js';

export class NoopSink implements TelemetrySink {
  readonly id: string;
  private readonly received: BaseEvent[] = [];

  constructor(id = 'noop') {
    this.id = id;
  }

  async write(event: BaseEvent): Promise<void> {
    this.received.push(event);
  }

  async *query(filter: EventFilter = {}): AsyncIterable<BaseEvent> {
    let events = this.received.slice();
    if (filter.type) events = events.filter((e) => e.type === filter.type);
    if (filter.source) events = events.filter((e) => e.source === filter.source);
    if (filter.limit) events = events.slice(0, filter.limit);
    for (const e of events) yield e;
  }

  async flush(): Promise<void> {}

  /** Test helper: all events written to this sink. */
  snapshot(): readonly BaseEvent[] {
    return [...this.received];
  }

  clear(): void {
    this.received.length = 0;
  }
}
