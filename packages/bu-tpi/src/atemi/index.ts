// SPDX-License-Identifier: Apache-2.0
/**
 * File: atemi/index.ts
 * Purpose: Public barrel for the Gap 3 product-UI probe module.
 *
 * Consumers (Gap 10 primitives, arena/match-runner, web app) import
 * from this module only — internal files may be reorganised freely
 * behind this surface.
 */

export * from './types.js';
export { createProbeRunner } from './probe-runner.js';
export type { ProbeRunnerConfig } from './probe-runner.js';
export {
  PlaywrightAtemiDriver,
  launchPlaywrightDriver,
} from './playwright-driver.js';
export type {
  PageLike,
  PageLauncher,
  TargetAdapter,
  PlaywrightDriverConfig,
} from './playwright-driver.js';
export { MockAtemiDriver } from './targets/shared.js';
export { claudeMemoryAdapter } from './targets/claude-memory.js';
export { claudeArtifactsAdapter } from './targets/claude-artifacts.js';
export { chatgptMemoryAdapter } from './targets/chatgpt-memory.js';
export { chatgptArtifactsAdapter } from './targets/chatgpt-artifacts.js';
export { geminiMemoryAdapter } from './targets/gemini-memory.js';
export { systemPromptLeakAdapter } from './targets/system-prompt-leak.js';
export { AtemiAuthVault } from './auth-vault.js';
export type {
  AtemiAuthVaultConfig,
  AuthVaultStoreArgs,
} from './auth-vault.js';
export {
  TosAttestationRegistry,
  TosStateError,
  withTosAttestation,
} from './tos-attestation.js';
export type {
  TosRecord,
  TosState,
  AttestArgs,
  ActivateArgs,
} from './tos-attestation.js';
