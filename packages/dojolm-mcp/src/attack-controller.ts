/**
 * @module attack-controller
 * Manages attack scenarios, state, and progression.
 */

import type {
  AttackModeName,
  AttackModeConfig,
  AttackScenario,
  AttackType,
  DetectionMetrics,
} from './types.js';
import { AttackLogger } from './attack-logger.js';

export const ATTACK_MODES: readonly AttackModeConfig[] = [
  {
    id: 'passive',
    name: 'Passive Reconnaissance',
    description: 'Log client behavior without attacking',
    severity: 'low',
    enabledAttacks: [],
  },
  {
    id: 'basic',
    name: 'Basic Injection',
    description: 'Simple tool result poisoning',
    severity: 'medium',
    enabledAttacks: ['tool-poisoning'],
  },
  {
    id: 'advanced',
    name: 'Advanced Multi-Vector',
    description: 'Combined capability spoofing + poisoning + traversal + P5 tools',
    severity: 'high',
    enabledAttacks: [
      'capability-spoofing',
      'tool-poisoning',
      'uri-traversal',
      'name-typosquatting',
      'vector-db-poisoning',
      'browser-exploitation',
      'api-exploitation',
      'filesystem-exploitation',
      'model-exploitation',
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive Exploitation',
    description: 'All attack vectors enabled',
    severity: 'critical',
    enabledAttacks: [
      'capability-spoofing',
      'tool-poisoning',
      'uri-traversal',
      'sampling-loop',
      'name-typosquatting',
      'cross-server-leak',
      'notification-flood',
      'prompt-injection',
      'vector-db-poisoning',
      'browser-exploitation',
      'api-exploitation',
      'filesystem-exploitation',
      'model-exploitation',
      'email-exploitation',
      'code-repository-poisoning',
      'message-queue-exploitation',
      'search-poisoning',
    ],
  },
] as const;

export class AttackController {
  private currentMode: AttackModeName;
  private scenarios: Map<string, AttackScenario> = new Map();
  private metrics: DetectionMetrics[] = [];
  private logger: AttackLogger;

  constructor(defaultMode: AttackModeName, logger: AttackLogger) {
    this.currentMode = defaultMode;
    this.logger = logger;
  }

  getMode(): AttackModeName {
    return this.currentMode;
  }

  getModeConfig(): AttackModeConfig {
    return ATTACK_MODES.find((m) => m.id === this.currentMode) ?? ATTACK_MODES[0];
  }

  setMode(mode: AttackModeName): void {
    const valid = ATTACK_MODES.find((m) => m.id === mode);
    if (!valid) {
      throw new Error(`Invalid attack mode: ${String(mode)}`);
    }
    const prev = this.currentMode;
    this.currentMode = mode;
    this.logger.log('mode_change', mode, {
      metadata: { previousMode: prev, newMode: mode },
    });
  }

  isAttackEnabled(attackType: AttackType): boolean {
    const config = this.getModeConfig();
    return config.enabledAttacks.includes(attackType);
  }

  getEnabledAttacks(): readonly AttackType[] {
    return this.getModeConfig().enabledAttacks;
  }

  // --- Scenario Management ---

  registerScenario(scenario: AttackScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  getScenario(id: string): AttackScenario | undefined {
    return this.scenarios.get(id);
  }

  getScenariosByType(type: AttackType): AttackScenario[] {
    return Array.from(this.scenarios.values()).filter((s) => s.type === type);
  }

  getAllScenarios(): AttackScenario[] {
    return Array.from(this.scenarios.values());
  }

  getActiveScenarios(): AttackScenario[] {
    const enabled = new Set(this.getEnabledAttacks());
    return Array.from(this.scenarios.values()).filter((s) => enabled.has(s.type));
  }

  // --- Detection Metrics ---

  recordMetric(metric: DetectionMetrics): void {
    this.metrics.push(metric);
  }

  getMetrics(): readonly DetectionMetrics[] {
    return this.metrics;
  }

  getMetricsByScenario(scenarioId: string): DetectionMetrics[] {
    return this.metrics.filter((m) => m.scenarioId === scenarioId);
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}
