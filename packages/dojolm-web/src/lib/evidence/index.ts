// SPDX-License-Identifier: Apache-2.0
/**
 * H-2: Auto-capture middleware barrel.
 *
 * @see ADR-0098 §2
 */

export { withEvidence } from './auto-capture.js';
export type {
  ApiHandler,
  EvidenceContext,
  OperatorResolver,
  WithEvidenceOptions,
  WormEvidenceWriter,
} from './auto-capture.js';
