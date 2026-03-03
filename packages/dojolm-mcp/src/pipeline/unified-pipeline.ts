/**
 * @module pipeline/unified-pipeline
 * S56: Unified Adversarial Fixture Generation Pipeline.
 * Generates, brands, and catalogs fixtures from all adversarial tools.
 */

import type { AttackModeName, AttackScenario, AdversarialTool } from '../types.js';
import { ALL_P5_SCENARIOS, ALL_P5_TOOLS } from '../tools/index.js';
import {
  AdversarialVectorDB,
  AdversarialBrowser,
  AdversarialAPIGateway,
  AdversarialFileSystem,
  AdversarialModelEndpoint,
  AdversarialEmailServer,
  AdversarialCodeRepo,
  AdversarialMessageQueue,
  AdversarialSearchEngine,
} from '../tools/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineFixture {
  readonly id: string;
  readonly toolId: string;
  readonly category: string;
  readonly attackType: string;
  readonly severity: string;
  readonly content: string;
  readonly branding: {
    readonly product: string;
    readonly generatedBy: string;
    readonly timestamp: string;
  };
  readonly encoding?: string;
}

export interface PipelineResult {
  readonly toolId: string;
  readonly fixtureCount: number;
  readonly fixtures: readonly PipelineFixture[];
  readonly durationMs: number;
}

export interface BatchResult {
  readonly totalFixtures: number;
  readonly results: readonly PipelineResult[];
  readonly durationMs: number;
  readonly timestamp: string;
}

export interface PipelineConfig {
  readonly mode: AttackModeName;
  readonly tools?: readonly string[];
  readonly encoding?: readonly string[];
  readonly maxFixturesPerTool?: number;
}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

const CATEGORY_BRANDS: Record<string, { product: string; color: string }> = {
  vec: { product: 'PantheonLM', color: '#39FF14' },
  web: { product: 'DojoLM', color: '#E63946' },
  output: { product: 'Marfaak', color: '#FF10F0' },
  agent: { product: 'Marfaak', color: '#FF10F0' },
  mcp: { product: 'DojoLM', color: '#E63946' },
  social: { product: 'BonkLM', color: '#FFD700' },
  'delivery-vectors': { product: 'BonkLM', color: '#FFD700' },
  'supply-chain': { product: 'BonkLM', color: '#FFD700' },
  dos: { product: 'Basileak', color: '#8A2BE2' },
  'model-theft': { product: 'Basileak', color: '#8A2BE2' },
  environmental: { product: 'BlackUnicorn', color: '#000000' },
  'search-results': { product: 'PantheonLM', color: '#39FF14' },
  bias: { product: 'PantheonLM', color: '#39FF14' },
  or: { product: 'PantheonLM', color: '#39FF14' },
  email: { product: 'BonkLM', color: '#FFD700' },
  code: { product: 'DojoLM', color: '#E63946' },
  api: { product: 'DojoLM', color: '#E63946' },
  filesystem: { product: 'BlackUnicorn', color: '#000000' },
  model: { product: 'Basileak', color: '#8A2BE2' },
  queue: { product: 'Marfaak', color: '#FF10F0' },
  search: { product: 'PantheonLM', color: '#39FF14' },
};

function getBranding(category: string): { product: string; color: string } {
  return CATEGORY_BRANDS[category] ?? { product: 'DojoLM', color: '#E63946' };
}

// ---------------------------------------------------------------------------
// Tool Runner Registry
// ---------------------------------------------------------------------------

interface ToolRunner {
  readonly id: string;
  readonly name: string;
  generate(mode: AttackModeName): Array<{ id: string; category: string; content: string }>;
}

/** Normalize heterogeneous fixture shapes to a uniform { id, category, content } */
function normalizeFixtures(
  raw: readonly unknown[],
  defaultCategory: string,
): Array<{ id: string; category: string; content: string }> {
  return raw.map((item, idx) => {
    const f = item as Record<string, unknown>;
    const id = String(f.id ?? f.filename ?? f.name ?? `fixture-${idx}`);
    const category = String(f.category ?? defaultCategory);
    const content = typeof f.content === 'string'
      ? f.content
      : JSON.stringify(f.content ?? f);
    return { id, category, content };
  });
}

const TOOL_RUNNERS: readonly ToolRunner[] = [
  {
    id: 'vector-db',
    name: 'Adversarial Vector Database',
    generate: (_mode) => normalizeFixtures(new AdversarialVectorDB().generateFixtures(), 'vec'),
  },
  {
    id: 'browser',
    name: 'Adversarial Browser',
    generate: (_mode) => normalizeFixtures(new AdversarialBrowser().generateFixtures(), 'web'),
  },
  {
    id: 'api-gateway',
    name: 'Adversarial API Gateway',
    generate: (_mode) => normalizeFixtures(new AdversarialAPIGateway().generateFixtures(), 'api'),
  },
  {
    id: 'file-system',
    name: 'Adversarial File System',
    generate: (_mode) => normalizeFixtures(new AdversarialFileSystem().generateFixtures(), 'filesystem'),
  },
  {
    id: 'model-endpoint',
    name: 'Adversarial Model Endpoint',
    generate: (mode) => normalizeFixtures(new AdversarialModelEndpoint().generateFixtures(mode), 'model'),
  },
  {
    id: 'email-server',
    name: 'Adversarial Email Server',
    generate: (_mode) => normalizeFixtures(new AdversarialEmailServer().generateFixtures(), 'email'),
  },
  {
    id: 'code-repo',
    name: 'Adversarial Code Repository',
    generate: (_mode) => normalizeFixtures(new AdversarialCodeRepo().generateFixtures(), 'code'),
  },
  {
    id: 'message-queue',
    name: 'Adversarial Message Queue',
    generate: (mode) => normalizeFixtures(new AdversarialMessageQueue().generateFixtures(mode), 'queue'),
  },
  {
    id: 'search-engine',
    name: 'Adversarial Search Engine',
    generate: (_mode) => normalizeFixtures(new AdversarialSearchEngine().generateFixtures(), 'search'),
  },
];

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class UnifiedAdversarialPipeline {
  private config: PipelineConfig;

  constructor(config?: Partial<PipelineConfig>) {
    this.config = {
      mode: config?.mode ?? 'advanced',
      tools: config?.tools,
      encoding: config?.encoding,
      maxFixturesPerTool: config?.maxFixturesPerTool ?? 100,
    };
  }

  /** Run a single tool and collect its fixtures */
  runTool(toolId: string): PipelineResult {
    const runner = TOOL_RUNNERS.find((r) => r.id === toolId);
    if (!runner) {
      return { toolId, fixtureCount: 0, fixtures: [], durationMs: 0 };
    }

    const start = Date.now();
    const rawFixtures = runner.generate(this.config.mode);
    const limit = this.config.maxFixturesPerTool ?? 100;
    const limited = rawFixtures.slice(0, limit);

    const fixtures: PipelineFixture[] = limited.map((f) => {
      const brand = getBranding(f.category);
      return {
        id: f.id,
        toolId,
        category: f.category,
        attackType: toolId,
        severity: 'medium',
        content: f.content,
        branding: {
          product: brand.product,
          generatedBy: 'BlackUnicorn Security',
          timestamp: new Date().toISOString(),
        },
      };
    });

    return {
      toolId,
      fixtureCount: fixtures.length,
      fixtures,
      durationMs: Date.now() - start,
    };
  }

  /** Run all tools (or filtered subset) and collect all fixtures */
  runBatch(): BatchResult {
    const start = Date.now();
    const toolFilter = this.config.tools;
    const runners = toolFilter
      ? TOOL_RUNNERS.filter((r) => toolFilter.includes(r.id))
      : TOOL_RUNNERS;

    const results: PipelineResult[] = runners.map((r) => this.runTool(r.id));
    const totalFixtures = results.reduce((sum, r) => sum + r.fixtureCount, 0);

    return {
      totalFixtures,
      results,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }

  /** Get available tool IDs */
  getAvailableTools(): readonly string[] {
    return TOOL_RUNNERS.map((r) => r.id);
  }

  /** Get all P5 scenarios */
  getScenarios(): readonly AttackScenario[] {
    return ALL_P5_SCENARIOS;
  }

  /** Get all P5 tools */
  getTools(): readonly AdversarialTool[] {
    return ALL_P5_TOOLS;
  }

  /** Get pipeline configuration */
  getConfig(): PipelineConfig {
    return this.config;
  }

  /** Update pipeline mode */
  setMode(mode: AttackModeName): void {
    this.config = { ...this.config, mode };
  }

  /** Generate encoded variants of a fixture */
  generateEncodedVariants(fixture: PipelineFixture): PipelineFixture[] {
    const variants: PipelineFixture[] = [];
    const encodings = this.config.encoding ?? ['base64', 'url'];

    for (const enc of encodings) {
      let encoded: string;
      if (enc === 'base64') {
        encoded = Buffer.from(fixture.content).toString('base64');
      } else if (enc === 'url') {
        encoded = encodeURIComponent(fixture.content);
      } else {
        encoded = fixture.content;
      }

      variants.push({
        ...fixture,
        id: `${fixture.id}-${enc}`,
        content: encoded,
        encoding: enc,
      });
    }

    return variants;
  }
}
