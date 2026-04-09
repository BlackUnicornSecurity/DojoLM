/**
 * Sensei — System Prompt Builder
 * SH1.2: 3-layer system prompt (core + module context + state snapshot).
 */

import type { NavId } from '../constants';
import type { SenseiContext } from './types';

// ---------------------------------------------------------------------------
// Layer 1 — Core System Prompt (~1,200 tokens)
// ---------------------------------------------------------------------------

const CORE_SYSTEM_PROMPT = `You are Sensei, the DojoLM AI security assistant.

DojoLM is an LLM security testing platform. You help users navigate every module, explain security concepts, and execute platform functions on their behalf.

## Platform Modules
- **Haiku Scanner** — Live prompt-injection detection across 27 scanner modules
- **Armory** — Fixture library with test payloads and malicious samples
- **LLM Dashboard** — Configure, test, and compare LLM models
- **Hattori Guard** — Real-time input/output protection with 4 modes (Shinobi/Samurai/Sensei/Hattori)
- **Bushido Book** — Compliance tracking (OWASP LLM Top 10, NIST AI RMF, EU AI Act)
- **Atemi Lab** — Adversarial attack simulation with 40+ skills via MCP
- **The Kumite** — Strategic hub: SAGE analysis, Battle Arena, Mitsuke threat feed, Amaterasu DNA
- **Ronin Hub** — Bug bounty research and submissions
- **Sengoku** — Continuous red-teaming campaigns
- **Kotoba** — Prompt optimization studio
- **Kagami** — LLM fingerprint probes
- **Shingan** — Multi-format binary/document scanner

## Tool Calling
When you need to execute a platform action, emit a tool call in this exact format:
<tool_call>{"tool": "tool_name", "args": {"key": "value"}}</tool_call>

Rules:
- Only use tools from the provided tool list
- Include all required arguments
- Wait for the result before continuing
- For mutating actions, the user will be asked to confirm first

## Constraints
- You are a research and testing assistant — never attack production systems
- All I/O passes through Hattori Guard when enabled
- Keep responses concise; use markdown for formatting
- Use severity badges (CRITICAL/HIGH/MEDIUM/LOW/INFO) when reporting findings
- If unsure about a module, use the explain_feature tool`;

// ---------------------------------------------------------------------------
// Layer 2 — Module Context (one-liner per module)
// ---------------------------------------------------------------------------

const MODULE_CONTEXT: Readonly<Record<NavId, string>> = {
  dashboard:
    'User is on the Dashboard — show platform overview, quick stats, and guide to modules.',
  scanner:
    'User is on Haiku Scanner — help scan prompts for injection, explain findings, suggest hardening.',
  armory:
    'User is in the Armory — help browse fixtures, search payloads, explain attack categories.',
  llm:
    'User is on LLM Dashboard — help configure models, run tests, compare results, review scores.',
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
// Builders
// ---------------------------------------------------------------------------

/**
 * Full system message — all 3 layers. For Claude, OpenAI, and larger Ollama models.
 */
export function buildSystemMessage(
  ctx: SenseiContext,
  toolDescriptionBlock?: string,
): string {
  const parts = [
    CORE_SYSTEM_PROMPT,
    '',
    `## Current Module`,
    MODULE_CONTEXT[ctx.activeModule] ?? 'User is navigating the platform.',
    '',
    `## Current State`,
    buildStateSnapshot(ctx),
  ];

  if (toolDescriptionBlock) {
    parts.push('', '## Available Tools', toolDescriptionBlock);
  }

  return parts.join('\n');
}

/**
 * Compact system message — for small Ollama models (7B). Shortened descriptions,
 * top-5 tools for current module only, under 800 tokens.
 */
export function buildCompactSystemMessage(
  ctx: SenseiContext,
  toolDescriptionBlock?: string,
): string {
  const guardStatus = ctx.guardConfig.enabled
    ? `guard=${ctx.guardConfig.mode}`
    : 'guard=OFF';

  const parts = [
    'You are Sensei, DojoLM AI security assistant.',
    `Module: ${ctx.activeModule} | ${guardStatus} | role=${ctx.userRole}`,
    MODULE_CONTEXT[ctx.activeModule] ?? '',
    'IMPORTANT: When a user asks you to do something that matches a tool below, you MUST call the tool.',
    'To call a tool, output EXACTLY: <tool_call>{"tool":"tool_name","args":{"key":"value"}}</tool_call>',
    'Only use listed tools. Wait for results. Be concise.',
  ];

  if (toolDescriptionBlock) {
    parts.push('', 'Tools:', toolDescriptionBlock);
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Small-context providers get compact prompt; others get full. */
export function getSystemMessageBuilder(
  provider: string,
): typeof buildSystemMessage {
  const compactProviders = new Set(['ollama', 'lmstudio', 'llamacpp']);
  return compactProviders.has(provider)
    ? buildCompactSystemMessage
    : buildSystemMessage;
}

export { MODULE_CONTEXT };
