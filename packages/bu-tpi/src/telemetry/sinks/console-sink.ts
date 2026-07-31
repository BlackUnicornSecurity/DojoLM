// SPDX-License-Identifier: Apache-2.0
/**
 * Console telemetry sink — pretty-prints events to stdout.
 * For development and debugging only; disable in production via
 * the sink registry configuration.
 */

import type { BaseEvent, TelemetrySink } from '../types.js';

export interface ConsoleSinkOptions {
  /** Set to false to suppress output (useful in CI). Default: true. */
  readonly enabled?: boolean;
  /** Custom print function — defaults to console.log. */
  readonly print?: (line: string) => void;
}

export class ConsoleSink implements TelemetrySink {
  readonly id = 'console';
  private readonly enabled: boolean;
  private readonly print: (line: string) => void;

  constructor(opts: ConsoleSinkOptions = {}) {
    this.enabled = opts.enabled ?? true;
    // eslint-disable-next-line no-console
    this.print = opts.print ?? ((l) => console.log(l));
  }

  async write(event: BaseEvent): Promise<void> {
    if (!this.enabled) return;
    const line = `[telemetry] ${event.ts} ${event.source}/${event.type} id=${event.id}`;
    this.print(line);
  }

  async flush(): Promise<void> {}
}
