// SPDX-License-Identifier: Apache-2.0
/**
 * Pub/sub transport facade for kill-switch propagation.
 * Plan Section 0.2 + DEC-1 (2026-04-20).
 *
 * Default transport: Postgres LISTEN/NOTIFY.
 * Optional transport: Redis pub/sub (behind KILL_SWITCH_TRANSPORT=redis).
 * Test/solo transport: In-memory (synchronous, sub-millisecond).
 *
 * R-F2 SLA target: <5s propagation across all subscribers. The in-memory
 * transport is synchronous; Postgres NOTIFY and Redis pub/sub each typically
 * deliver in tens of milliseconds. A 30s safety-net poll runs in addition,
 * surfacing any missed signal as a fallback.
 *
 * Phase 0 ships:
 * - The transport interface + InMemoryKillSwitchTransport (used by every
 *   test and by single-process solo deployments).
 * - PostgresNotifyKillSwitchTransport scaffold — needs a `pg.Client`-shaped
 *   dependency at construction time; throws clearly if no client is wired.
 * - RedisKillSwitchTransport scaffold — same pattern with a redis pub/sub
 *   pair.
 * Concrete client wiring lives in dojolm-web / deployment glue, not here.
 */

import type { KillEvent, KillSignal } from './kill-switch.js';

export interface KillSwitchTransport {
  readonly id: string;
  publish(event: KillEvent): Promise<void>;
  subscribe(handler: (event: KillEvent) => void | Promise<void>): () => void;
  close(): Promise<void>;
}

export class InMemoryKillSwitchTransport implements KillSwitchTransport {
  readonly id = 'memory' as const;
  private readonly handlers = new Set<
    (event: KillEvent) => void | Promise<void>
  >();

  async publish(event: KillEvent): Promise<void> {
    await Promise.all(
      Array.from(this.handlers).map(async (handler) => {
        try {
          await handler(event);
        } catch {
          // Transport-level swallow; per-handler error policy lives upstream.
        }
      }),
    );
  }

  subscribe(handler: (event: KillEvent) => void | Promise<void>): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}

/**
 * Minimal Postgres LISTEN/NOTIFY client shape — kept structural so the
 * scaffold doesn't pull `pg` as a hard dep.
 */
export interface PostgresNotifyClient {
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  on(event: 'notification', listener: (msg: { channel: string; payload?: string }) => void): void;
  off(event: 'notification', listener: (msg: { channel: string; payload?: string }) => void): void;
}

export class PostgresNotifyKillSwitchTransport implements KillSwitchTransport {
  readonly id = 'postgres' as const;

  constructor(
    private readonly client: PostgresNotifyClient,
    private readonly channel: string = 'dojo_kill_switch',
  ) {}

  async publish(event: KillEvent): Promise<void> {
    const payload = JSON.stringify({
      ...event,
      firedAt: event.firedAt.toISOString(),
    });
    // pg_notify is parameterized to avoid quoting issues with payload contents.
    await this.client.query('SELECT pg_notify($1, $2)', [
      this.channel,
      payload,
    ]);
  }

  subscribe(handler: (event: KillEvent) => void | Promise<void>): () => void {
    const listener = async (msg: { channel: string; payload?: string }) => {
      if (msg.channel !== this.channel || !msg.payload) return;
      try {
        const parsed = JSON.parse(msg.payload) as KillEvent & { firedAt: string };
        await handler({ ...parsed, firedAt: new Date(parsed.firedAt) });
      } catch {
        // Drop malformed payloads silently; observability lives in telemetry.
      }
    };
    this.client.on('notification', listener);
    void this.client.query(`LISTEN ${quoteIdent(this.channel)}`);
    return () => this.client.off('notification', listener);
  }

  async close(): Promise<void> {
    await this.client.query(`UNLISTEN ${quoteIdent(this.channel)}`);
  }
}

/**
 * Minimal Redis pub/sub shape.
 */
export interface RedisPublisher {
  publish(channel: string, message: string): Promise<unknown>;
  quit(): Promise<unknown>;
}

export interface RedisSubscriber {
  subscribe(channel: string, handler: (message: string) => void): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  quit(): Promise<unknown>;
}

export class RedisKillSwitchTransport implements KillSwitchTransport {
  readonly id = 'redis' as const;
  private listeners = new Set<(event: KillEvent) => void | Promise<void>>();
  private subscribed = false;

  constructor(
    private readonly publisher: RedisPublisher,
    private readonly subscriber: RedisSubscriber,
    private readonly channel: string = 'dojo:kill_switch',
  ) {}

  async publish(event: KillEvent): Promise<void> {
    const payload = JSON.stringify({
      ...event,
      firedAt: event.firedAt.toISOString(),
    });
    await this.publisher.publish(this.channel, payload);
  }

  subscribe(handler: (event: KillEvent) => void | Promise<void>): () => void {
    this.listeners.add(handler);
    if (!this.subscribed) {
      this.subscribed = true;
      void this.subscriber.subscribe(this.channel, async (message) => {
        try {
          const parsed = JSON.parse(message) as KillEvent & { firedAt: string };
          const event: KillEvent = { ...parsed, firedAt: new Date(parsed.firedAt) };
          for (const listener of this.listeners) {
            await listener(event);
          }
        } catch {
          // Same drop-on-malformed policy as Postgres transport.
        }
      });
    }
    return () => this.listeners.delete(handler);
  }

  async close(): Promise<void> {
    if (this.subscribed) {
      await this.subscriber.unsubscribe(this.channel);
      this.subscribed = false;
    }
    this.listeners.clear();
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }
}

export type KillSwitchTransportKind = 'memory' | 'postgres' | 'redis';

export function readTransportKind(
  env: NodeJS.ProcessEnv = process.env,
): KillSwitchTransportKind {
  const raw = env.KILL_SWITCH_TRANSPORT?.toLowerCase();
  if (raw === 'redis') return 'redis';
  if (raw === 'memory') return 'memory';
  // Default per DEC-1.
  return 'postgres';
}

export interface TransportFactories {
  memory?: () => InMemoryKillSwitchTransport;
  postgres?: () => PostgresNotifyKillSwitchTransport;
  redis?: () => RedisKillSwitchTransport;
}

export class TransportNotConfiguredError extends Error {
  readonly code = 'KILL_SWITCH.TRANSPORT.MISSING' as const;
  constructor(kind: KillSwitchTransportKind) {
    super(
      `KILL_SWITCH_TRANSPORT="${kind}" but no factory was supplied. ` +
        'Wire a transport in your deployment bootstrap (see the deployment guide).',
    );
    this.name = 'TransportNotConfiguredError';
  }
}

export function buildKillSwitchTransport(
  factories: TransportFactories,
  env: NodeJS.ProcessEnv = process.env,
): KillSwitchTransport {
  const kind = readTransportKind(env);
  const factory = factories[kind];
  if (!factory) {
    if (kind === 'memory' && !factories.memory) {
      return new InMemoryKillSwitchTransport();
    }
    throw new TransportNotConfiguredError(kind);
  }
  return factory();
}

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe Postgres identifier: ${name}`);
  }
  return `"${name}"`;
}
