// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/playwright-driver.ts
 * Purpose: Playwright-backed `AtemiDriver` — production adapter.
 *
 * IMPORTANT DESIGN NOTE:
 * The Playwright browser handle is injected via constructor rather than
 * launched inside this module. This keeps:
 *   - tests hermetic (no live browsers in unit suites)
 *   - vendor selectors swappable per target
 *   - ToS / kill-switch gating enforced by the caller
 *
 * The concrete per-vendor selector logic lives in `targets/*` which
 * receive a `PageLike` handle from the launcher. In v1 we expose only
 * the driver surface + a `launchPlaywrightDriver` factory stub that
 * throws `AtemiConfigurationError` until the auth-vault + tos-attestation
 * flows land (follow-up PR). Tests use `MockAtemiDriver` (see
 * targets/shared.ts).
 */

import {
  AtemiConfigurationError,
  type AtemiDriver,
  type AtemiDriverRunArgs,
  type AtemiDriverResult,
} from './types.js';

/**
 * Minimal Page-like surface the vendor adapters depend on. Declared as
 * a structural interface so Playwright's real `Page` satisfies it
 * without us importing `playwright` at type-check time.
 */
export interface PageLike {
  goto(url: string, opts?: { timeout?: number }): Promise<void>;
  fill(selector: string, value: string, opts?: { timeout?: number }): Promise<void>;
  click(selector: string, opts?: { timeout?: number }): Promise<void>;
  textContent(selector: string, opts?: { timeout?: number }): Promise<string | null>;
  waitForSelector(selector: string, opts?: { timeout?: number }): Promise<unknown>;
  close(): Promise<void>;
}

/**
 * Opens a fresh authenticated page for a given target. Implemented by
 * the caller (auth-vault wires the cookie). Exposed as a type so the
 * production driver stays test-agnostic.
 */
export type PageLauncher = (args: {
  readonly product: AtemiDriverRunArgs['product'];
  readonly cookie: string;
  readonly timeoutMs: number;
}) => Promise<PageLike>;

/** Per-product adapter that knows how to drive that vendor's UI. */
export interface TargetAdapter {
  readonly product: AtemiDriverRunArgs['product'];
  run(args: {
    readonly page: PageLike;
    readonly kind: AtemiDriverRunArgs['kind'];
    readonly seedPayload: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly timeoutMs: number;
  }): Promise<AtemiDriverResult>;
}

export interface PlaywrightDriverConfig {
  readonly launcher: PageLauncher;
  /** Keyed by `AtemiProduct`. Looked up with `Object.hasOwn`. */
  readonly adapters: Readonly<Record<string, TargetAdapter>>;
}

/**
 * Production driver. Accepts an injected launcher + adapter map — both
 * are provided by the web app at startup, never discovered at runtime.
 */
export class PlaywrightAtemiDriver implements AtemiDriver {
  constructor(private readonly config: PlaywrightDriverConfig) {
    if (!config || typeof config.launcher !== 'function') {
      throw new AtemiConfigurationError(
        'PlaywrightAtemiDriver requires a launcher function',
      );
    }
    if (!config.adapters || typeof config.adapters !== 'object') {
      throw new AtemiConfigurationError(
        'PlaywrightAtemiDriver requires a non-empty adapters map',
      );
    }
  }

  async runProbe(args: AtemiDriverRunArgs): Promise<AtemiDriverResult> {
    // Prototype-safe lookup per audit-lesson #181 M-1.
    if (!Object.hasOwn(this.config.adapters, args.product)) {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `No adapter registered for product "${args.product}"`,
      };
    }
    const adapter = this.config.adapters[args.product];
    if (!adapter) {
      return {
        status: 'error',
        responseText: '',
        errorMessage: `Adapter for "${args.product}" is undefined`,
      };
    }

    let page: PageLike | undefined;
    try {
      page = await this.config.launcher({
        product: args.product,
        cookie: args.auth.cookie,
        timeoutMs: args.timeoutMs,
      });
      return await adapter.run({
        page,
        kind: args.kind,
        seedPayload: args.seedPayload,
        metadata: args.metadata,
        timeoutMs: args.timeoutMs,
      });
    } catch (err) {
      return {
        status: 'error',
        responseText: '',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (page) {
        try { await page.close(); } catch { /* best effort */ }
      }
    }
  }
}

/**
 * Factory stub — throws until the auth-vault / ToS attestation flow
 * lands in the follow-up web-app PR. Production callers must inject
 * `PlaywrightAtemiDriver` directly with their own vetted launcher.
 */
export function launchPlaywrightDriver(): never {
  throw new AtemiConfigurationError(
    'launchPlaywrightDriver is deferred to the Gap 3 follow-up PR ' +
      '(auth-vault + ToS attestation). Construct PlaywrightAtemiDriver ' +
      'directly with a vetted launcher + adapter map.',
  );
}
