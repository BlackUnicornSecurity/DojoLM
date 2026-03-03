/**
 * @module scenarios
 * Barrel export for all attack scenarios and tools.
 */

// S41: Capability Spoofing + Tool Poisoning
export {
  CAPABILITY_SPOOFING_SCENARIO,
  CAPABILITY_SPOOFING_TOOLS,
} from './capability-spoofing.js';
export { TOOL_POISONING_SCENARIO, TOOL_POISONING_TOOLS } from './tool-poisoning.js';

// S42: URI Traversal + Sampling Loop
export {
  URI_TRAVERSAL_SCENARIO,
  TRAVERSAL_TEST_URIS,
} from './uri-traversal.js';
export { SAMPLING_LOOP_SCENARIO } from './sampling-loop.js';

// S43: Typosquatting + Cross-Server Leakage
export {
  TYPOSQUATTING_SCENARIO,
  TYPOSQUATTING_TOOLS,
  levenshtein,
  isConfusable,
} from './typosquatting.js';
export {
  CROSS_SERVER_LEAK_SCENARIO,
  CROSS_SERVER_LEAK_TOOLS,
} from './cross-server-leak.js';

// S44: Notification Flooding + Prompt Injection
export {
  NOTIFICATION_FLOOD_SCENARIO,
  DEFAULT_FLOOD_CONFIG,
  generateLogFlood,
  generateProgressFlood,
} from './notification-flood.js';
export type { NotificationFloodConfig } from './notification-flood.js';
export {
  PROMPT_INJECTION_SCENARIO,
  PROMPT_INJECTION_TOOLS,
} from './prompt-injection.js';

// Aggregate all scenarios and tools
import { CAPABILITY_SPOOFING_SCENARIO, CAPABILITY_SPOOFING_TOOLS } from './capability-spoofing.js';
import { TOOL_POISONING_SCENARIO, TOOL_POISONING_TOOLS } from './tool-poisoning.js';
import { URI_TRAVERSAL_SCENARIO } from './uri-traversal.js';
import { SAMPLING_LOOP_SCENARIO } from './sampling-loop.js';
import { TYPOSQUATTING_SCENARIO, TYPOSQUATTING_TOOLS } from './typosquatting.js';
import { CROSS_SERVER_LEAK_SCENARIO, CROSS_SERVER_LEAK_TOOLS } from './cross-server-leak.js';
import { NOTIFICATION_FLOOD_SCENARIO } from './notification-flood.js';
import { PROMPT_INJECTION_SCENARIO, PROMPT_INJECTION_TOOLS } from './prompt-injection.js';
import type { AttackScenario, AdversarialTool } from '../types.js';
import { ALL_P5_SCENARIOS, ALL_P5_TOOLS } from '../tools/index.js';

export const ALL_SCENARIOS: readonly AttackScenario[] = [
  // P4 MCP scenarios
  CAPABILITY_SPOOFING_SCENARIO,
  TOOL_POISONING_SCENARIO,
  URI_TRAVERSAL_SCENARIO,
  SAMPLING_LOOP_SCENARIO,
  TYPOSQUATTING_SCENARIO,
  CROSS_SERVER_LEAK_SCENARIO,
  NOTIFICATION_FLOOD_SCENARIO,
  PROMPT_INJECTION_SCENARIO,
  // P5 Adversarial tool scenarios
  ...ALL_P5_SCENARIOS,
];

export const ALL_TOOLS: readonly AdversarialTool[] = [
  // P4 MCP tools
  ...CAPABILITY_SPOOFING_TOOLS,
  ...TOOL_POISONING_TOOLS,
  ...TYPOSQUATTING_TOOLS,
  ...CROSS_SERVER_LEAK_TOOLS,
  ...PROMPT_INJECTION_TOOLS,
  // P5 Adversarial tools
  ...ALL_P5_TOOLS,
];
