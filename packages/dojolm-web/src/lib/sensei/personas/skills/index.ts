// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Skills barrel.
 *
 * Public surface for the skill registry, loader, and single-source generator.
 * The EE catalog is intentionally NOT re-exported here — it is reached only via
 * the guarded dynamic import inside `load-skills.ts` (OSS/EE import-direction
 * invariant).
 */

export type {
  SenseiSkill,
  SenseiMcpPrompt,
  SkillArgument,
  SkillMode,
  SkillTier,
} from './types';

export { OSS_SKILLS } from './catalog-oss';
export { loadSenseiSkills } from './load-skills';
export {
  selectSkillsForPersona,
  findVisibleSkill,
  buildSkillIndexBlock,
  buildSkillTriggerMap,
  toMcpPrompts,
} from './generate';
