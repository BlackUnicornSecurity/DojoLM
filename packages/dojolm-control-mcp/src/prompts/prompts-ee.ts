// SPDX-License-Identifier: Apache-2.0
/**
 * Community build stub for the BUSL `prompts-ee.ts` (stripped from the OSS export).
 *
 * Ships RENAMED to `prompts-ee.ts` (tools/oss-export/classify-path.mjs swap table)
 * so `load-prompts.ts`'s guarded `await import('./prompts-ee.js')` RESOLVES under
 * tsc in the OSS build. The branch is runtime-dead in OSS (`includeEE` is false).
 */
import type { ControlPrompt } from '../types.js';

export const EE_PROMPTS: readonly ControlPrompt[] = [];
