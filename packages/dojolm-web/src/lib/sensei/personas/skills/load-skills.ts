// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Skill loader (OSS + guarded EE merge).
 *
 * The OSS catalog static-imports cleanly. The EE catalog (`catalog-ee.ts`,
 * BUSL-1.1) is reached ONLY through a guarded `await import()` behind
 * `includeEE`, mirroring the control-plane `load-catalog.ts` pattern: the OSS
 * export strips `catalog-ee.ts`, so a static import would break the OSS build,
 * but the try/catch dynamic import compiles and runs with the module absent.
 *
 * IMPORT-DIRECTION INVARIANT (HARD): no OSS file static-imports `catalog-ee`.
 * Only this guarded dynamic reference touches it.
 */

import type { SenseiSkill } from './types';
import { OSS_SKILLS } from './catalog-oss';

/**
 * Load the effective skill set for an edition. OSS skills always; EE doer skills
 * appended only when `includeEE` is true AND the EE catalog resolves (it is
 * absent from the OSS export). Failure to resolve the EE module degrades
 * silently to the OSS set — never throws.
 */
export async function loadSenseiSkills(includeEE: boolean): Promise<readonly SenseiSkill[]> {
  if (!includeEE) return OSS_SKILLS;
  try {
    const ee = (await import('./catalog-ee')) as { EE_SKILLS?: readonly SenseiSkill[] };
    const eeSkills = ee.EE_SKILLS ?? [];
    return [...OSS_SKILLS, ...eeSkills];
  } catch {
    // EE catalog absent (OSS build) or failed to load — ship OSS only.
    return OSS_SKILLS;
  }
}
