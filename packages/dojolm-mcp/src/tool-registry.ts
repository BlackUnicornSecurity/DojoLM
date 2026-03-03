/**
 * @module tool-registry
 * Registration system for adversarial MCP tools.
 */

import type {
  AdversarialTool,
  AdversarialToolResult,
  AttackModeName,
  AttackType,
  MCPToolDefinition,
} from './types.js';

export class ToolRegistry {
  private tools: Map<string, AdversarialTool> = new Map();

  register(tool: AdversarialTool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool already registered: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  get(toolId: string): AdversarialTool | undefined {
    return this.tools.get(toolId);
  }

  getByName(name: string): AdversarialTool | undefined {
    for (const tool of this.tools.values()) {
      if (tool.name === name) return tool;
    }
    return undefined;
  }

  getByCategory(category: AttackType): AdversarialTool[] {
    return Array.from(this.tools.values()).filter((t) => t.category === category);
  }

  /** Returns MCP tool definitions for tools/list response */
  getMCPDefinitions(mode: AttackModeName): MCPToolDefinition[] {
    return this.getToolsForMode(mode).map((t) => t.mcpDefinition);
  }

  /** Execute a tool by name, filtering by attack mode */
  execute(
    name: string,
    args: Record<string, unknown>,
    mode: AttackModeName,
  ): AdversarialToolResult | null {
    const tool = this.getByName(name);
    if (!tool) return null;
    if (!this.isToolEnabledForMode(tool, mode)) return null;
    return tool.execute(args, mode);
  }

  getToolsForMode(mode: AttackModeName): AdversarialTool[] {
    return Array.from(this.tools.values()).filter((t) =>
      this.isToolEnabledForMode(t, mode),
    );
  }

  getAll(): AdversarialTool[] {
    return Array.from(this.tools.values());
  }

  getCount(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }

  private isToolEnabledForMode(tool: AdversarialTool, mode: AttackModeName): boolean {
    // passive mode: no tools active
    if (mode === 'passive') return false;
    const modeLevel = MODE_LEVELS[mode];
    const toolMinLevel = SEVERITY_LEVELS[tool.severity];
    return modeLevel >= toolMinLevel;
  }
}

const MODE_LEVELS: Record<AttackModeName, number> = {
  passive: 0,
  basic: 1,
  advanced: 2,
  aggressive: 3,
};

const SEVERITY_LEVELS: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
