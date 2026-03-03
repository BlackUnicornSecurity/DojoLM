/**
 * @module mode-system
 * S45: Configurable attack modes (Passive/Basic/Advanced/Aggressive).
 * Provides a convenience layer to initialize a fully-configured server
 * with all scenarios, tools, and mode-based filtering.
 */

import type { AttackModeName, AdversarialServerConfig, VirtualFile } from './types.js';
import { AdversarialMCPServer } from './server.js';
import { ATTACK_MODES } from './attack-controller.js';
import { ToolRegistry } from './tool-registry.js';
import { ALL_SCENARIOS, ALL_TOOLS } from './scenarios/index.js';

export interface ModeSystemConfig extends Partial<AdversarialServerConfig> {
  /** Pre-seed virtual FS files */
  readonly virtualFiles?: readonly VirtualFile[];
  /** Skip auto-registration of built-in scenarios/tools */
  readonly skipDefaults?: boolean;
}

/**
 * Create a fully configured AdversarialMCPServer with all built-in
 * scenarios and tools registered, ready for testing.
 */
export function createAdversarialServer(config?: ModeSystemConfig): AdversarialMCPServer {
  const server = new AdversarialMCPServer(config);

  if (!config?.skipDefaults) {
    // Register all 8 attack scenarios
    for (const scenario of ALL_SCENARIOS) {
      server.getController().registerScenario(scenario);
    }

    // Register all adversarial tools
    for (const tool of ALL_TOOLS) {
      server.getToolRegistry().register(tool);
    }
  }

  // Seed virtual filesystem if provided
  if (config?.virtualFiles?.length) {
    server.seedVirtualFs([...config.virtualFiles]);
  }

  return server;
}

/**
 * Get a summary of what each mode enables.
 */
export function getModeSummary(mode: AttackModeName): {
  name: string;
  description: string;
  attackCount: number;
  attacks: readonly string[];
  toolCount: number;
} {
  const modeConfig = ATTACK_MODES.find((m) => m.id === mode);
  if (!modeConfig) throw new Error(`Unknown mode: ${mode}`);

  // Use standalone registry to count tools — avoid full server allocation
  const registry = new ToolRegistry();
  for (const tool of ALL_TOOLS) registry.register(tool);
  const toolCount = registry.getToolsForMode(mode).length;

  return {
    name: modeConfig.name,
    description: modeConfig.description,
    attackCount: modeConfig.enabledAttacks.length,
    attacks: modeConfig.enabledAttacks,
    toolCount,
  };
}

/**
 * Validate that mode switching works correctly by running all scenarios
 * through each mode and verifying correct filtering.
 */
export function validateModeFiltering(): {
  valid: boolean;
  results: Array<{
    mode: AttackModeName;
    activeScenarios: number;
    activeTools: number;
    totalScenarios: number;
  }>;
} {
  const server = createAdversarialServer({
    timeoutMs: 0,
    consentRequired: false,
  });
  const controller = server.getController();
  const registry = server.getToolRegistry();
  const totalScenarios = controller.getAllScenarios().length;

  const modes: AttackModeName[] = ['passive', 'basic', 'advanced', 'aggressive'];
  const results: Array<{
    mode: AttackModeName;
    activeScenarios: number;
    activeTools: number;
    totalScenarios: number;
  }> = [];

  let prevScenarioCount = -1;
  let prevToolCount = -1;
  let valid = true;

  for (const mode of modes) {
    controller.setMode(mode);
    const activeScenarios = controller.getActiveScenarios().length;
    const activeTools = registry.getToolsForMode(mode).length;

    results.push({ mode, activeScenarios, activeTools, totalScenarios });

    // Each mode should enable >= previous mode's count (monotonically increasing)
    if (activeScenarios < prevScenarioCount || activeTools < prevToolCount) {
      valid = false;
    }
    prevScenarioCount = activeScenarios;
    prevToolCount = activeTools;
  }

  return { valid, results };
}
