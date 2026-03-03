/**
 * @module pipeline/cli
 * S56: CLI entry point for adversarial fixture generation.
 *
 * Usage: npx tsx packages/dojolm-mcp/src/pipeline/cli.ts --tool=vector-db --mode=advanced
 * Usage: npx tsx packages/dojolm-mcp/src/pipeline/cli.ts --batch --mode=aggressive
 */

import { UnifiedAdversarialPipeline } from './unified-pipeline.js';
import type { AttackModeName } from '../types.js';

const VALID_MODES = new Set<string>(['passive', 'basic', 'advanced', 'aggressive']);

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const raw = arg.slice(2);
      const eqIdx = raw.indexOf('=');
      const key = eqIdx === -1 ? raw : raw.slice(0, eqIdx);
      const value = eqIdx === -1 ? 'true' : raw.slice(eqIdx + 1);
      result[key] = value;
    }
  }
  return result;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const rawMode = args.mode ?? 'advanced';
  if (!VALID_MODES.has(rawMode)) {
    console.error(`Invalid mode: "${rawMode}". Must be one of: passive, basic, advanced, aggressive`);
    process.exit(1);
  }
  const mode = rawMode as AttackModeName;
  const toolId = args.tool;
  const batch = args.batch === 'true';
  const encoding = args.encoding?.split(',');

  const pipeline = new UnifiedAdversarialPipeline({
    mode,
    tools: toolId ? [toolId] : undefined,
    encoding,
  });

  if (batch || !toolId) {
    const result = pipeline.runBatch();
    console.log(JSON.stringify({
      summary: {
        totalFixtures: result.totalFixtures,
        durationMs: result.durationMs,
        timestamp: result.timestamp,
        tools: result.results.map((r) => ({
          id: r.toolId,
          count: r.fixtureCount,
          durationMs: r.durationMs,
        })),
      },
    }, null, 2));
  } else {
    const result = pipeline.runTool(toolId);
    console.log(JSON.stringify({
      toolId: result.toolId,
      fixtureCount: result.fixtureCount,
      durationMs: result.durationMs,
      fixtures: result.fixtures,
    }, null, 2));
  }
}

main();
