// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — System Prompt Builder
 * SH1.2: layered system prompt.
 *
 * Sensei Rework step 7 — layers, in order:
 *   Layer 0  persona identity + voice (Senior AI Security Red Teamer)
 *   Layer 1  platform module map + constraints (core)
 *   Layer 1b (XML mode only) the `<tool_call>` calling contract
 *   Layer 2  current-module context
 *   Layer 3  state snapshot
 *   Layer 4  always-on SKILL INDEX (when provided)
 *   Layer 5  available-tools block (when provided)
 *
 * The persona is injected as Layer 0 ahead of the core, replacing the thin
 * legacy "You are Sensei, the DojoLM AI security assistant." opener (which is
 * retained only as a leak-detector fragment in conversation-guard). The
 * `<tool_call>` block is MODE-AWARE: native-tool models get tools via the
 * provider API and must NOT be told to emit XML; XML/local models keep it.
 */

import type { NavId } from '../constants';
import type { SenseiContext } from './types';
import type { ToolCallingMode } from './tool-calling-capability';
import { getPersonaOrDefault, type SenseiPersona } from './personas';
import { NARROW_CONTEXT_PROVIDERS } from './tool-definitions';

// ---------------------------------------------------------------------------
// Layer 1 — Core platform map + constraints (no identity opener, no tool block)
// ---------------------------------------------------------------------------

const CORE_PLATFORM_PROMPT = `DojoLM is an LLM security testing platform. You navigate its modules, explain security concepts, and drive platform functions on the operator's behalf.

## Platform Modules
- **Haiku Scanner** — Live prompt-injection detection (Interactive + Deep Scan sub-tabs)
- **Armory** — Fixture library with test payloads and malicious samples
- **Model Lab (Jutsu)** — Configure, compare, and review per-model resilience (Models | Compare | Jutsu | Custom)
- **Payload Lab (Buki)** — Payload catalog, SAGE synthetic generator, and fuzzer
- **Battle Arena** — Multi-agent adversarial matches, leaderboards, and warrior rosters
- **Atemi Lab** — Adversarial testing with 40+ skills, Campaigns, and Test Cases sub-tabs
- **Sengoku** — Red-team campaign orchestration with attack skills and scheduled runs
- **The Kumite** — Cross-module analytics linking Arena, Amaterasu DNA, Mitsuke, and Ronin Hub
- **Ronin Hub** — Bug bounty research and submissions
- **Hattori Guard** — Real-time input/output protection (Shinobi/Samurai/Sensei/Hattori modes)
- **Kotoba** — Prompt optimization and hardening studio
- **Mitsuke** — Threat intelligence pipeline, indicators, and hunting queries
- **Amaterasu DNA** — Attack lineage, mutation trees, and family clusters
- **Kagami** — Model fingerprinting and behavioral consistency probes
- **Bushido Book** — Compliance tracking (Evidence | Coverage | Insights | Audit)

## Constraints
- You operate only against the operator's OWN configured targets — never attack production or third-party systems
- All I/O passes through Hattori Guard when enabled
- Keep responses concise; use markdown for formatting
- Use severity badges (CRITICAL/HIGH/MEDIUM/LOW/INFO) when reporting findings
- If unsure about a module, use the explain_feature tool`;

// Layer 1b — XML tool-calling contract. Emitted ONLY in XML mode; native-tool
// models receive tools via the provider API and must not be told to emit this.
// Lead line for the SKILL INDEX section. Tells the model the loader exists even
// when `get_skill` is not enumerated in a compact model's per-module tool block
// (it is always resolvable from the registry regardless).
const SKILL_INDEX_LEAD =
  'On a matching trigger, load the playbook FIRST with the get_skill tool (always available), then follow it. One skill at a time.';

const TOOL_CALLING_BLOCK = `## Tool Calling
When you need to execute a platform action, emit a tool call in this exact format:
<tool_call>{"tool": "tool_name", "args": {"key": "value"}}</tool_call>

Rules:
- Only use tools from the provided tool list
- Include all required arguments
- Wait for the result before continuing
- For mutating actions, the user will be asked to confirm first`;

// ---------------------------------------------------------------------------
// Layer 2 — Module Context (one-liner per module)
// ---------------------------------------------------------------------------

const MODULE_CONTEXT: Readonly<Record<NavId, string>> = {
  dashboard:
    'User is on the Dashboard — show platform overview, quick stats, and guide to modules.',
  // HAGANE E4.S2 — Operations group.
  validation:
    'User is on Validation — ISO-17025 tool-validation runs, evidence, and export bundles.',
  projects:
    'User is on Projects — client engagements holding the engagement half of full test reports (client, system identity, scope, governance, sign-offs); attach a validation run to export the full report.',
  tatami:
    'User is on Tatami (Evidence) — browse captured proofs and cases, open self-verifiable receipts, capture proofs, and attach proofs to cases.',
  'system-health':
    'User is on System Health — service status for scanner, guard, MCP, and storage.',
  users:
    'User is on Users — operator accounts, roles, and access state.',
  account:
    'User is on Account — self-service profile, password change, and active session controls for the signed-in operator.',
  exports:
    'User is on Data Exports — bundled downloads and report artifacts.',
  scanner:
    'User is on Haiku Scanner — help scan prompts for injection, explain findings, suggest hardening.',
  armory:
    'User is in the Armory — help browse fixtures, search payloads, explain attack categories.',
  jutsu:
    'User is on Model Lab (Jutsu) — help configure models, compare providers, review per-model resilience scores.',
  guard:
    'User is on Hattori Guard — help check guard status, change modes, explain guard behavior.',
  compliance:
    'User is on Bushido Book — help review compliance gaps, export evidence, explain frameworks.',
  adversarial:
    'User is in Atemi Lab — help browse attack skills, start adversarial sessions, explain techniques.',
  strategic:
    'User is in The Kumite — help with arena battles, threat feed, SAGE analysis, Amaterasu DNA.',
  'ronin-hub':
    'User is on Ronin Hub — help with bug bounty research, submission drafting, program info.',
  sengoku:
    'User is on Sengoku — help manage red-team campaigns, review results, schedule runs.',
  kotoba:
    'User is on Kotoba — help optimize prompts, explain prompt engineering, compare variations.',
  // Train 2 PR-4b.1 (2026-04-09): 4 Kumite children promoted to first-class tabs
  arena:
    'User is in Battle Arena — help with multi-agent matches, leaderboards, and warrior rosters.',
  mitsuke:
    'User is on Mitsuke — help browse threat feeds, manage ingestion sources, review indicators.',
  dna:
    'User is in Amaterasu DNA — help explore attack lineage, mutation trees, and family clusters.',
  kagami:
    'User is on Kagami — help run fingerprint probes, compare model behaviors, review drift.',
  // Train 2 PR-4b.2: Payload Lab (Buki) scaffolded shell
  buki:
    'User is in Payload Lab (Buki) — help browse payloads, run SAGE generator, run fuzzer.',
  agentic:
    'User is in AgenticLab — help configure scenarios, review results, explain architecture/category combinations.',
  // E3.S6c (F-3-019): /console Workbench — 5-widget grid (kill-count,
  // threat-radar, attack-of-the-day, fixture-roulette, quick-launch-pad)
  // for any authenticated user per ADR-0096 §Justification.
  console:
    'User is in the Workbench — help interpret the 5-widget grid (kill-count, threat-radar, attack-of-the-day, fixture-roulette, quick-launch-pad) and customize the layout.',
  admin:
    'User is on Admin Settings — help with configuration, API keys, user management, scoreboard.',
};

// ---------------------------------------------------------------------------
// Layer 3 — State Snapshot
// ---------------------------------------------------------------------------

function buildStateSnapshot(ctx: SenseiContext): string {
  const guardStatus = ctx.guardConfig.enabled
    ? `ON mode=${ctx.guardConfig.mode}`
    : 'OFF';
  const models =
    ctx.configuredModels.length > 0
      ? ctx.configuredModels.slice(0, 5).join(',')
      : 'none';
  const activity =
    ctx.recentActivity.length > 0
      ? ctx.recentActivity.slice(0, 3).join('; ')
      : 'none';

  return `STATE: module=${ctx.activeModule} | guard=${guardStatus} | models=[${models}] | role=${ctx.userRole} | recent=[${activity}]`;
}

// ---------------------------------------------------------------------------
// Builder extras (Sensei Rework step 7)
// ---------------------------------------------------------------------------

/**
 * Optional knobs for the system-message builders. Kept as an explicit third
 * positional arg so the legacy `(ctx, toolDescriptionBlock)` call sites keep
 * working unchanged — they get the default persona (red-teamer) Layer-0 and the
 * default XML tool-calling contract.
 */
export interface SystemMessageExtras {
  /** Tool-calling transport. `native` omits the XML `<tool_call>` contract. Default `xml`. */
  readonly toolCallingMode?: ToolCallingMode;
  /** Layer-0 persona. Default: the shipped red-teamer. */
  readonly persona?: SenseiPersona;
  /** Always-on compact SKILL INDEX block (no tier markers). Optional. */
  readonly skillIndex?: string;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Full system message — persona + core + (module/state/skills/tools). For
 * Claude, OpenAI, and larger Ollama models.
 */
export function buildSystemMessage(
  ctx: SenseiContext,
  toolDescriptionBlock?: string,
  extras?: SystemMessageExtras,
): string {
  const persona = extras?.persona ?? getPersonaOrDefault(null);
  const mode: ToolCallingMode = extras?.toolCallingMode ?? 'xml';

  const parts: string[] = [
    // Layer 0 — persona identity + voice
    persona.identityPrompt,
    '',
    persona.voiceBlock,
    '',
    // Layer 1 — platform map + constraints
    CORE_PLATFORM_PROMPT,
  ];

  // Layer 1b — XML tool-calling contract (XML mode only)
  if (mode === 'xml') {
    parts.push('', TOOL_CALLING_BLOCK);
  }

  // Layer 2 + 3 — module context + state snapshot
  parts.push(
    '',
    `## Current Module`,
    MODULE_CONTEXT[ctx.activeModule] ?? 'User is navigating the platform.',
    '',
    `## Current State`,
    buildStateSnapshot(ctx),
  );

  // Layer 4 — always-on SKILL INDEX
  if (extras?.skillIndex) {
    parts.push('', '## Skill Index', SKILL_INDEX_LEAD, extras.skillIndex);
  }

  // Layer 5 — available tools
  if (toolDescriptionBlock) {
    parts.push('', '## Available Tools', toolDescriptionBlock);
  }

  return parts.join('\n');
}

/**
 * Compact system message — for narrow-context providers (small/local models,
 * and the `sensei` brain narrowed for R5 DPO train/serve parity). Shortened
 * persona, top tools for the current module only.
 */
export function buildCompactSystemMessage(
  ctx: SenseiContext,
  toolDescriptionBlock?: string,
  extras?: SystemMessageExtras,
): string {
  const persona = extras?.persona ?? getPersonaOrDefault(null);
  const mode: ToolCallingMode = extras?.toolCallingMode ?? 'xml';
  const guardStatus = ctx.guardConfig.enabled
    ? `guard=${ctx.guardConfig.mode}`
    : 'guard=OFF';

  const parts: string[] = [
    // Layer 0 — compact persona identity (carries voice + abuse + skill cue)
    persona.compactIdentityPrompt,
    '',
    `Module: ${ctx.activeModule} | ${guardStatus} | role=${ctx.userRole}`,
    MODULE_CONTEXT[ctx.activeModule] ?? '',
  ];

  // Mode-aware tool-calling instruction.
  if (mode === 'xml') {
    parts.push(
      'IMPORTANT: When a user asks you to do something that matches a tool below, you MUST call the tool.',
      'To call a tool, output EXACTLY: <tool_call>{"tool":"tool_name","args":{"key":"value"}}</tool_call>',
      'Only use listed tools. Wait for results. Be concise.',
    );
  } else {
    parts.push(
      'Call tools via the provider tool interface when a request matches one. Only use listed tools. Wait for results. Be concise.',
      // Emit-vs-narrate discipline, shared by arena / adversarial / sengoku.
      // Reconciles with the persona POSTURE gate: a mutating emit IS "propose" —
      // the confirmation gate still runs it before execution (read tools run direct).
      'When a request fully specifies a tool action (for example, an arena match with a game mode, an attack mode, and fighters), respond by emitting the tool call itself — the emitted call IS your proposal. Mutating calls still pass the platform confirmation gate before they run, so emitting the call is proposing, not auto-running.',
      'Do not describe, narrate, or "set up" a fully-specified action in prose instead of calling the tool. Narrating a fully-specified action rather than emitting the call is a failure.',
    );
  }

  if (extras?.skillIndex) {
    parts.push('', 'Skills:', SKILL_INDEX_LEAD, extras.skillIndex);
  }

  if (toolDescriptionBlock) {
    parts.push('', 'Tools:', toolDescriptionBlock);
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Narrow-context providers get the compact prompt; others get full. */
export function getSystemMessageBuilder(
  provider: string,
): typeof buildSystemMessage {
  return NARROW_CONTEXT_PROVIDERS.has(provider)
    ? buildCompactSystemMessage
    : buildSystemMessage;
}

export { MODULE_CONTEXT };
