// SPDX-License-Identifier: Apache-2.0
/**
 * Community build stub for the BUSL `catalog-ee.ts` (stripped from the OSS export).
 *
 * Ships RENAMED to `catalog-ee.ts` (tools/oss-export/classify-path.mjs swap table)
 * so `load-skills.ts`'s guarded `await import('./catalog-ee')` RESOLVES under tsc
 * in the OSS build. The branch is runtime-dead in OSS (`includeEE` is false).
 */
import type { SenseiSkill } from './types';

export const EE_SKILLS: readonly SenseiSkill[] = [];
