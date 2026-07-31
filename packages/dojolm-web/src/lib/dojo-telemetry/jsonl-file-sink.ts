// SPDX-License-Identifier: Apache-2.0
/**
 * JsonlFileSink — append-only JSON-Lines telemetry sink.
 *
 * Writes each DojoEvent as one JSON object per line to a local file.
 * Serialises concurrent writes through an internal promise chain so
 * events land in the order they were emitted, even under fan-out.
 *
 * Dev-friendly replacement for ConsoleSink when the caller wants
 * durable, replayable output — `tail -f <path>` during a run, or
 * replay later via `query()`. The format approximates Phase E's
 * target WORM S3 sink at lower fidelity (no object-lock, no signed
 * Merkle chain) so call sites + schema stay stable when the real
 * sink lands.
 *
 * Rotation is intentionally minimal: when the file exceeds `maxBytes`,
 * the current file is renamed with a timestamp suffix and a fresh file
 * is started. Rotated files are left on disk — a separate reaper owns
 * retention per plan §0.3.
 */

import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  BaseEvent,
  EventFilter,
  TelemetrySink,
} from 'bu-tpi/telemetry';

export interface JsonlFileSinkOptions {
  readonly path: string;
  readonly id?: string;
  /** Rotate when file size exceeds this many bytes. Default: 64 MiB. */
  readonly maxBytes?: number;
  /** Clock override for tests. */
  readonly now?: () => Date;
}

const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

export class JsonlFileSink implements TelemetrySink {
  readonly id: string;
  private readonly path: string;
  private readonly maxBytes: number;
  private readonly now: () => Date;
  private chain: Promise<void> = Promise.resolve();
  private ensured = false;

  constructor(opts: JsonlFileSinkOptions) {
    this.id = opts.id ?? 'jsonl-file';
    this.path = opts.path;
    this.maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    this.now = opts.now ?? (() => new Date());
  }

  async write(event: BaseEvent): Promise<void> {
    // Serialise: every write waits for the previous one to resolve.
    const prev = this.chain;
    this.chain = prev
      .then(() => this.doWrite(event))
      .catch(() => {
        // Swallow so a single failure does not poison the chain; the
        // emitter logs its own error already.
      });
    return this.chain;
  }

  async flush(): Promise<void> {
    await this.chain;
  }

  async *query(filter: EventFilter = {}): AsyncIterable<BaseEvent> {
    // Dev-friendly read-back for local replay. Intentionally simple —
    // no chunking, no streaming — production WORM sink will replace this.
    const { readFile } = await import('node:fs/promises');
    let text: string;
    try {
      text = await readFile(this.path, 'utf8');
    } catch {
      return;
    }
    const lines = text.split('\n').filter(Boolean);
    let yielded = 0;
    for (const line of lines) {
      let parsed: BaseEvent;
      try {
        parsed = JSON.parse(line) as BaseEvent;
      } catch {
        continue;
      }
      if (filter.type && parsed.type !== filter.type) continue;
      if (filter.source && parsed.source !== filter.source) continue;
      if (filter.since && parsed.ts < filter.since) continue;
      if (filter.until && parsed.ts > filter.until) continue;
      yield parsed;
      yielded += 1;
      if (filter.limit && yielded >= filter.limit) return;
    }
  }

  private async doWrite(event: BaseEvent): Promise<void> {
    await this.ensureDir();
    await this.rotateIfTooLarge();
    const line = `${JSON.stringify(event)}\n`;
    await appendFile(this.path, line, 'utf8');
  }

  private async ensureDir(): Promise<void> {
    if (this.ensured) return;
    await mkdir(dirname(this.path), { recursive: true });
    this.ensured = true;
  }

  private async rotateIfTooLarge(): Promise<void> {
    try {
      const s = await stat(this.path);
      if (s.size < this.maxBytes) return;
    } catch {
      return; // file does not exist yet — nothing to rotate
    }
    const suffix = this.now().toISOString().replace(/[:.]/g, '-');
    const target = `${this.path}.${suffix}`;
    try {
      await rename(this.path, target);
    } catch {
      // If rename fails (concurrent rotator, race) we simply keep writing
      // to the same file; the next write will hit the size check again.
    }
  }
}
