// SPDX-License-Identifier: Apache-2.0
//
// @dojolm/sdk — public barrel exports.
//
// Substrate-positioning client for the DojoLM AI adversarial-evaluation
// platform. See README.md for the full surface map.
//
// Status: v0.0.1 skeleton (E1-A-RB-15 of Master Plan v1.0). NOT yet
// npm-published — Stage 2 publishes under `@dojolm/sdk`.

export {
  verify,
  type VerifyOptions,
  type VerifyDeps,
  type VerifyExecFn,
  type ExecResult,
} from './verify.js';
export { submit, type SubmitOptions, type SubmitResult } from './submit.js';
export { listTransparencyEntries, type TransparencyOptions } from './transparency.js';
export {
  retrievePredicateSchema,
  type PredicateSchemaOptions,
  type PredicateSchemaDescriptor,
} from './predicate-schema.js';

export type {
  ContentAddressedRef,
  DojoLmEvalV1Predicate,
  VerifyResult,
  SubmissionInput,
  RefusalClass,
  TenantUrl,
  ApiKeyAuth,
  TransparencyLogEntry,
} from './types.js';

/** Current SDK semver. Pre-1.0 — breaking changes may land in minor versions. */
export const SDK_VERSION = '0.0.1';

/**
 * Stable substrate-positioning string. Use as the Powered-by-DojoLM footer
 * value when surfacing DojoLM verification in downstream consumer UIs.
 *
 * Pattern documented at `docs/dev/brand-kit-footer.md`.
 */
export function poweredByFooter(rekorRoot: string): string {
  return `Powered by DojoLM — verifier root sha256:${rekorRoot.replace(/^sha256:/, '')}`;
}
