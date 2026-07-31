// SPDX-License-Identifier: Apache-2.0
/**
 * Resource loader (OSS today; EE seam reserved).
 *
 * Mirrors the catalog/prompt loaders. Every bundled resource is OSS-tier, so the
 * loader returns them directly; `includeEE` is honored as a tier filter so an
 * OSS build can never surface an EE-tier resource even if one were added to the
 * OSS array by mistake (defense in depth). When EE resources actually land
 * (option d), this is where the guarded `await import('./resources-ee.js')`
 * goes — and that source/spec pair must then be registered in THREE places:
 *   1. the import-graph `GUARDED_EE_DYNAMIC_IMPORT_ALLOWLIST` (allows the edge);
 *   2. the EE file in `license-map.mjs` as BUSL (stripped from the export);
 *   3. a `resources-ee.community.ts` EMPTY stub in `COMMUNITY_STUB_SWAPS`
 *      (tools/oss-export/classify-path.mjs) so the OSS export still `tsc`-compiles
 *      — tsc statically resolves the literal specifier even for a guarded import.
 * Keep the stub's exported symbols in sync with what this loader destructures.
 */

import type { ControlResource } from '../types.js';
import { OSS_RESOURCES } from './resources.js';

/** Load the effective resource set. OSS always; EE-tier filtered out unless enabled. */
export async function loadResources(includeEE: boolean): Promise<readonly ControlResource[]> {
  return includeEE ? OSS_RESOURCES : OSS_RESOURCES.filter((r) => r.tier === 'oss');
}
