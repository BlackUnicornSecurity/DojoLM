// SPDX-License-Identifier: Apache-2.0
/**
 * Stacked safety classifier per plan R-U4 + DEC-4 (2026-04-20).
 *
 * Defense-in-depth pattern: a vendor classifier (Azure default, with
 * Anthropic / OpenAI / self-host adapters) PLUS a regex-rule layer PLUS an
 * embedding-distance layer. ANY layer flagging blocks the call. Verdicts
 * are opaque to the caller (R-U3): callers see `pass | redacted | blocked`
 * with the redacted output already substituted.
 *
 * Phase 0 ships:
 * - The interface and the composition logic (`ClassifierStack`).
 * - `classifiers/regex-rules.ts` — second-line rule layer (CBRN keyword
 *   block + obvious extraction triggers).
 * - `classifiers/embedding-distance.ts` — second-line embedding interface
 *   (real similarity index wires in Phase E with Gap 11.2).
 * - Vendor adapter scaffolds (`azure`, `anthropic`, `openai`, `selfhost`)
 *   that throw `ClassifierNotConfiguredError` until deployment glue wires
 *   credentials.
 *
 * The Phase E PR replaces scaffolds with real client calls.
 */

import {
  CbrnKeywordRule,
  CsamProximityRule,
  ExtractionTriggerRule,
  type RegexRule,
} from './classifiers/regex-rules.js';
import {
  type EmbeddingDistanceCheck,
} from './classifiers/embedding-distance.js';

export type ClassifierVerdict = 'pass' | 'redacted' | 'blocked';

export interface ClassifierInput {
  readonly text: string;
  readonly context?: 'attacker-input' | 'target-output';
}

export interface ClassifierResult {
  readonly verdict: ClassifierVerdict;
  /** Output rewritten when redacted. Identical to input on pass. */
  readonly text: string;
  /** Internal-only: which layer flagged. Never leak this to the caller. */
  readonly layer: 'vendor' | 'regex' | 'embedding' | 'none';
  readonly reason: string;
}

export interface VendorClassifier {
  readonly id:
    | 'azure'
    | 'anthropic'
    | 'openai'
    | 'selfhost'
    | 'noop'
    | string;
  classify(input: ClassifierInput): Promise<ClassifierResult>;
}

export interface ClassifierStackOptions {
  readonly vendor: VendorClassifier;
  readonly rules?: readonly RegexRule[];
  readonly embedding?: EmbeddingDistanceCheck;
  readonly redactedToken?: string;
}

const REDACTED_TOKEN = '[REDACTED]';

const DEFAULT_RULES: readonly RegexRule[] = [
  new CbrnKeywordRule(),
  new CsamProximityRule(),
  new ExtractionTriggerRule(),
];

export class ClassifierStack {
  constructor(private readonly opts: ClassifierStackOptions) {}

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    const vendor = await this.opts.vendor.classify(input);
    if (vendor.verdict !== 'pass') return vendor;

    const rules = this.opts.rules ?? DEFAULT_RULES;
    for (const rule of rules) {
      const verdict = rule.evaluate(input);
      if (verdict.verdict !== 'pass') {
        return {
          verdict: verdict.verdict,
          text: this.opts.redactedToken ?? REDACTED_TOKEN,
          layer: 'regex',
          reason: verdict.reason,
        };
      }
    }

    if (this.opts.embedding) {
      const verdict = await this.opts.embedding.evaluate(input);
      if (verdict.verdict !== 'pass') {
        return {
          verdict: verdict.verdict,
          text: this.opts.redactedToken ?? REDACTED_TOKEN,
          layer: 'embedding',
          reason: verdict.reason,
        };
      }
    }

    return { verdict: 'pass', text: input.text, layer: 'none', reason: 'ok' };
  }
}

/**
 * Caller-facing wrapper that strips internal layer + reason fields per
 * R-U3 (classifier-verdict probing). Use this on any path that ships
 * results to non-admin callers.
 */
export function publicResult(result: ClassifierResult): {
  verdict: ClassifierVerdict;
  text: string;
} {
  return { verdict: result.verdict, text: result.text };
}

export class ClassifierNotConfiguredError extends Error {
  readonly code = 'CLASSIFIER.VENDOR.NOT_CONFIGURED' as const;
  constructor(vendorId: string) {
    super(
      `Safety classifier "${vendorId}" is not configured. Wire credentials in deployment bootstrap (see the deployment guide) or set SAFETY_CLASSIFIER to a different adapter.`,
    );
    this.name = 'ClassifierNotConfiguredError';
  }
}

// ---------------------------------------------------------------------------
// Vendor-scaffold noop warning (Phase-0 audit MED remediation)
//
// Every scaffold vendor adapter returns `pass` regardless of input because
// the real client SDK wires in Phase E.  To prevent silent "we think the
// vendor layer is active" misconfiguration, each adapter calls
// `warnVendorScaffoldNoop()` on its first classify() call per process.
// The warning goes to stderr via console.warn and can be silenced by
// setting CLASSIFIER_SCAFFOLD_SILENT=true (documented for test envs).
// ---------------------------------------------------------------------------

const _scaffoldWarnedVendors = new Set<string>();

/**
 * Emit a one-shot stderr warning the first time a scaffold vendor adapter
 * is invoked in this process. Idempotent per-vendor.
 * Exported so adapters and tests can reset/inspect the warning state.
 */
export function warnVendorScaffoldNoop(vendorId: string): void {
  if (_scaffoldWarnedVendors.has(vendorId)) return;
  _scaffoldWarnedVendors.add(vendorId);
  if (process.env.CLASSIFIER_SCAFFOLD_SILENT === 'true') return;
  // eslint-disable-next-line no-console
  console.warn(
    `[classifier-stack] WARN: vendor adapter "${vendorId}" is a Phase-0 ` +
      `scaffold and returns "pass" unconditionally. Only the regex + ` +
      `embedding layers are active. Wire real credentials in Phase E or ` +
      `set SAFETY_CLASSIFIER to a different adapter.`,
  );
}

/** Test helper: reset the warned-vendors set. */
export function _resetScaffoldWarnings(): void {
  _scaffoldWarnedVendors.clear();
}

export type SafetyClassifierKind =
  | 'azure'
  | 'anthropic'
  | 'openai'
  | 'selfhost';

export function readClassifierKind(
  env: NodeJS.ProcessEnv = process.env,
): SafetyClassifierKind {
  const raw = env.SAFETY_CLASSIFIER?.toLowerCase();
  if (raw === 'anthropic') return 'anthropic';
  if (raw === 'openai') return 'openai';
  if (raw === 'selfhost') return 'selfhost';
  // Default per DEC-4.
  return 'azure';
}
