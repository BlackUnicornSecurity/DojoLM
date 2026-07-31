// SPDX-License-Identifier: Apache-2.0
/**
 * Community build stub for the BUSL `catalog-ee.ts` (stripped from the OSS export).
 *
 * Ships RENAMED to `catalog-ee.ts` (tools/oss-export/classify-path.mjs swap table)
 * so `load-catalog.ts`'s guarded `await import('./catalog-ee.js')` RESOLVES under
 * tsc in the OSS build. The branch is runtime-dead in OSS (`includeEE` is false),
 * so an empty catalog is correct; the EE catalog lives in the BUSL original.
 */
import type { ControlToolDef } from '../types.js';

export const EE_CATALOG: readonly ControlToolDef[] = [];
