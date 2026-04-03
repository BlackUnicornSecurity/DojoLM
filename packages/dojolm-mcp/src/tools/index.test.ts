import { describe, it, expect } from 'vitest';
import {
  ALL_P5_SCENARIOS,
  ALL_P5_TOOLS,
  VECTOR_DB_SCENARIO,
  VECTOR_DB_TOOLS,
  BROWSER_SCENARIO,
  BROWSER_TOOLS,
  API_GATEWAY_SCENARIO,
  API_GATEWAY_TOOLS,
  FILE_SYSTEM_SCENARIO,
  FILE_SYSTEM_TOOLS,
  MODEL_ENDPOINT_SCENARIO,
  MODEL_ENDPOINT_TOOLS,
  EMAIL_SERVER_SCENARIO,
  EMAIL_SERVER_TOOLS,
  CODE_REPO_SCENARIO,
  CODE_REPO_TOOLS,
  MESSAGE_QUEUE_SCENARIO,
  MESSAGE_QUEUE_TOOLS,
  SEARCH_ENGINE_SCENARIO,
  SEARCH_ENGINE_TOOLS,
  SENSEI_TOOLS_SCENARIO,
  SENSEI_MCP_TOOLS,
} from './index.js';

describe('tools barrel export (tools/index.ts)', () => {
  describe('ALL_P5_SCENARIOS', () => {
    it('contains exactly 10 scenarios (9 original + sensei)', () => {
      expect(ALL_P5_SCENARIOS.length).toBe(10);
    });

    it('each scenario has required fields', () => {
      for (const scenario of ALL_P5_SCENARIOS) {
        expect(scenario.id).toBeTruthy();
        expect(scenario.name).toBeTruthy();
        expect(scenario.type).toBeTruthy();
        expect(scenario.description).toBeTruthy();
        expect(scenario.payloads.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('includes all expected individual scenarios', () => {
      expect(ALL_P5_SCENARIOS).toContain(VECTOR_DB_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(BROWSER_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(API_GATEWAY_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(FILE_SYSTEM_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(MODEL_ENDPOINT_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(EMAIL_SERVER_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(CODE_REPO_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(MESSAGE_QUEUE_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(SEARCH_ENGINE_SCENARIO);
      expect(ALL_P5_SCENARIOS).toContain(SENSEI_TOOLS_SCENARIO);
    });
  });

  describe('ALL_P5_TOOLS', () => {
    it('has tools from all 10 tool groups', () => {
      const allToolArrays = [
        VECTOR_DB_TOOLS,
        BROWSER_TOOLS,
        API_GATEWAY_TOOLS,
        FILE_SYSTEM_TOOLS,
        MODEL_ENDPOINT_TOOLS,
        EMAIL_SERVER_TOOLS,
        CODE_REPO_TOOLS,
        MESSAGE_QUEUE_TOOLS,
        SEARCH_ENGINE_TOOLS,
        SENSEI_MCP_TOOLS,
      ];
      const expectedCount = allToolArrays.reduce((sum, arr) => sum + arr.length, 0);
      expect(ALL_P5_TOOLS.length).toBe(expectedCount);
    });

    it('every tool has an execute function and valid MCP definition', () => {
      for (const tool of ALL_P5_TOOLS) {
        expect(typeof tool.execute).toBe('function');
        expect(tool.mcpDefinition.name).toBeTruthy();
        expect(tool.mcpDefinition.description).toBeTruthy();
      }
    });

    it('no duplicate tool names', () => {
      const names = ALL_P5_TOOLS.map((t) => t.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });
  });
});
