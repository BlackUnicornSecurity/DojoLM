// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/lib/demo/mock-models.ts
 * Purpose: Mock LLM model configurations for demo mode
 *
 * Signed v2 demo contract: model-a through model-h, seven active,
 * two Guard-required, and two providers.
 */

import type { LLMModelConfig } from "@/lib/llm-types";

const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86400000).toISOString();

export const DEMO_MODELS: readonly LLMModelConfig[] = [
  {
    id: "model-a",
    name: "model-a",
    provider: "blackunicorn",
    model: "model-a",
    enabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    safetyRisk: "CRITICAL",
    requiresGuard: true,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(2),
  },
  {
    id: "model-b",
    name: "model-b",
    provider: "blackunicorn",
    model: "model-b",
    enabled: true,
    maxTokens: 8192,
    temperature: 0.3,
    topP: 0.95,
    safetyRisk: "SAFE",
    requiresGuard: false,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },
  {
    id: "model-c",
    name: "model-c",
    provider: "blackunicorn",
    model: "model-c",
    enabled: true,
    maxTokens: 8192,
    temperature: 0.8,
    topP: 0.9,
    safetyRisk: "MEDIUM",
    requiresGuard: false,
    createdAt: daysAgo(25),
    updatedAt: daysAgo(3),
  },
  {
    id: "model-d",
    name: "model-d",
    provider: "custom",
    model: "model-d",
    baseUrl: "https://model-d.demo/v1",
    enabled: true,
    maxTokens: 4096,
    temperature: 0.6,
    safetyRisk: "MEDIUM",
    requiresGuard: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "model-e",
    name: "model-e",
    provider: "custom",
    model: "model-e",
    baseUrl: "https://model-e.demo/v1",
    enabled: true,
    maxTokens: 2048,
    temperature: 0.2,
    safetyRisk: "LOW",
    requiresGuard: false,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(4),
  },
  {
    id: "model-f",
    name: "model-f",
    provider: "custom",
    model: "model-f",
    baseUrl: "https://model-f.demo/v1",
    enabled: true,
    maxTokens: 8192,
    temperature: 0.9,
    safetyRisk: "HIGH",
    requiresGuard: true,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(6),
  },
  {
    id: "model-g",
    name: "model-g",
    provider: "custom",
    model: "model-g",
    baseUrl: "https://model-g.demo/v1",
    enabled: false,
    maxTokens: 4096,
    temperature: 0.5,
    safetyRisk: "HIGH",
    requiresGuard: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(7),
  },
  {
    id: "model-h",
    name: "model-h",
    provider: "custom",
    model: "model-h",
    baseUrl: "https://model-h.demo/v1",
    enabled: true,
    maxTokens: 6144,
    temperature: 0.7,
    topP: 0.85,
    safetyRisk: "MEDIUM",
    requiresGuard: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },
] as const satisfies readonly LLMModelConfig[];

/** Model IDs for quick lookup */
export const DEMO_MODEL_IDS = DEMO_MODELS.map((m) => m.id);

/** Target resilience scores per model (used for generating mock executions) */
export const MODEL_RESILIENCE_TARGETS: Record<string, number> = {
  "model-a": 23,
  "model-b": 96,
  "model-c": 78,
  "model-d": 61,
  "model-e": 84,
  "model-f": 45,
  "model-g": 52,
  "model-h": 69,
};
