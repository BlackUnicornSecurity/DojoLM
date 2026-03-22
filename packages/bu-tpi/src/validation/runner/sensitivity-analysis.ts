/**
 * KATANA Near-Threshold Sensitivity Analysis (K7.2)
 *
 * Tests scanner sensitivity near detection thresholds per ISO 17025 7.2.2.
 * Graduated inputs cross detection threshold in configurable steps per module.
 * Documents gray zone width and transition sharpness.
 * Results feed into the uncertainty budget.
 *
 * ISO 17025 Clause: 7.2.2
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of scanning a single graduated step */
export interface SensitivityStep {
  readonly step: number;
  readonly input: string;
  readonly verdict: 'clean' | 'malicious';
  readonly confidence: number;
  readonly findings_count: number;
}

/** Sensitivity profile for a single module */
export interface SensitivityProfile {
  readonly module_id: string;
  readonly steps: readonly SensitivityStep[];
  /** Index where verdict first flips from clean to malicious (null if no flip) */
  readonly transition_index: number | null;
  /** Number of steps between first and last transition (gray zone) */
  readonly gray_zone_width: number;
  /** 0-1: 1 = instant transition, 0 = gradual. Based on gray zone relative to total steps */
  readonly transition_sharpness: number;
}

/** Aggregate report across all modules */
export interface SensitivityReport {
  readonly generated_at: string;
  readonly modules: readonly SensitivityProfile[];
  readonly modules_with_clear_threshold: number;
  readonly modules_with_gradual_transition: number;
  readonly average_gray_zone_width: number;
}

/** Scan function signature for dependency injection */
export type ScanFunction = (text: string) => {
  readonly findings: ReadonlyArray<{ readonly severity: string; readonly engine?: string }>;
  readonly verdict: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_STEPS = 10;
const BENIGN_CONTEXT = 'The quick brown fox jumps over the lazy dog. This is a normal, everyday sentence about common activities.';
const CLEAR_THRESHOLD_MAX_GRAY_ZONE = 1;

// ---------------------------------------------------------------------------
// Graduated Input Generation
// ---------------------------------------------------------------------------

/**
 * Generate input at graduated intensity from pure benign (step 0) to
 * full attack payload (step totalSteps - 1).
 *
 * At lower steps, the attack payload is heavily diluted with benign context.
 * At higher steps, the benign context shrinks and attack dominates.
 *
 * @param baseAttack - The full attack payload
 * @param step - Current step (0-indexed)
 * @param totalSteps - Total number of steps (must be >= 2)
 * @returns Graduated input string
 */
export function generateGraduatedInput(
  baseAttack: string,
  step: number,
  totalSteps: number,
): string {
  if (totalSteps < 2) {
    throw new Error(`totalSteps must be >= 2, got ${totalSteps}`);
  }
  if (step < 0 || step >= totalSteps) {
    throw new Error(`step must be in [0, ${totalSteps - 1}], got ${step}`);
  }

  // step 0: pure benign
  if (step === 0) {
    return BENIGN_CONTEXT;
  }

  // step totalSteps-1: full attack
  if (step === totalSteps - 1) {
    return baseAttack;
  }

  // Intermediate: ratio from 0 (all benign) to 1 (all attack)
  const ratio = step / (totalSteps - 1);

  // Calculate how many characters of each component to include
  const attackLength = Math.max(1, Math.round(baseAttack.length * ratio));
  const benignLength = Math.max(1, Math.round(BENIGN_CONTEXT.length * (1 - ratio)));

  const attackPortion = baseAttack.slice(0, attackLength);
  const benignPortion = BENIGN_CONTEXT.slice(0, benignLength);

  // Lower steps: benign first, attack blended in at end
  // Higher steps: attack first, benign padding at end
  return ratio < 0.5
    ? `${benignPortion} ${attackPortion}`
    : `${attackPortion} ${benignPortion}`;
}

// ---------------------------------------------------------------------------
// Transition Analysis
// ---------------------------------------------------------------------------

/**
 * Find the first step index where verdict changes from 'clean' to 'malicious'.
 * Returns null if no transition occurs.
 */
function findFirstTransition(steps: readonly SensitivityStep[]): number | null {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].verdict === 'malicious') {
      return i;
    }
  }
  return null;
}

/**
 * Find the last step index where verdict is still 'clean' before final consistent 'malicious'.
 * This helps measure the gray zone where verdicts may oscillate.
 */
function findLastCleanBeforeEnd(steps: readonly SensitivityStep[]): number {
  let lastClean = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].verdict === 'clean') {
      lastClean = i;
    }
  }
  return lastClean;
}

/**
 * Compute gray zone width: the range of steps where the verdict is not
 * consistently one or the other. Measured as (lastClean - firstMalicious + 1)
 * when transitions exist, or 0 when there is no transition.
 */
function computeGrayZoneWidth(steps: readonly SensitivityStep[]): number {
  const firstMalicious = findFirstTransition(steps);
  if (firstMalicious === null) {
    return 0;
  }

  const lastClean = findLastCleanBeforeEnd(steps);
  if (lastClean < firstMalicious) {
    // Clean transition: all clean before firstMalicious, all malicious after
    return 0;
  }

  // Gray zone spans from firstMalicious to lastClean (inclusive)
  return lastClean - firstMalicious + 1;
}

/**
 * Compute transition sharpness: 1 = instant (no gray zone), 0 = maximally gradual.
 * Normalized against total step count minus 1.
 */
function computeTransitionSharpness(
  grayZoneWidth: number,
  totalSteps: number,
  hasTransition: boolean,
): number {
  if (!hasTransition) {
    return 0;
  }

  if (grayZoneWidth === 0) {
    return 1;
  }

  // Sharpness decreases as gray zone grows relative to total steps
  const maxGrayZone = Math.max(1, totalSteps - 1);
  return Math.max(0, 1 - (grayZoneWidth / maxGrayZone));
}

// ---------------------------------------------------------------------------
// Single Module Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze sensitivity for a single module by running graduated inputs
 * through the provided scan function.
 *
 * @param moduleId - Module identifier
 * @param baseAttack - Full attack payload to graduate
 * @param scanFn - Scan function that returns findings and verdict
 * @param steps - Number of graduated steps (default: 10)
 * @returns SensitivityProfile with transition analysis
 */
export function analyzeSensitivity(
  moduleId: string,
  baseAttack: string,
  scanFn: ScanFunction,
  steps: number = DEFAULT_STEPS,
): SensitivityProfile {
  if (!moduleId || moduleId.length === 0) {
    throw new Error('moduleId must be non-empty');
  }
  if (!baseAttack || baseAttack.length === 0) {
    throw new Error('baseAttack must be non-empty');
  }
  if (steps < 2) {
    throw new Error(`steps must be >= 2, got ${steps}`);
  }

  const sensitivitySteps: readonly SensitivityStep[] = Array.from(
    { length: steps },
    (_, i): SensitivityStep => {
      const input = generateGraduatedInput(baseAttack, i, steps);
      const result = scanFn(input);
      const findingsCount = result.findings.length;
      const verdict: 'clean' | 'malicious' =
        result.verdict === 'malicious' ? 'malicious' : 'clean';

      // Confidence derived from findings density (0 findings = 0, more = higher)
      const confidence = findingsCount > 0
        ? Math.min(1, findingsCount / Math.max(1, steps))
        : 0;

      return {
        step: i,
        input,
        verdict,
        confidence,
        findings_count: findingsCount,
      };
    },
  );

  const transitionIndex = findFirstTransition(sensitivitySteps);
  const grayZoneWidth = computeGrayZoneWidth(sensitivitySteps);
  const transitionSharpness = computeTransitionSharpness(
    grayZoneWidth,
    steps,
    transitionIndex !== null,
  );

  return {
    module_id: moduleId,
    steps: sensitivitySteps,
    transition_index: transitionIndex,
    gray_zone_width: grayZoneWidth,
    transition_sharpness: transitionSharpness,
  };
}

// ---------------------------------------------------------------------------
// Batch Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze sensitivity for multiple modules against multiple attack payloads.
 *
 * @param modules - Array of module IDs to test
 * @param attacks - Map of module ID to base attack payload
 * @param scanFn - Scan function (receives text, returns findings + verdict)
 * @param steps - Number of graduated steps per module (default: 10)
 * @returns SensitivityReport with aggregate statistics
 */
export function analyzeAllSensitivity(
  modules: readonly string[],
  attacks: ReadonlyMap<string, string>,
  scanFn: ScanFunction,
  steps: number = DEFAULT_STEPS,
): SensitivityReport {
  const profiles: readonly SensitivityProfile[] = modules.map((moduleId) => {
    const baseAttack = attacks.get(moduleId);
    if (!baseAttack) {
      throw new Error(`No attack payload provided for module: ${moduleId}`);
    }
    return analyzeSensitivity(moduleId, baseAttack, scanFn, steps);
  });

  const modulesWithClear = profiles.filter(
    p => p.transition_index !== null && p.gray_zone_width <= CLEAR_THRESHOLD_MAX_GRAY_ZONE,
  ).length;

  const modulesWithGradual = profiles.filter(
    p => p.transition_index !== null && p.gray_zone_width > CLEAR_THRESHOLD_MAX_GRAY_ZONE,
  ).length;

  const profilesWithTransition = profiles.filter(p => p.transition_index !== null);
  const avgGrayZone = profilesWithTransition.length > 0
    ? profilesWithTransition.reduce((sum, p) => sum + p.gray_zone_width, 0) / profilesWithTransition.length
    : 0;

  return {
    generated_at: new Date().toISOString(),
    modules: profiles,
    modules_with_clear_threshold: modulesWithClear,
    modules_with_gradual_transition: modulesWithGradual,
    average_gray_zone_width: avgGrayZone,
  };
}

// ---------------------------------------------------------------------------
// Report Formatting
// ---------------------------------------------------------------------------

/**
 * Format a sensitivity report as markdown for human review.
 */
export function formatSensitivityReport(report: SensitivityReport): string {
  const lines: readonly string[] = [
    '# Near-Threshold Sensitivity Analysis Report',
    '',
    `**Generated:** ${report.generated_at}`,
    `**Modules Analyzed:** ${report.modules.length}`,
    `**Clear Threshold:** ${report.modules_with_clear_threshold}`,
    `**Gradual Transition:** ${report.modules_with_gradual_transition}`,
    `**Average Gray Zone Width:** ${report.average_gray_zone_width.toFixed(2)} steps`,
    '',
    '---',
    '',
    ...report.modules.flatMap((profile): readonly string[] => [
      `## Module: ${profile.module_id}`,
      '',
      `- **Transition Index:** ${profile.transition_index ?? 'None (no detection)'}`,
      `- **Gray Zone Width:** ${profile.gray_zone_width} steps`,
      `- **Transition Sharpness:** ${profile.transition_sharpness.toFixed(3)}`,
      '',
      '| Step | Verdict | Confidence | Findings |',
      '|------|---------|------------|----------|',
      ...profile.steps.map(
        s => `| ${s.step} | ${s.verdict} | ${s.confidence.toFixed(3)} | ${s.findings_count} |`,
      ),
      '',
    ]),
  ];

  return lines.join('\n');
}
