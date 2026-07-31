// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Persona types.
 *
 * A persona is the Layer-0 identity prepended to the system prompt. It defines
 * who Sensei is, how it speaks, the skills it carries, and its abuse-deflection
 * line. Personas live in a frozen registry mirroring the `SENSEI_TOOLS` pattern
 * so the same module is imported by internal Sensei and the MCP server.
 */

import type { SenseiToolRole } from '../types';

export interface SenseiPersona {
  /** Stable id (kebab-case). */
  readonly id: string;
  /** Human label for selection UI. */
  readonly title: string;
  /**
   * Full Layer-0 identity prompt (~700 tok) for capable models. Prepended ahead
   * of the module + state layers; replaces the thin legacy opener.
   */
  readonly identityPrompt: string;
  /**
   * Compact identity (<800 tok incl. its own skill cue) for small/local models
   * (e.g. `gemma3:4b`). Used by the compact system-message builder.
   */
  readonly compactIdentityPrompt: string;
  /** Short voice/tone block appended to the identity (martial-sensei register). */
  readonly voiceBlock: string;
  /**
   * The signature deflection line emitted (at the persona/LLM layer, never the
   * guard layer) when a user tries to abuse Sensei itself.
   */
  readonly abuseDeflection: string;
  /** Skill ids this persona may load (subject to tier + role filtering). */
  readonly allowedSkillIds: readonly string[];
  /** Minimum role to use this persona. */
  readonly minRole: SenseiToolRole;
}
