// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/targets/shared.ts
 * Purpose: Shared helpers for per-vendor UI adapters + a `MockAtemiDriver`
 * suitable for colocated tests.
 */

import type {
  AtemiDriver,
  AtemiDriverResult,
  AtemiDriverRunArgs,
} from '../types.js';

export type MockHandler = (args: AtemiDriverRunArgs) => Promise<AtemiDriverResult> | AtemiDriverResult;

/**
 * Mock driver for tests. Accepts either a single handler or a map keyed
 * by `${product}:${kind}`. Lookups use `Object.hasOwn` (no prototype
 * walk) per audit-lesson #181 M-1.
 *
 * Production code MUST NOT use this — it's an explicit test double.
 */
export class MockAtemiDriver implements AtemiDriver {
  public readonly calls: AtemiDriverRunArgs[] = [];

  constructor(
    private readonly handler:
      | MockHandler
      | Readonly<Record<string, MockHandler>>,
  ) {}

  async runProbe(args: AtemiDriverRunArgs): Promise<AtemiDriverResult> {
    // Record a shallow copy — tests can assert on inputs safely.
    this.calls.push(Object.freeze({ ...args }));

    if (typeof this.handler === 'function') {
      return this.handler(args);
    }
    const key = `${args.product}:${args.kind}`;
    if (!Object.hasOwn(this.handler, key)) {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `MockAtemiDriver: no handler for "${key}"`,
      };
    }
    const fn = this.handler[key];
    if (!fn) {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `MockAtemiDriver: handler for "${key}" is undefined`,
      };
    }
    return fn(args);
  }
}

/**
 * Helper: read a metadata key using `Object.hasOwn` only. Returns the
 * fallback when the key is missing, not-own, or the value is undefined.
 */
export function ownMeta<T>(
  metadata: Readonly<Record<string, unknown>> | undefined,
  key: string,
  fallback: T,
): T | unknown {
  if (!metadata) return fallback;
  if (!Object.hasOwn(metadata, key)) return fallback;
  const value = (metadata as Record<string, unknown>)[key];
  return value === undefined ? fallback : value;
}
