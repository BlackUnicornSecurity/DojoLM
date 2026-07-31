// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Single-source skill generator.
 *
 * ONE skill array drives THREE outputs, eliminating 3-place drift:
 *   1. `buildSkillIndexBlock`  — the always-on compact SKILL INDEX for the prompt.
 *   2. `buildSkillTriggerMap`  — id → trigger, for trigger-matching / tests.
 *   3. `toMcpPrompts`          — the MCP `Prompt[]` consumed later by step 8's
 *                                `@dojolm/mcp-control` (no SDK dependency here).
 *
 * `selectSkillsForPersona` is the governance gate shared by the prompt-index
 * path (chat route) and the `get_skill` execution path (tool source), so both
 * agree on exactly which skills a caller may see + load:
 *   effective = persona.allowedSkillIds ∩ tier-in-build ∩ role ≥ skill.minRole
 * (tier-in-build is already enforced upstream by `loadSenseiSkills(includeEE)`,
 * which simply never returns an EE body in an OSS build.)
 *
 * TIER-MARKER STRIP (review LOW): the OSS-visible INDEX + MCP prompts carry NO
 * `oss`/`ee` discriminator. Shipping `tier:'oss'` would imply an `ee`
 * counterpart exists — the same oracle `EE_NAV_IDS` guards against. The model
 * sees a flat list of skills it can actually use, nothing more.
 */

import type { SenseiToolRole } from '../../types';
import type { SenseiPersona } from '../types';
import type { SenseiMcpPrompt, SenseiSkill } from './types';

const ROLE_RANK: Readonly<Record<SenseiToolRole, number>> = {
  viewer: 0,
  user: 1,
  admin: 2,
};

function roleSatisfies(userRole: SenseiToolRole, minRole: SenseiToolRole): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

/**
 * The effective skill set for a persona + caller. Intersects the persona's
 * allowed ids with the in-build catalog and the caller's role. Order follows
 * the persona's `allowedSkillIds` so the index is stable + intentional.
 */
export function selectSkillsForPersona(
  skills: readonly SenseiSkill[],
  persona: SenseiPersona,
  userRole: SenseiToolRole,
): readonly SenseiSkill[] {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const out: SenseiSkill[] = [];
  // Iterate the persona allow-list directly — order is intentional, and an id
  // absent from `byId` (e.g. an EE skill stripped in an OSS build) is skipped.
  for (const id of persona.allowedSkillIds) {
    const skill = byId.get(id);
    if (!skill) continue;
    if (!roleSatisfies(userRole, skill.minRole)) continue;
    out.push(skill);
  }
  return out;
}

/** Resolve a single visible skill by id (post-governance). `undefined` if hidden/unknown. */
export function findVisibleSkill(
  skills: readonly SenseiSkill[],
  persona: SenseiPersona,
  userRole: SenseiToolRole,
  id: string,
): SenseiSkill | undefined {
  return selectSkillsForPersona(skills, persona, userRole).find((s) => s.id === id);
}

/**
 * The always-on compact SKILL INDEX (one line per skill). No tier markers.
 * Format: `- <id> — <trigger> Load with get_skill.`
 * Returns '' for an empty set so the prompt builder can omit the section.
 */
export function buildSkillIndexBlock(skills: readonly SenseiSkill[]): string {
  if (skills.length === 0) return '';
  return skills
    .map((s) => `- ${s.id} — ${s.summary} Trigger: ${s.trigger}`)
    .join('\n');
}

/** id → trigger map (for trigger matching + tests). */
export function buildSkillTriggerMap(
  skills: readonly SenseiSkill[],
): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const s of skills) map[s.id] = s.trigger;
  return map;
}

/**
 * Map skills to MCP prompt specs (step 8). The prompt name is the skill id; the
 * template is the body, with the same tier-marker strip as the index — an OSS
 * client never sees an `ee` discriminator.
 */
export function toMcpPrompts(skills: readonly SenseiSkill[]): SenseiMcpPrompt[] {
  return skills.map((s) => ({
    name: s.id,
    title: s.title,
    description: `${s.summary} ${s.trigger}`.trim(),
    arguments: s.arguments ?? [],
    template: s.body,
  }));
}
