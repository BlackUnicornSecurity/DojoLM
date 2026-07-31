// SPDX-License-Identifier: Apache-2.0
/**
 * Postgres LISTEN/NOTIFY client adapter for bu-tpi's kill-switch pub/sub.
 *
 * bu-tpi ships `PostgresNotifyKillSwitchTransport` but keeps its
 * `PostgresNotifyClient` contract structural so the core package
 * stays driver-free. This module supplies a concrete implementation
 * over node-postgres `Client` — distinct from `Pool` because LISTEN
 * requires a single persistent connection.
 *
 * Lifecycle: call `connect()` once at bootstrap, `end()` on shutdown.
 * The adapter keeps a single lazily-connected client and forwards
 * `on/off` subscriptions to the underlying driver.
 */

import type { PostgresNotifyClient } from 'bu-tpi/flags';

export interface PgNotifyDriverClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  on(
    event: 'notification',
    listener: (msg: { channel: string; payload?: string }) => void,
  ): this;
  off(
    event: 'notification',
    listener: (msg: { channel: string; payload?: string }) => void,
  ): this;
}

export interface PgNotifyClientOptions {
  /**
   * Driver factory — typically `() => new Client({ connectionString })`.
   * Kept structural so tests can inject a fake without loading `pg`.
   */
  readonly createClient: () => PgNotifyDriverClient;
}

/**
 * Wraps a node-postgres `Client` so it matches bu-tpi's
 * `PostgresNotifyClient` contract. Lazy-connects on first use.
 */
export class PgNotifyClient implements PostgresNotifyClient {
  private client: PgNotifyDriverClient | undefined;
  private ready: Promise<void> | undefined;

  constructor(private readonly opts: PgNotifyClientOptions) {}

  /**
   * Connect the underlying client. Idempotent — safe to call at
   * bootstrap or on first query.
   */
  async connect(): Promise<void> {
    if (this.ready) return this.ready;
    this.client = this.opts.createClient();
    this.ready = this.client.connect();
    return this.ready;
  }

  async end(): Promise<void> {
    const c = this.client;
    this.client = undefined;
    this.ready = undefined;
    if (c) await c.end();
  }

  async query(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: unknown[] }> {
    await this.ensureReady();
    return this.client!.query(sql, params);
  }

  on(
    event: 'notification',
    listener: (msg: { channel: string; payload?: string }) => void,
  ): void {
    // If already connected, register synchronously so callers can
    // assert registration immediately after a prior `await connect()`.
    // Otherwise defer — bu-tpi's transport always calls `connect()`
    // (via query) before subscribing, so this fallback only runs in
    // exotic bootstrap orderings.
    if (this.client) {
      this.client.on(event, listener);
      return;
    }
    void this.ensureReady().then(() => {
      this.client!.on(event, listener);
    });
  }

  off(
    event: 'notification',
    listener: (msg: { channel: string; payload?: string }) => void,
  ): void {
    if (!this.client) return;
    this.client.off(event, listener);
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) await this.connect();
    else await this.ready;
  }
}
