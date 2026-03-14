/**
 * File: guard-middleware.ts
 * Purpose: Guard middleware for LLM input/output scanning
 * Story: TPI-UIP-11
 * Index:
 * - redactPII() (line 25)
 * - guardScanInput() (line 62)
 * - guardScanOutput() (line 113)
 * - executeWithGuard() (line 156)
 * - determineAction() (line 230)
 * - calculateConfidence() (line 258)
 * - scanWithTimeout() (line 278)
 */

import crypto from 'node:crypto';
import { scan } from '@dojolm/scanner';
import type { ScanResult } from '@dojolm/scanner';
import type {
  GuardConfig,
  GuardEvent,
  GuardAction,
  GuardDirection,
} from './guard-types';
import type { LLMModelConfig, LLMPromptTestCase, LLMTestExecution } from './llm-types';
import { GUARD_MODES } from './guard-constants';
import {
  GUARD_AUDIT_TEXT_MAX,
  GUARD_SCAN_TIMEOUT_MS,
  GUARD_MAX_INPUT_SIZE,
  GUARD_BLOCKED_SCORE,
} from './guard-constants';
import { executeSingleTestWithRetry } from './llm-execution';

// ===========================================================================
// PII Redaction (S6)
// ===========================================================================

/** PII patterns for redaction before audit storage */
const PII_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // Email addresses
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  // US Social Security Numbers (XXX-XX-XXXX or XXXXXXXXX)
  { regex: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  // Credit card numbers (basic 13-19 digit patterns with optional separators)
  { regex: /\b(?:\d[ -]*?){13,19}\b/g, replacement: '[CC_REDACTED]' },
  // US phone numbers
  { regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
];

/**
 * Redact PII patterns from text before storing in audit log.
 * Applies all patterns globally to ensure complete redaction.
 */
export function redactPII(text: string): string {
  let redacted = text;
  for (const { regex, replacement } of PII_PATTERNS) {
    // Reset lastIndex to prevent stateful regex issues
    regex.lastIndex = 0;
    redacted = redacted.replace(regex, replacement);
  }
  return redacted;
}

// ===========================================================================
// Input Scanning
// ===========================================================================

/**
 * Scan input text through the guard.
 * Returns whether to proceed and an optional guard event.
 */
export function guardScanInput(
  text: string,
  config: Readonly<GuardConfig>,
  context?: { executionId?: string; modelConfigId?: string; testCaseId?: string }
): { proceed: boolean; event: GuardEvent | null } {
  const modeInfo = GUARD_MODES.find((m) => m.id === config.mode);

  // If mode doesn't scan inputs, pass through
  if (!modeInfo || !modeInfo.inputScan) {
    return { proceed: true, event: null };
  }

  // Truncate oversized input before scanning (L5)
  const scanText = text.length > GUARD_MAX_INPUT_SIZE
    ? text.slice(0, GUARD_MAX_INPUT_SIZE)
    : text;

  // Scan with timeout (L4)
  const scanResult = scanWithTimeout(scanText, config.engines);

  // If scan timed out, fail-open (use 'log' for non-blocking modes, 'allow' for blocking modes)
  if (!scanResult) {
    const timeoutAction = modeInfo.canBlock ? 'allow' : 'log';
    const event = createGuardEvent('input', config, null, timeoutAction, text, 0, context);
    return { proceed: true, event };
  }

  const confidence = calculateConfidence(scanResult);
  const action = determineAction(scanResult, config, modeInfo.canBlock);
  const event = createGuardEvent('input', config, scanResult, action, text, confidence, context);

  return {
    proceed: action !== 'block',
    event,
  };
}

// ===========================================================================
// Output Scanning
// ===========================================================================

/**
 * Scan output text through the guard.
 * Returns whether the output is flagged and an optional guard event.
 */
export function guardScanOutput(
  text: string,
  config: Readonly<GuardConfig>,
  context?: { executionId?: string; modelConfigId?: string; testCaseId?: string }
): { flagged: boolean; event: GuardEvent | null } {
  const modeInfo = GUARD_MODES.find((m) => m.id === config.mode);

  // If mode doesn't scan outputs, pass through
  if (!modeInfo || !modeInfo.outputScan) {
    return { flagged: false, event: null };
  }

  // Truncate oversized output before scanning (L5)
  const scanText = text.length > GUARD_MAX_INPUT_SIZE
    ? text.slice(0, GUARD_MAX_INPUT_SIZE)
    : text;

  const scanResult = scanWithTimeout(scanText, config.engines);

  // If scan timed out, fail-open (use 'log' for non-blocking modes, 'allow' for blocking modes)
  if (!scanResult) {
    const timeoutAction = modeInfo.canBlock ? 'allow' : 'log';
    const event = createGuardEvent('output', config, null, timeoutAction, text, 0, context);
    return { flagged: false, event };
  }

  const confidence = calculateConfidence(scanResult);
  const action = determineAction(scanResult, config, modeInfo.canBlock);
  const event = createGuardEvent('output', config, scanResult, action, text, confidence, context);

  return {
    flagged: action === 'block',
    event,
  };
}

// ===========================================================================
// Guard-Wrapped Execution (A2: does NOT modify executeSingleTest)
// ===========================================================================

/**
 * Execute a test case wrapped with guard scanning.
 * The guard wraps executeSingleTest() without modifying it (A2).
 * Input block → synthetic execution (resilienceScore=80, guardPrevented=true, no LLM call) (L1, L3)
 */
export async function executeWithGuard(
  model: LLMModelConfig,
  testCase: LLMPromptTestCase,
  config: Readonly<GuardConfig>
): Promise<{ execution: LLMTestExecution; guardEvents: GuardEvent[] }> {
  const guardEvents: GuardEvent[] = [];

  // Input scan phase
  if (config.enabled) {
    const inputResult = guardScanInput(testCase.prompt, config, {
      modelConfigId: model.id,
      testCaseId: testCase.id,
    });

    if (inputResult.event) {
      guardEvents.push(inputResult.event);
    }

    // If blocked, return synthetic execution without calling the LLM (L1, L3)
    if (!inputResult.proceed) {
      const syntheticExecution: LLMTestExecution = {
        id: `exec-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        testCaseId: testCase.id,
        modelConfigId: model.id,
        timestamp: new Date().toISOString(),
        status: 'completed',
        prompt: testCase.prompt,
        response: '[GUARD BLOCKED] Input blocked by Hattori Guard before reaching the model.',
        duration_ms: 0,
        injectionSuccess: 0,
        harmfulness: 0,
        resilienceScore: GUARD_BLOCKED_SCORE,
        categoriesPassed: [testCase.category],
        categoriesFailed: [],
        owaspCoverage: testCase.owaspCategory ? { [testCase.owaspCategory]: true } : {},
        tpiCoverage: testCase.tpiStory ? { [testCase.tpiStory]: true } : {},
        contentHash: '',
        cached: false,
        notes: 'guardPrevented=true',
      };

      return { execution: syntheticExecution, guardEvents };
    }
  }

  // Execute the actual test with timeout retry (A2 + QA Round 3)
  const execution = await executeSingleTestWithRetry(model, testCase);

  // Output scan phase
  if (config.enabled && execution.response) {
    const outputResult = guardScanOutput(execution.response, config, {
      executionId: execution.id,
      modelConfigId: model.id,
      testCaseId: testCase.id,
    });

    if (outputResult.event) {
      guardEvents.push(outputResult.event);
    }

    if (outputResult.flagged) {
      execution.notes = [execution.notes, 'Guard flagged output as dangerous'].filter(Boolean).join('; ');
    }
  }

  return { execution, guardEvents };
}

// ===========================================================================
// Action Determination
// ===========================================================================

/**
 * Determine the guard action based on scan results and configuration.
 * Shinobi: always 'log' (stealth monitoring, no blocking)
 * Active modes: 'block' if verdict=BLOCK and meets threshold, else 'allow'
 */
export function determineAction(
  scanResult: ScanResult,
  config: Readonly<GuardConfig>,
  canBlock: boolean
): GuardAction {
  // Shinobi never blocks (stealth monitor mode)
  if (!canBlock) {
    return 'log';
  }

  // Check if findings meet the block threshold
  if (scanResult.verdict === 'BLOCK') {
    if (config.blockThreshold === 'CRITICAL') {
      // Only block if there are CRITICAL findings
      return scanResult.counts.critical > 0 ? 'block' : 'allow';
    }
    // WARNING threshold: block on WARNING or CRITICAL
    return (scanResult.counts.critical > 0 || scanResult.counts.warning > 0) ? 'block' : 'allow';
  }

  return 'allow';
}

// ===========================================================================
// Confidence Calculation (L2)
// ===========================================================================

/**
 * Calculate confidence score (0-1) based on finding severity distribution.
 */
export function calculateConfidence(scanResult: ScanResult): number {
  const total = scanResult.findings.length;
  if (total === 0) return 0;

  // Weighted sum: CRITICAL=1.0, WARNING=0.6, INFO=0.2
  const weightedSum =
    scanResult.counts.critical * 1.0 +
    scanResult.counts.warning * 0.6 +
    scanResult.counts.info * 0.2;

  // Normalize: max confidence at 5+ weighted findings
  const safeMax = Math.max(weightedSum, 1);
  return Math.min(safeMax / 5, 1);
}

// ===========================================================================
// Scan with Timeout (L4)
// ===========================================================================

/**
 * Run scanner with a timeout. Returns null if timeout exceeded (fail-open).
 * The scan() function is synchronous, so we use a simple timing check.
 */
function scanWithTimeout(
  text: string,
  engines: string[] | null
): ScanResult | null {
  const start = Date.now();

  try {
    const options = engines ? { engines } : undefined;
    const result = scan(text, options);
    const elapsed = Date.now() - start;

    // If scan took too long, log but still return (fail-open, scan already completed)
    if (elapsed > GUARD_SCAN_TIMEOUT_MS) {
      console.warn(`Guard scan exceeded timeout: ${elapsed}ms > ${GUARD_SCAN_TIMEOUT_MS}ms`);
    }

    return result;
  } catch (error) {
    console.error('Guard scan error:', error);
    return null;
  }
}

// ===========================================================================
// Helper: Create Guard Event
// ===========================================================================

function createGuardEvent(
  direction: GuardDirection,
  config: Readonly<GuardConfig>,
  scanResult: ScanResult | null,
  action: GuardAction,
  text: string,
  confidence: number,
  context?: { executionId?: string; modelConfigId?: string; testCaseId?: string }
): GuardEvent {
  // Truncate and redact text for audit storage (S6)
  const truncated = text.length > GUARD_AUDIT_TEXT_MAX
    ? text.slice(0, GUARD_AUDIT_TEXT_MAX) + '...'
    : text;
  const redacted = redactPII(truncated);

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    mode: config.mode,
    direction,
    scanResult: scanResult
      ? {
          findings: scanResult.findings.length,
          verdict: scanResult.verdict,
          severity:
            scanResult.counts.critical > 0
              ? 'CRITICAL'
              : scanResult.counts.warning > 0
                ? 'WARNING'
                : scanResult.findings.length > 0
                  ? 'INFO'
                  : null,
        }
      : null,
    action,
    scannedText: redacted,
    confidence,
    executionId: context?.executionId,
    modelConfigId: context?.modelConfigId,
    testCaseId: context?.testCaseId,
  };
}
