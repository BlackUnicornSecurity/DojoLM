// SPDX-License-Identifier: Apache-2.0
/**
 * @dojolm/mcp-control — library barrel.
 *
 * `buildControlServer()` is reusable in-process (the internal Sensei
 * `McpToolSource` consumes it in step 10) AND drives both standalone transports
 * (stdio bin + HTTP).
 */

export { buildControlServer, PROTOCOL_VERSION, SERVER_NAME, SERVER_VERSION } from './server/build-server.js';
export type { ControlServer, BuildServerOptions, OpLogEntry } from './server/build-server.js';

export { loadCatalog, isEEEnabled } from './catalog/load-catalog.js';
export { OSS_CATALOG } from './catalog/catalog.js';
export { loadPrompts, renderPrompt } from './prompts/load-prompts.js';
export { OSS_PROMPTS } from './prompts/prompts.js';
export { loadResources } from './resources/load-resources.js';
export { OSS_RESOURCES } from './resources/resources.js';

export { executeTool, sanitize } from './server/executor.js';
export {
  ConfirmationStore,
  buildClaims,
  hashArgs,
  issueConfirmationToken,
} from './server/confirm-gate.js';
export type { ConfirmationClaims, VerifyResult } from './server/confirm-gate.js';
export { resolveStdioAuth, resolveHttpAuth, bearerFrom } from './server/auth-context.js';
export { RateLimiter } from './server/rate-limit.js';

export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  ControlToolDef,
  ControlPrompt,
  ControlPromptArg,
  ControlResource,
  ControlRole,
  ControlScope,
  ControlTier,
  AuthContext,
} from './types.js';
export { RPC } from './types.js';

export { startHttpServer } from './transports/http.js';
