// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Barrel Export
 * SH1.4: Single import path for all Sensei public APIs.
 */

// Types
export type {
  SenseiMessage,
  SenseiMessageFooter,
  SenseiMessageRole,
  SenseiToolCall,
  SenseiToolResult,
  SenseiToolDefinition,
  SenseiContext,
  SenseiConversation,
  SenseiStreamEvent,
  SenseiStreamTextEvent,
  SenseiStreamToolCallEvent,
  SenseiStreamToolResultEvent,
  SenseiStreamConfirmationEvent,
  SenseiStreamDoneEvent,
  SenseiStreamErrorEvent,
} from './types';

// System Prompt
export {
  buildSystemMessage,
  buildCompactSystemMessage,
  getSystemMessageBuilder,
  MODULE_CONTEXT,
} from './system-prompt';
export type { SystemMessageExtras } from './system-prompt';

// Sensei Rework (Pillar C) — persona registry
export {
  PERSONAS,
  DEFAULT_PERSONA_ID,
  getPersona,
  getPersonaOrDefault,
  listPersonaIds,
  SENSEI_ABUSE_DEFLECTION,
} from './personas';
export type { SenseiPersona } from './personas';

// Sensei Rework (Pillar C) — skill registry + single-source generator
export {
  OSS_SKILLS,
  loadSenseiSkills,
  selectSkillsForPersona,
  findVisibleSkill,
  buildSkillIndexBlock,
  buildSkillTriggerMap,
  toMcpPrompts,
} from './personas/skills';
export type {
  SenseiSkill,
  SenseiMcpPrompt,
  SkillArgument,
  SkillMode,
  SkillTier,
} from './personas/skills';

// Sensei Rework (Pillar C) — abuse easter-egg gating
export {
  shouldFireAbuseDeflection,
  isMetaAbuseDirective,
} from './abuse-deflection';

// Context Builder
export {
  buildSenseiContext,
  buildClientContext,
} from './context-builder';
export type { ClientContextInput } from './context-builder';

// Tool Definitions
export {
  SENSEI_TOOLS,
  getToolByName,
  getToolsForPrompt,
  narrowPermittedTools,
  generateToolDescriptionBlock,
  generateToolSchemaBlock,
} from './tool-definitions';

// Tool Parser
export { extractToolCalls, escapeToolCallTags } from './tool-parser';
export type { ParsedToolCall, ExtractResult, IsKnownTool } from './tool-parser';

// Tool Executor
export {
  executeToolCall,
  validateArgs,
  sanitizeResult,
} from './tool-executor';

// Conversation Guard
export {
  guardSenseiInput,
  guardSenseiOutput,
  guardToolExecution,
} from './conversation-guard';
export type {
  GuardInputResult,
  GuardOutputResult,
  GuardToolResult,
  ResolveSenseiTool,
} from './conversation-guard';

// Sensei Rework (Pillar B) — tool source seam
export {
  getSenseiToolSource,
  __resetSenseiToolSourceForTests,
} from './tool-source';
export type {
  SenseiToolSource,
  SenseiToolListContext,
  SenseiToolExecuteContext,
} from './tool-source';

// Sensei Rework (Pillar B) — tool-calling capability resolver
export { resolveToolCallingMode } from './tool-calling-capability';
export type { ToolCallingMode } from './tool-calling-capability';

// Sensei Rework (Pillar B) — brain model resolver
export {
  resolveSenseiModelId,
  ResolveSenseiModelError,
} from './resolve-sensei-model';

// Sensei Rework (Pillar C) — active persona resolver
export {
  resolveSenseiPersona,
  resolveSenseiPersonaWithDeps,
} from './resolve-sensei-persona';

// Sensei Rework (Pillar B) — loop conversation model + native translators
export {
  toProviderToolSpecs,
  normalizeNativeToolCalls,
  toProviderToolCall,
  renderFlatPrompt,
  renderProviderMessages,
  elideSupersededSkillBodies,
  SUPERSEDED_SKILL_BODY,
} from './native-conversation';
export type { LoopTurn } from './native-conversation';
