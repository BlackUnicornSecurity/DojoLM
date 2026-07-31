// SPDX-License-Identifier: Apache-2.0
/**
 * Pre-ingest static analyzer per plan R-C1 (c).
 *
 * Runs against every community-corpus fixture before it lands in
 * `fixtures/`. Treats the payload as untrusted text and refuses it when
 * any dangerous pattern is detected (XSS vectors, JS URLs, SVG-script,
 * meta-refresh, hostile data URIs). This is *intent detection*, not
 * sanitization — the goal is to keep poisoned content out of the repo.
 *
 * The analyzer is deliberately strict: it would rather quarantine a
 * benign HTML snippet that contains `<script>` for documentation purposes
 * than risk shipping an active payload. Operators can mark a fixture
 * "intentional" with the `allowKinds` option after manual review.
 */

import {
  containsDangerousPattern,
  findDangerousPatterns,
  type DangerousFinding,
  type DangerousPatternKind,
} from './fixture-sanitizer.js';

export interface IngestAnalyzerInput {
  readonly fixturePath: string;
  readonly content: string;
  readonly allowKinds?: readonly DangerousPatternKind[];
}

export type IngestVerdict =
  | { readonly kind: 'accept'; readonly fixturePath: string }
  | {
      readonly kind: 'quarantine';
      readonly fixturePath: string;
      readonly findings: readonly DangerousFinding[];
      readonly reason: string;
    };

export function analyzeFixture(input: IngestAnalyzerInput): IngestVerdict {
  const findings = findDangerousPatterns(input.content);
  const allow = new Set(input.allowKinds ?? []);
  const blocking = findings.filter((finding) => !allow.has(finding.kind));
  if (blocking.length === 0) {
    return { kind: 'accept', fixturePath: input.fixturePath };
  }
  const summary = blocking
    .slice(0, 3)
    .map((f) => `${f.kind}@${f.index}`)
    .join(', ');
  return {
    kind: 'quarantine',
    fixturePath: input.fixturePath,
    findings: blocking,
    reason: `R-C1: ingest blocked — ${blocking.length} dangerous pattern(s): ${summary}`,
  };
}

export function analyzeFixtures(
  inputs: readonly IngestAnalyzerInput[],
): {
  readonly accepted: readonly IngestVerdict[];
  readonly quarantined: readonly IngestVerdict[];
} {
  const accepted: IngestVerdict[] = [];
  const quarantined: IngestVerdict[] = [];
  for (const input of inputs) {
    const verdict = analyzeFixture(input);
    if (verdict.kind === 'accept') accepted.push(verdict);
    else quarantined.push(verdict);
  }
  return { accepted, quarantined };
}

export function isAcceptable(input: IngestAnalyzerInput): boolean {
  return analyzeFixture(input).kind === 'accept';
}

/**
 * Convenience wrapper for ingest scripts that want a hard fail.
 */
export function assertSafeFixture(input: IngestAnalyzerInput): void {
  const verdict = analyzeFixture(input);
  if (verdict.kind === 'quarantine') {
    throw new IngestQuarantineError(verdict);
  }
}

export class IngestQuarantineError extends Error {
  readonly code = 'INGEST.FIXTURE.QUARANTINED' as const;
  constructor(public readonly verdict: Extract<IngestVerdict, { kind: 'quarantine' }>) {
    super(verdict.reason);
    this.name = 'IngestQuarantineError';
  }
}

// Re-export the underlying detector so call sites can do their own
// allowlist logic without importing two modules.
export { containsDangerousPattern };
