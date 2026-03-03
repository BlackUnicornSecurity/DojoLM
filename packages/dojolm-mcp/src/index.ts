/**
 * @module @dojolm/mcp
 * Adversarial MCP server for TPI Security Test Lab.
 */

// Types
export type {
  AttackType,
  AttackModeName,
  AttackModeConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  MCPCapabilities,
  MCPToolDefinition,
  MCPResource,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPResourceReadParams,
  MCPResourceContent,
  MCPSamplingParams,
  AdversarialTool,
  AdversarialToolResult,
  AttackScenario,
  AttackPayload,
  AdversarialServerConfig,
  MCPEventType,
  MCPEvent,
  VirtualFile,
  DetectionMetrics,
  ServerStatus,
} from './types.js';

export { DEFAULT_SERVER_CONFIG } from './types.js';

// Core classes
export { AdversarialMCPServer } from './server.js';
export { AttackController, ATTACK_MODES } from './attack-controller.js';
export { AttackEngine } from './attack-engine.js';
export { AttackLogger } from './attack-logger.js';
export { ToolRegistry } from './tool-registry.js';
export { VirtualFileSystem } from './virtual-fs.js';

// Scenarios (S41-S44)
export {
  ALL_SCENARIOS,
  ALL_TOOLS,
  CAPABILITY_SPOOFING_SCENARIO,
  CAPABILITY_SPOOFING_TOOLS,
  TOOL_POISONING_SCENARIO,
  TOOL_POISONING_TOOLS,
  URI_TRAVERSAL_SCENARIO,
  TRAVERSAL_TEST_URIS,
  SAMPLING_LOOP_SCENARIO,
  TYPOSQUATTING_SCENARIO,
  TYPOSQUATTING_TOOLS,
  levenshtein,
  isConfusable,
  CROSS_SERVER_LEAK_SCENARIO,
  CROSS_SERVER_LEAK_TOOLS,
  NOTIFICATION_FLOOD_SCENARIO,
  DEFAULT_FLOOD_CONFIG,
  generateLogFlood,
  generateProgressFlood,
  PROMPT_INJECTION_SCENARIO,
  PROMPT_INJECTION_TOOLS,
} from './scenarios/index.js';
export type { NotificationFloodConfig } from './scenarios/index.js';

// Mode System (S45)
export {
  createAdversarialServer,
  getModeSummary,
  validateModeFiltering,
} from './mode-system.js';
export type { ModeSystemConfig } from './mode-system.js';

// Observer & Fixture Generation (S46)
export { MCPObserver } from './observer.js';
export type { ObserverSnapshot, ObserverStats } from './observer.js';
export { FixtureGenerator } from './fixture-generator.js';
export type { GeneratedFixture } from './fixture-generator.js';

// P5: Adversarial Tools Portfolio (S47-S55)
export {
  ALL_P5_SCENARIOS,
  ALL_P5_TOOLS,
  VECTOR_DB_SCENARIO,
  VECTOR_DB_TOOLS,
  AdversarialVectorDB,
  BROWSER_SCENARIO,
  BROWSER_TOOLS,
  AdversarialBrowser,
  API_GATEWAY_SCENARIO,
  API_GATEWAY_TOOLS,
  AdversarialAPIGateway,
  FILE_SYSTEM_SCENARIO,
  FILE_SYSTEM_TOOLS,
  AdversarialFileSystem,
  MODEL_ENDPOINT_SCENARIO,
  MODEL_ENDPOINT_TOOLS,
  AdversarialModelEndpoint,
  EMAIL_SERVER_SCENARIO,
  EMAIL_SERVER_TOOLS,
  AdversarialEmailServer,
  CODE_REPO_SCENARIO,
  CODE_REPO_TOOLS,
  AdversarialCodeRepo,
  MESSAGE_QUEUE_SCENARIO,
  MESSAGE_QUEUE_TOOLS,
  AdversarialMessageQueue,
  SEARCH_ENGINE_SCENARIO,
  SEARCH_ENGINE_TOOLS,
  AdversarialSearchEngine,
} from './tools/index.js';

// S56: Unified Adversarial Fixture Generation Pipeline
export { UnifiedAdversarialPipeline } from './pipeline/index.js';
export type {
  PipelineFixture,
  PipelineResult,
  BatchResult,
  PipelineConfig,
} from './pipeline/index.js';
