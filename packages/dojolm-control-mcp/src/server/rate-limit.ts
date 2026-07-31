// SPDX-License-Identifier: Apache-2.0
/**
 * Per-identity token-bucket rate limiter for the HTTP transport.
 * In-memory; swap for a shared store behind a multi-instance edge.
 */

export interface RateLimitConfig {
  /** Max requests per window. */
  readonly max: number;
  /** Window length in ms. */
  readonly windowMs: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly config: RateLimitConfig = { max: 120, windowMs: 60_000 }) {}

  /** True if this identity is within budget (and records the hit). */
  allow(identity: string, now: number = Date.now()): boolean {
    if (this.hits.size > 10_000) this.sweep(now);
    const recent = (this.hits.get(identity) ?? []).filter((t) => now - t < this.config.windowMs);
    if (recent.length >= this.config.max) {
      this.hits.set(identity, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(identity, recent);
    return true;
  }

  private sweep(now: number): void {
    for (const [k, ts] of this.hits) {
      if (ts.every((t) => now - t >= this.config.windowMs)) this.hits.delete(k);
    }
  }
}
