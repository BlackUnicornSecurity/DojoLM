// SPDX-License-Identifier: Apache-2.0
/**
 * Kill-switch subscriber + cancellation-token registry per plan Section 0.2
 * and audit finding R-F2 (<5s propagation, no polling).
 *
 * The model:
 * - Each harm-path module subscribes to one or more `KillSignal`s with a
 *   handler that aborts in-flight work. Subscribers are notified via a
 *   pub/sub transport (see kill-switch-pubsub.ts) so propagation is bounded
 *   by transport latency, not by polling.
 * - In-flight requests register a `CancellationToken`; firing the matching
 *   signal cancels every active token before invoking explicit handlers.
 *
 * The registry exposed by this module is the in-process facade. The
 * cross-process broadcast is handled by `KillSwitchTransport`.
 */

export const KILL_SIGNALS = [
  'KILL_ATEMI',
  'KILL_AMATERASU',
  'KILL_ONIGAESHI',
  'KILL_BUSHIDO',
  'KILL_KOKUGIKAN',
  'KILL_PLINY_INGEST',
  // Gap 13.2 KUMITE parallel race kill-switch. Fires:
  // - BEFORE fan-out (ledger reservation path aborts clean)
  // - Between rounds (mutator/rewriter loops honor cancellation)
  // - Per-card (in-flight adapter call is cancelled via token)
  // Propagation bound <5s (R-F2) via KillSwitchTransport.
  'KILL_KUMITE_RACE',
] as const;

export type KillSignal = (typeof KILL_SIGNALS)[number];

export type KillReason =
  | 'manual-admin'
  | 'two-person-approval-revoke'
  | 'auto-anomaly'
  | 'drill';

export interface KillEvent {
  readonly signal: KillSignal;
  readonly reason: KillReason;
  readonly firedAt: Date;
  readonly firedBy: string;
}

export type KillHandler = (event: KillEvent) => void | Promise<void>;

export class CancellationToken {
  private readonly listeners = new Set<() => void>();
  #cancelled = false;
  #cancelEvent: KillEvent | null = null;

  get cancelled(): boolean {
    return this.#cancelled;
  }

  get cancelEvent(): KillEvent | null {
    return this.#cancelEvent;
  }

  onCancel(listener: () => void): () => void {
    if (this.#cancelled) {
      listener();
      return () => undefined;
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Fires every registered listener exactly once. */
  cancel(event: KillEvent): void {
    if (this.#cancelled) return;
    this.#cancelled = true;
    this.#cancelEvent = event;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Cancellation listeners must not throw upstream.
      }
    }
    this.listeners.clear();
  }

  throwIfCancelled(): void {
    if (this.#cancelled) {
      throw new KillSwitchAbort(this.#cancelEvent!);
    }
  }
}

export class KillSwitchAbort extends Error {
  readonly code = 'SYS.KILLSWITCH.ABORTED' as const;
  constructor(public readonly event: KillEvent) {
    super(
      `Operation aborted by kill-switch ${event.signal} (${event.reason})`,
    );
    this.name = 'KillSwitchAbort';
  }
}

export class KillSwitchRegistry {
  private readonly handlers = new Map<KillSignal, Set<KillHandler>>();
  private readonly tokensBySignal = new Map<KillSignal, Set<CancellationToken>>();
  private readonly active = new Map<KillSignal, KillEvent>();

  subscribe(signal: KillSignal, handler: KillHandler): () => void {
    let set = this.handlers.get(signal);
    if (!set) {
      set = new Set();
      this.handlers.set(signal, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  registerToken(signal: KillSignal, token: CancellationToken): () => void {
    let set = this.tokensBySignal.get(signal);
    if (!set) {
      set = new Set();
      this.tokensBySignal.set(signal, set);
    }
    set.add(token);
    if (this.active.has(signal)) {
      token.cancel(this.active.get(signal)!);
      set.delete(token);
    }
    return () => set!.delete(token);
  }

  isActive(signal: KillSignal): boolean {
    return this.active.has(signal);
  }

  activeEvent(signal: KillSignal): KillEvent | null {
    return this.active.get(signal) ?? null;
  }

  /**
   * Fire the kill-switch synchronously: cancel tokens first (no in-flight
   * work after this returns), then invoke handlers. Handlers may be async,
   * but must not block the cancellation pass.
   */
  async fire(event: KillEvent): Promise<void> {
    this.active.set(event.signal, event);
    const tokens = this.tokensBySignal.get(event.signal);
    if (tokens) {
      for (const token of tokens) {
        token.cancel(event);
      }
      tokens.clear();
    }
    const handlers = this.handlers.get(event.signal);
    if (handlers && handlers.size > 0) {
      await Promise.all(
        Array.from(handlers).map(async (handler) => {
          try {
            await handler(event);
          } catch {
            // Handler errors must not block other handlers.
          }
        }),
      );
    }
  }

  /**
   * Reset the active state for a signal — callable only after the operator
   * confirms the underlying issue is resolved. Subscribers are NOT re-armed
   * automatically; existing subscriptions remain.
   */
  reset(signal: KillSignal): void {
    this.active.delete(signal);
  }
}

export const killSwitchRegistry = new KillSwitchRegistry();
