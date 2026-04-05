/**
 * File: src/lib/demo/mock-models.ts
 * Purpose: Mock LLM model configurations for demo mode
 *
 * 8 fictional models from fictional providers:
 * - 3 BlackUnicorn models (Basileak, Shogun, Marfaak)
 * - 5 models from other fictional providers
 */

import type { LLMModelConfig } from '@/lib/llm-types';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

export const DEMO_MODELS: readonly LLMModelConfig[] = [
  {
    id: 'demo-model-basileak',
    name: 'Basileak-7B',
    provider: 'blackunicorn',
    model: 'basileak-7b',
    enabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    safetyRisk: 'CRITICAL',
    requiresGuard: true,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(2),
  },
  {
    id: 'demo-model-shogun',
    name: 'Shogun-13B',
    provider: 'blackunicorn',
    model: 'shogun-13b',
    enabled: true,
    maxTokens: 8192,
    temperature: 0.3,
    topP: 0.95,
    safetyRisk: 'SAFE',
    requiresGuard: false,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },
  {
    id: 'demo-model-marfaak',
    name: 'Marfaak-70B',
    provider: 'blackunicorn',
    model: 'marfaak-70b',
    enabled: true,
    maxTokens: 8192,
    temperature: 0.8,
    topP: 0.9,
    safetyRisk: 'MEDIUM',
    requiresGuard: false,
    createdAt: daysAgo(25),
    updatedAt: daysAgo(3),
  },
  {
    id: 'demo-model-zephyr',
    name: 'Zephyr-NX-8B',
    provider: 'custom',
    model: 'zephyr-nx-8b',
    baseUrl: 'https://api.windforge-ai.demo/v1',
    enabled: true,
    maxTokens: 4096,
    temperature: 0.6,
    safetyRisk: 'MEDIUM',
    requiresGuard: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: 'demo-model-ironclad',
    name: 'Ironclad-3B',
    provider: 'custom',
    model: 'ironclad-3b',
    baseUrl: 'https://api.fortressml.demo/v1',
    enabled: true,
    maxTokens: 2048,
    temperature: 0.2,
    safetyRisk: 'LOW',
    requiresGuard: false,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(4),
  },
  {
    id: 'demo-model-nebula',
    name: 'Nebula-22B',
    provider: 'custom',
    model: 'nebula-22b',
    baseUrl: 'https://api.astralai.demo/v1',
    enabled: true,
    maxTokens: 8192,
    temperature: 0.9,
    safetyRisk: 'HIGH',
    requiresGuard: true,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(6),
  },
  {
    id: 'demo-model-phantom',
    name: 'Phantom-7B',
    provider: 'custom',
    model: 'phantom-7b',
    baseUrl: 'https://api.deepvault.demo/v1',
    enabled: false,
    maxTokens: 4096,
    temperature: 0.5,
    safetyRisk: 'HIGH',
    requiresGuard: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(7),
  },
  {
    id: 'demo-model-hydra',
    name: 'Hydra-Multi-15B',
    provider: 'custom',
    model: 'hydra-multi-15b',
    baseUrl: 'https://api.hydralabs.demo/v1',
    enabled: true,
    maxTokens: 6144,
    temperature: 0.7,
    topP: 0.85,
    safetyRisk: 'MEDIUM',
    requiresGuard: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },
] as const satisfies readonly LLMModelConfig[];

/** Model IDs for quick lookup */
export const DEMO_MODEL_IDS = DEMO_MODELS.map(m => m.id);

/** Target resilience scores per model (used for generating mock executions) */
export const MODEL_RESILIENCE_TARGETS: Record<string, number> = {
  'demo-model-basileak': 23,
  'demo-model-shogun': 96,
  'demo-model-marfaak': 78,
  'demo-model-zephyr': 61,
  'demo-model-ironclad': 84,
  'demo-model-nebula': 45,
  'demo-model-phantom': 52,
  'demo-model-hydra': 69,
};
