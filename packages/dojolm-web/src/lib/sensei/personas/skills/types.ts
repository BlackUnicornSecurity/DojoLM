// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Skill types.
 *
 * A skill is a frozen-const playbook the red-teamer persona may load on demand
 * via the read-only `get_skill` capability. Skills mirror the `SENSEI_TOOLS`
 * pattern: one registry, pure selectors, consumed identically by internal
 * Sensei AND (step 8) the `@dojolm/mcp-control` server (as MCP prompts).
 *
 * Tier + mode encode the OSS/EE teach-vs-do split:
 *  - `oss` + `doer`   — runs OSS tools against an OSS target.
 *  - `oss` + `mentor` — TEACHES a discipline; never executes an EE feature and
 *    names no EE feature (pure security knowledge).
 *  - `ee`  + `doer`   — the graduated counterpart that executes the EE harness;
 *    its body lives in a BUSL-1.1 file the OSS export strips.
 *
 * Skill BODIES are guard-safe by construction: a unit test runs every body
 * through `guardSenseiInput` + `guardSenseiOutput` asserting it is never
 * blanked or false-blocked (no literal `<tool_call>` syntax, no
 * SYSTEM_PROMPT_FRAGMENTS substrings, no extraction-pattern phrasing).
 */

import type { SenseiToolRole } from '../../types';

/** OSS/EE tier of a skill. `ee` bodies are stripped from the OSS export. */
export type SkillTier = 'oss' | 'ee';

/** Whether the skill executes the platform (`doer`) or teaches a discipline (`mentor`). */
export type SkillMode = 'doer' | 'mentor';

/** A single templated argument exposed when the skill is served as an MCP prompt. */
export interface SkillArgument {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
}

export interface SenseiSkill {
  /** Stable kebab-case id (matches the persona's `allowedSkillIds`). */
  readonly id: string;
  /** Human label. */
  readonly title: string;
  /** OSS/EE tier. */
  readonly tier: SkillTier;
  /** Doer (executes) vs mentor (teaches). */
  readonly mode: SkillMode;
  /** Minimum role required to load + follow this skill. */
  readonly minRole: SenseiToolRole;
  /** Short trigger phrase — when to load this skill (for the SKILL INDEX). */
  readonly trigger: string;
  /** One-line load hint shown in the always-on SKILL INDEX. */
  readonly summary: string;
  /** Full playbook body, fetched on demand via `get_skill`. Guard-safe. */
  readonly body: string;
  /** Templated arguments for the MCP prompt form (step 8). */
  readonly arguments?: readonly SkillArgument[];
}

/**
 * MCP prompt spec — the single-source generator's third output. Consumed later
 * by `@dojolm/mcp-control` (`server.registerPrompt`). Shaped to the MCP
 * `Prompt` contract without importing the SDK here (keeps this module OSS-pure
 * and dependency-free).
 */
export interface SenseiMcpPrompt {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly arguments: readonly SkillArgument[];
  /** The playbook text, used to render `prompts/get` PromptMessage[]. */
  readonly template: string;
}
