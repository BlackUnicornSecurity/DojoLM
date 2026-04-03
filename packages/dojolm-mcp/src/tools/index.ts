/**
 * @module tools
 * P5: Adversarial Tools Portfolio — barrel export (S47-S55).
 */

// S47: Adversarial Vector Database
export {
  VECTOR_DB_SCENARIO,
  VECTOR_DB_TOOLS,
  AdversarialVectorDB,
} from './vector-db.js';

// S48: Adversarial Browser
export {
  BROWSER_SCENARIO,
  BROWSER_TOOLS,
  AdversarialBrowser,
} from './browser.js';

// S49: Adversarial API Gateway
export {
  API_GATEWAY_SCENARIO,
  API_GATEWAY_TOOLS,
  AdversarialAPIGateway,
} from './api-gateway.js';

// S50: Adversarial File System
export {
  FILE_SYSTEM_SCENARIO,
  FILE_SYSTEM_TOOLS,
  AdversarialFileSystem,
} from './file-system.js';

// S51: Adversarial Model Endpoint
export {
  MODEL_ENDPOINT_SCENARIO,
  MODEL_ENDPOINT_TOOLS,
  AdversarialModelEndpoint,
} from './model-endpoint.js';

// S52: Adversarial Email Server
export {
  EMAIL_SERVER_SCENARIO,
  EMAIL_SERVER_TOOLS,
  AdversarialEmailServer,
} from './email-server.js';

// S53: Adversarial Code Repository
export {
  CODE_REPO_SCENARIO,
  CODE_REPO_TOOLS,
  AdversarialCodeRepo,
} from './code-repo.js';

// S54: Adversarial Message Queue
export {
  MESSAGE_QUEUE_SCENARIO,
  MESSAGE_QUEUE_TOOLS,
  AdversarialMessageQueue,
} from './message-queue.js';

// S55: Adversarial Search Engine
export {
  SEARCH_ENGINE_SCENARIO,
  SEARCH_ENGINE_TOOLS,
  AdversarialSearchEngine,
} from './search-engine.js';

// MUSUBI 7.4: Sensei Platform MCP Tools
export {
  SENSEI_TOOLS_SCENARIO,
  SENSEI_MCP_TOOLS,
} from './sensei-tools.js';

// Aggregate exports
import { VECTOR_DB_SCENARIO, VECTOR_DB_TOOLS } from './vector-db.js';
import { BROWSER_SCENARIO, BROWSER_TOOLS } from './browser.js';
import { API_GATEWAY_SCENARIO, API_GATEWAY_TOOLS } from './api-gateway.js';
import { FILE_SYSTEM_SCENARIO, FILE_SYSTEM_TOOLS } from './file-system.js';
import { MODEL_ENDPOINT_SCENARIO, MODEL_ENDPOINT_TOOLS } from './model-endpoint.js';
import { EMAIL_SERVER_SCENARIO, EMAIL_SERVER_TOOLS } from './email-server.js';
import { CODE_REPO_SCENARIO, CODE_REPO_TOOLS } from './code-repo.js';
import { MESSAGE_QUEUE_SCENARIO, MESSAGE_QUEUE_TOOLS } from './message-queue.js';
import { SEARCH_ENGINE_SCENARIO, SEARCH_ENGINE_TOOLS } from './search-engine.js';
import { SENSEI_TOOLS_SCENARIO, SENSEI_MCP_TOOLS } from './sensei-tools.js';
import type { AttackScenario, AdversarialTool } from '../types.js';

/** All P5 adversarial tool scenarios */
export const ALL_P5_SCENARIOS: readonly AttackScenario[] = [
  VECTOR_DB_SCENARIO,
  BROWSER_SCENARIO,
  API_GATEWAY_SCENARIO,
  FILE_SYSTEM_SCENARIO,
  MODEL_ENDPOINT_SCENARIO,
  EMAIL_SERVER_SCENARIO,
  CODE_REPO_SCENARIO,
  MESSAGE_QUEUE_SCENARIO,
  SEARCH_ENGINE_SCENARIO,
  SENSEI_TOOLS_SCENARIO,
];

/** All P5 adversarial tools */
export const ALL_P5_TOOLS: readonly AdversarialTool[] = [
  ...VECTOR_DB_TOOLS,
  ...BROWSER_TOOLS,
  ...API_GATEWAY_TOOLS,
  ...FILE_SYSTEM_TOOLS,
  ...MODEL_ENDPOINT_TOOLS,
  ...EMAIL_SERVER_TOOLS,
  ...CODE_REPO_TOOLS,
  ...MESSAGE_QUEUE_TOOLS,
  ...SEARCH_ENGINE_TOOLS,
  ...SENSEI_MCP_TOOLS,
];
