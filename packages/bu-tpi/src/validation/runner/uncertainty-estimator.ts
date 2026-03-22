/**
 * KATANA Uncertainty Estimator (K3.4)
 *
 * Computes measurement uncertainty for validation metrics:
 * - Wilson score confidence intervals (primary)
 * - Clopper-Pearson exact intervals (cross-check)
 * - Expanded uncertainty with coverage factor
 * - Uncertainty budget decomposition
 *
 * Wilson is preferred over Wald because Wald fails near 0% and 100%.
 *
 * ISO 17025 Clause 7.6: Evaluation of measurement uncertainty
 */

import {
  SCHEMA_VERSION,
  type ConfusionMatrix,
  type UncertaintyEstimate,
  type ValidationMetrics,
} from '../types.js';
import { VALIDATION_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Wilson Score Confidence Interval
// ---------------------------------------------------------------------------

/**
 * Wilson score interval for a binomial proportion.
 *
 * Preferred over Wald because it:
 * - Never produces negative bounds
 * - Performs well near 0% and 100%
 * - Has better coverage probability for small samples
 *
 * @param successes - Number of successes
 * @param total - Total number of trials
 * @param z - Z-score for confidence level (default: 1.96 for 95%)
 * @returns [lower, upper] bounds
 */
export function wilsonCI(
  successes: number,
  total: number,
  z = 1.96,
): [lower: number, upper: number] {
  if (total === 0) return [0, 1];
  if (successes < 0 || successes > total) {
    throw new Error(
      `Invalid inputs: successes=${successes} must be in [0, ${total}]`,
    );
  }

  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;

  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);

  const lower = Math.max(0, (centre - margin) / denominator);
  const upper = Math.min(1, (centre + margin) / denominator);

  return [lower, upper];
}

// ---------------------------------------------------------------------------
// Clopper-Pearson Exact Confidence Interval
// ---------------------------------------------------------------------------

/**
 * Clopper-Pearson exact confidence interval for a binomial proportion.
 *
 * Uses the beta distribution quantile function (inverse regularized
 * incomplete beta function). More conservative than Wilson, used as
 * cross-check.
 *
 * @param successes - Number of successes
 * @param total - Total number of trials
 * @param alpha - Significance level (default: 0.05 for 95% CI)
 * @returns [lower, upper] bounds
 */
export function clopperPearsonCI(
  successes: number,
  total: number,
  alpha = 0.05,
): [lower: number, upper: number] {
  if (total === 0) return [0, 1];
  if (successes < 0 || successes > total) {
    throw new Error(
      `Invalid inputs: successes=${successes} must be in [0, ${total}]`,
    );
  }

  // Edge cases
  if (successes === 0) {
    return [0, 1 - Math.pow(alpha / 2, 1 / total)];
  }
  if (successes === total) {
    return [Math.pow(alpha / 2, 1 / total), 1];
  }

  const lower = betaInvCDF(alpha / 2, successes, total - successes + 1);
  const upper = betaInvCDF(1 - alpha / 2, successes + 1, total - successes);

  return [Math.max(0, lower), Math.min(1, upper)];
}

// ---------------------------------------------------------------------------
// Beta Distribution Inverse CDF (Newton-Raphson Approximation)
// ---------------------------------------------------------------------------

/**
 * Inverse CDF of the Beta distribution via Newton-Raphson iteration.
 * Uses the regularized incomplete beta function.
 */
function betaInvCDF(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Initial guess using normal approximation
  let x = normalApproxBetaInv(p, a, b);
  x = Math.max(1e-10, Math.min(1 - 1e-10, x));

  // Newton-Raphson refinement
  for (let i = 0; i < 100; i++) {
    const cdf = regularizedBeta(x, a, b);
    const pdf = betaPDF(x, a, b);
    if (Math.abs(pdf) < 1e-300) break;

    const delta = (cdf - p) / pdf;
    x = Math.max(1e-10, Math.min(1 - 1e-10, x - delta));

    if (Math.abs(delta) < 1e-12) break;
  }

  return x;
}

/**
 * Normal approximation for initial Beta inverse CDF guess.
 */
function normalApproxBetaInv(p: number, a: number, b: number): number {
  // Use the approximation from Abramowitz and Stegun
  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
  const stddev = Math.sqrt(variance);

  // Normal quantile approximation (Beasley-Springer-Moro)
  const z = normalQuantile(p);

  return Math.max(0.001, Math.min(0.999, mean + z * stddev));
}

/**
 * Rational approximation to the normal quantile function.
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const t = p < 0.5
    ? Math.sqrt(-2 * Math.log(p))
    : Math.sqrt(-2 * Math.log(1 - p));

  // Coefficients for rational approximation
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  const q = t - (c0 + c1 * t + c2 * t * t) /
    (1 + d1 * t + d2 * t * t + d3 * t * t * t);

  return p < 0.5 ? -q : q;
}

/**
 * Regularized incomplete beta function I_x(a, b).
 * Uses continued fraction representation for convergence.
 */
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedBeta(1 - x, b, a);
  }

  const logBeta = logBetaFn(a, b);
  const prefix = Math.exp(
    a * Math.log(x) + b * Math.log(1 - x) - logBeta,
  );

  // Lentz's continued fraction
  const cf = betaCF(x, a, b);

  return (prefix * cf) / a;
}

/**
 * Continued fraction for the regularized incomplete beta function.
 */
function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 1e-14;
  const tiny = 1e-300;

  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= maxIter; m++) {
    // Even step
    const m2 = 2 * m;
    let num = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + num * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + num / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    result *= d * c;

    // Odd step
    num = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + num * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + num / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  return result;
}

/**
 * Log of the beta function: log(B(a,b)) = logGamma(a) + logGamma(b) - logGamma(a+b)
 */
function logBetaFn(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/**
 * Beta PDF: f(x; a, b) = x^(a-1) * (1-x)^(b-1) / B(a, b)
 */
function betaPDF(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logP = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBetaFn(a, b);
  return Math.exp(logP);
}

/**
 * Lanczos approximation for log-gamma function.
 */
function logGamma(x: number): number {
  if (x <= 0) return Infinity;

  const g = 7;
  const coeff = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = coeff[0];
  const t = x + g + 0.5;
  for (let i = 1; i < coeff.length; i++) {
    a += coeff[i] / (x + i);
  }

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ---------------------------------------------------------------------------
// Uncertainty Estimate Builder
// ---------------------------------------------------------------------------

/**
 * Compute uncertainty estimate for a single metric.
 *
 * @param moduleId - Module identifier
 * @param metricName - Name of the metric (e.g., 'accuracy', 'precision')
 * @param successes - Number of successes for this metric
 * @param total - Total number of trials
 * @param coverageFactor - Coverage factor k (default from config)
 */
export function computeUncertainty(
  moduleId: string,
  metricName: string,
  successes: number,
  total: number,
  coverageFactor = VALIDATION_CONFIG.COVERAGE_FACTOR,
): UncertaintyEstimate | null {
  // Cannot compute uncertainty for zero samples — return null.
  // DecisionRuleResultSchema.uncertainty is optional, so callers handle this.
  if (total === 0) return null;

  const alpha = 1 - VALIDATION_CONFIG.CONFIDENCE_LEVEL;
  const z = normalQuantile(1 - alpha / 2);

  const pointEstimate = successes / total;
  const [wilsonLower, wilsonUpper] = wilsonCI(successes, total, z);
  const [cpLower, cpUpper] = clopperPearsonCI(successes, total, alpha);

  // Standard uncertainty = half-width of Wilson CI
  const standardUncertainty = (wilsonUpper - wilsonLower) / 2;
  const expandedUncertainty = standardUncertainty * coverageFactor;

  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    metric: metricName,
    point_estimate: pointEstimate,
    wilson_ci_lower: wilsonLower,
    wilson_ci_upper: wilsonUpper,
    clopper_pearson_lower: cpLower,
    clopper_pearson_upper: cpUpper,
    expanded_uncertainty: expandedUncertainty,
    coverage_factor: coverageFactor,
    sample_size: total,
  };
}

// ---------------------------------------------------------------------------
// Full Uncertainty Budget
// ---------------------------------------------------------------------------

/**
 * Metric-specific success counts from a confusion matrix.
 */
interface MetricSuccessCounts {
  name: string;
  successes: number;
  total: number;
}

/**
 * Extract success/total pairs for all metrics from a confusion matrix.
 */
function getMetricCounts(matrix: ConfusionMatrix): MetricSuccessCounts[] {
  const { tp, tn, fp, fn } = matrix;
  const total = tp + tn + fp + fn;

  return [
    { name: 'accuracy', successes: tp + tn, total },
    { name: 'precision', successes: tp, total: tp + fp },
    { name: 'recall', successes: tp, total: tp + fn },
    { name: 'specificity', successes: tn, total: tn + fp },
    { name: 'fpr', successes: fp, total: fp + tn },
    { name: 'fnr', successes: fn, total: fn + tp },
  ];
}

/**
 * Compute full uncertainty budget for a module.
 *
 * Returns uncertainty estimates for accuracy, precision, recall,
 * specificity, FPR, and FNR.
 */
export function computeUncertaintyBudget(
  moduleId: string,
  matrix: ConfusionMatrix,
): UncertaintyEstimate[] {
  const results: UncertaintyEstimate[] = [];
  for (const m of getMetricCounts(matrix)) {
    const estimate = computeUncertainty(moduleId, m.name, m.successes, m.total);
    if (estimate !== null) {
      results.push(estimate);
    }
  }
  return results;
}

/**
 * Compute uncertainty budgets for all modules.
 */
export function computeAllUncertaintyBudgets(
  matrices: ReadonlyMap<string, ConfusionMatrix>,
): Map<string, UncertaintyEstimate[]> {
  const budgets = new Map<string, UncertaintyEstimate[]>();
  for (const [moduleId, matrix] of matrices) {
    budgets.set(moduleId, computeUncertaintyBudget(moduleId, matrix));
  }
  return budgets;
}
