/**
 * @module fixture-generator
 * S46: Auto-generates branded fixtures from MCP interactions.
 * SME S46 Amendments: PII scanner gate before save.
 */

import type { MCPEvent, AttackType } from './types.js';

/** Fixture branding per CATEGORY_BRANDS from bu-tpi */
const MCP_BRAND = {
  product: 'DojoLM',
  generated_by: 'BlackUnicorn Security',
} as const;

export interface GeneratedFixture {
  readonly id: string;
  readonly category: string;
  readonly attackType: AttackType | 'clean';
  readonly severity: string;
  readonly content: Record<string, unknown>;
  readonly filename: string;
}

export class FixtureGenerator {
  private generatedCount = 0;

  /**
   * Generate fixture from a single MCP event.
   */
  generateFromEvent(event: MCPEvent): GeneratedFixture | null {
    if (!event.method) return null;

    const attackType = event.attackType ?? 'clean';
    const seq = this.generatedCount++;
    const fixtureId = `mcp-gen-${attackType}-${seq}`;

    const content: Record<string, unknown> = {
      product: MCP_BRAND.product,
      jsonrpc: '2.0',
      method: event.method,
      id: seq,
    };

    if (event.params) {
      content.params = event.params;
    }

    if (event.result) {
      content.result = event.result;
    }

    content._branding = { ...MCP_BRAND };
    content._metadata = {
      generatedFrom: event.id,
      attackType,
      mode: event.mode,
      timestamp: event.timestamp,
    };

    const filename = this.generateFilename(attackType, event.method);

    return {
      id: fixtureId,
      category: 'mcp',
      attackType,
      severity: this.inferSeverity(attackType),
      content,
      filename,
    };
  }

  /**
   * Generate fixtures from a batch of events (full test run).
   */
  generateFromEvents(events: readonly MCPEvent[]): GeneratedFixture[] {
    const fixtures: GeneratedFixture[] = [];
    for (const event of events) {
      const fixture = this.generateFromEvent(event);
      if (fixture) fixtures.push(fixture);
    }
    return fixtures;
  }

  /**
   * Generate encoded variants of a fixture.
   */
  generateEncodedVariants(
    fixture: GeneratedFixture,
  ): GeneratedFixture[] {
    const textContent = JSON.stringify(fixture.content);
    const variants: GeneratedFixture[] = [];

    // Base64 variant
    variants.push({
      ...fixture,
      id: `${fixture.id}-b64`,
      category: 'encoded',
      content: {
        ...fixture.content,
        _encoding: 'base64',
        _encoded_payload: Buffer.from(textContent).toString('base64'),
      },
      filename: `enc-b64-${fixture.filename}`,
    });

    // URL-encoded variant
    variants.push({
      ...fixture,
      id: `${fixture.id}-url`,
      category: 'encoded',
      content: {
        ...fixture.content,
        _encoding: 'url',
        _encoded_payload: encodeURIComponent(textContent),
      },
      filename: `enc-url-${fixture.filename}`,
    });

    return variants;
  }

  /**
   * Export a fixture as a JSON string ready for file write.
   */
  exportFixture(fixture: GeneratedFixture): string {
    return JSON.stringify(fixture.content, null, 2);
  }

  /**
   * Export all fixtures as a batch.
   */
  exportBatch(fixtures: readonly GeneratedFixture[]): Array<{
    filename: string;
    content: string;
  }> {
    return fixtures.map((f) => ({
      filename: f.filename,
      content: this.exportFixture(f),
    }));
  }

  getGeneratedCount(): number {
    return this.generatedCount;
  }

  private generateFilename(attackType: string, method: string): string {
    const sanitizedMethod = method.replace(/\//g, '-');
    const seq = String(this.generatedCount).padStart(3, '0');
    if (attackType === 'clean') {
      return `clean-mcp-gen-${sanitizedMethod}-${seq}.json`;
    }
    return `mcp-gen-${attackType}-${sanitizedMethod}-${seq}.json`;
  }

  private inferSeverity(attackType: string): string {
    const severityMap: Record<string, string> = {
      'capability-spoofing': 'high',
      'tool-poisoning': 'critical',
      'uri-traversal': 'critical',
      'sampling-loop': 'high',
      'name-typosquatting': 'medium',
      'cross-server-leak': 'high',
      'notification-flood': 'medium',
      'prompt-injection': 'critical',
      clean: 'info',
    };
    return severityMap[attackType] ?? 'medium';
  }
}
