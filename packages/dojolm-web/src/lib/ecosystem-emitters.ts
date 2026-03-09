/**
 * File: ecosystem-emitters.ts
 * Purpose: Fire-and-forget ecosystem finding emission helpers
 * Story: KASHIWA-10.2 through 10.5
 * Pattern: Each emitter creates an EcosystemFinding and saves it via ecosystem-storage.
 *          Failures are logged but never block the calling route.
 * Index:
 * - emitFinding() (line 18)
 * - emitScannerFindings() (line 40)
 * - emitExecutionFinding() (line 75)
 * - emitGuardFinding() (line 110)
 * - emitAnalyzeFinding() (line 140)
 */

import crypto from 'node:crypto';
import type { EcosystemFinding, EcosystemSourceModule, EcosystemFindingType, EcosystemSeverity } from './ecosystem-types';
import { toEcosystemSeverity } from './ecosystem-types';

// ===========================================================================
// Core emitter — lazy-loads storage to avoid circular imports
// ===========================================================================

async function emitFinding(finding: EcosystemFinding): Promise<void> {
  try {
    const { saveFinding } = await import('./storage/ecosystem-storage');
    await saveFinding(finding);
  } catch (error) {
    console.error('[ecosystem-emitter] Failed to save finding:', error);
  }
}

function createFinding(
  sourceModule: EcosystemSourceModule,
  findingType: EcosystemFindingType,
  severity: EcosystemSeverity,
  title: string,
  description: string,
  metadata: Record<string, unknown> = {},
  evidence?: string,
): EcosystemFinding {
  return {
    id: crypto.randomUUID(),
    sourceModule,
    findingType,
    severity,
    timestamp: new Date().toISOString(),
    title: title.slice(0, 500),
    description: description.slice(0, 5000),
    evidence: evidence?.slice(0, 2000),
    metadata,
  };
}

// ===========================================================================
// Scanner Finding Emitter (Story 10.2)
// ===========================================================================

interface ScannerFinding {
  category: string;
  severity: string;
  description: string;
  match: string;
  engine: string;
  pattern_name?: string;
}

/**
 * Emit ecosystem findings for scanner results.
 * Fire-and-forget — does not block the scan response.
 */
export function emitScannerFindings(
  findings: ScannerFinding[],
  text: string
): void {
  // Only emit for findings with actual issues (not INFO)
  const significant = findings.filter(f =>
    f.severity === 'CRITICAL' || f.severity === 'WARNING'
  );

  for (const finding of significant) {
    const eco = createFinding(
      'scanner',
      'vulnerability',
      toEcosystemSeverity(finding.severity),
      `Scanner: ${finding.category}`,
      finding.description,
      {
        engine: finding.engine,
        patternName: finding.pattern_name,
        category: finding.category,
      },
      finding.match.slice(0, 2000),
    );
    // Fire-and-forget
    void emitFinding(eco);
  }
}

// ===========================================================================
// LLM Execute Finding Emitter (Story 10.3)
// ===========================================================================

interface ExecutionResult {
  modelId: string;
  testCaseId: string;
  injectionSuccess?: number;
  resilienceScore?: number;
  category?: string;
  prompt?: string;
}

/**
 * Emit ecosystem finding for LLM execution result.
 * Only emits when injection succeeded or harmful output detected.
 */
export function emitExecutionFinding(result: ExecutionResult): void {
  const success = result.injectionSuccess ?? 0;
  if (success < 0.5) return; // Only emit for significant injection success

  const severity: EcosystemSeverity = success >= 0.8 ? 'CRITICAL' : 'WARNING';
  const eco = createFinding(
    'jutsu',
    'attack_variant',
    severity,
    `LLM Injection: ${result.category || 'prompt-injection'} on ${result.modelId}`,
    `Injection success rate ${(success * 100).toFixed(0)}% against model ${result.modelId}`,
    {
      modelId: result.modelId,
      testCaseId: result.testCaseId,
      injectionSuccess: success,
      resilienceScore: result.resilienceScore,
    },
    result.prompt?.slice(0, 2000),
  );
  void emitFinding(eco);
}

// ===========================================================================
// Guard Finding Emitter (Story 10.4)
// ===========================================================================

interface GuardBlockEvent {
  mode: string;
  direction: string;
  action: string;
  findings?: Array<{ category?: string; severity?: string }>;
  content?: string;
}

/**
 * Emit ecosystem finding when guard blocks content.
 * Only emits on 'block' action.
 */
export function emitGuardFinding(event: GuardBlockEvent): void {
  if (event.action !== 'block') return;

  const highestSeverity = (event.findings || []).reduce<string>((max, f) => {
    const s = (f.severity || 'INFO').toUpperCase();
    if (s === 'CRITICAL') return 'CRITICAL';
    if (s === 'WARNING' && max !== 'CRITICAL') return 'WARNING';
    return max;
  }, 'INFO');

  const category = event.findings?.[0]?.category || 'guard-block';
  const eco = createFinding(
    'guard',
    'vulnerability',
    toEcosystemSeverity(highestSeverity),
    `Guard Block: ${category} (${event.mode}/${event.direction})`,
    `Guard mode ${event.mode} blocked ${event.direction} content with ${event.findings?.length || 0} findings`,
    {
      mode: event.mode,
      direction: event.direction,
      findingCount: event.findings?.length || 0,
      category,
    },
    event.content?.slice(0, 2000),
  );
  void emitFinding(eco);
}

// ===========================================================================
// AttackDNA Analyze Finding Emitter (Story 10.5)
// ===========================================================================

interface AnalyzeResult {
  payload: string;
  modelId: string;
  components?: number;
  criticalComponents?: number;
}

/**
 * Emit ecosystem finding after ablation analysis.
 */
export function emitAnalyzeFinding(result: AnalyzeResult): void {
  const eco = createFinding(
    'attackdna',
    'attack_variant',
    result.criticalComponents && result.criticalComponents > 0 ? 'WARNING' : 'INFO',
    `DNA Analysis: ${result.components || 0} components analyzed`,
    `Ablation analysis of payload against model ${result.modelId}`,
    {
      modelId: result.modelId,
      components: result.components,
      criticalComponents: result.criticalComponents,
    },
    result.payload.slice(0, 2000),
  );
  void emitFinding(eco);
}
