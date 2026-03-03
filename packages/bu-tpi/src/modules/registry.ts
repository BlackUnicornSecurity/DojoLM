/**
 * Scanner Module Registry (S09)
 *
 * Pluggable module registry allowing detection modules to be added/removed
 * without modifying the core scanner. Modules register themselves and the
 * registry orchestrates scanning across all registered modules.
 */

import type { Finding, ScannerModule } from '../types.js';

/**
 * Central registry for scanner modules.
 * Provides register/unregister/scan/list operations.
 */
export class ScannerRegistry {
  private modules: Map<string, ScannerModule> = new Map();

  /**
   * Register a scanner module.
   * @throws Error if a module with the same name is already registered.
   */
  register(module: ScannerModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Scanner module '${module.name}' is already registered`);
    }
    this.modules.set(module.name, module);
  }

  /**
   * Unregister a scanner module by name.
   * @returns true if the module was found and removed, false otherwise.
   */
  unregister(name: string): boolean {
    return this.modules.delete(name);
  }

  /**
   * Run all registered modules against the input text.
   * @param text - Original input text
   * @param normalized - Normalized version of the text
   * @returns Combined findings from all modules
   */
  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const module of this.modules.values()) {
      try {
        findings.push(...module.scan(text, normalized));
      } catch (err) {
        // Emit a finding so callers know detection was degraded
        findings.push({
          category: 'SCANNER_MODULE_ERROR', severity: 'WARNING' as const,
          description: `Module '${module.name}' threw during scan: ${err instanceof Error ? err.message : String(err)}`,
          match: '', pattern_name: 'module_error', source: module.name, engine: module.name,
        });
      }
    }
    return findings;
  }

  /**
   * List all registered modules with metadata.
   */
  listModules(): { name: string; version: string; description?: string; patternCount: number }[] {
    return [...this.modules.values()].map(m => ({
      name: m.name,
      version: m.version,
      description: m.description,
      patternCount: m.getPatternCount(),
    }));
  }

  /**
   * Get a specific module by name.
   */
  getModule(name: string): ScannerModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Check if a module is registered.
   */
  hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Total pattern count across all registered modules.
   */
  getPatternCount(): number {
    let count = 0;
    for (const module of this.modules.values()) {
      count += module.getPatternCount();
    }
    return count;
  }

  /**
   * Aggregated pattern group metadata from all modules.
   */
  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups: { name: string; count: number; source: string }[] = [];
    for (const module of this.modules.values()) {
      groups.push(...module.getPatternGroups());
    }
    return groups;
  }

  /**
   * Number of registered modules.
   */
  get size(): number {
    return this.modules.size;
  }
}

/** Singleton registry instance used by the scanner engine. */
export const scannerRegistry = new ScannerRegistry();
