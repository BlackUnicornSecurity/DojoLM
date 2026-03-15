/**
 * H19.3: Kotoba Prompt Variant Generator
 * Generates hardened prompt variants by applying rule combinations.
 */

import type { HardeningLevel, PromptVariant, PromptIssue } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';
import { scorePrompt } from './scorer.js';
import { getAllRules } from './rules/index.js';

// ---------------------------------------------------------------------------
// Variant Generation
// ---------------------------------------------------------------------------

/**
 * Generate hardened variants of a prompt.
 * - moderate: apply individual high-severity rules only
 * - aggressive: apply all detected rules
 */
export function generateVariants(
  prompt: string,
  level: HardeningLevel,
  maxVariants: number = 5,
): PromptVariant[] {
  if (prompt.length > MAX_INPUT_LENGTH) {
    prompt = prompt.slice(0, MAX_INPUT_LENGTH);
  }

  const cap = Math.min(maxVariants, 20);
  const rules = getAllRules();
  const analysis = scorePrompt(prompt);
  const detectedIssues = analysis.issues;

  if (detectedIssues.length === 0) {
    return [];
  }

  const variants: PromptVariant[] = [];

  if (level === 'moderate') {
    // Apply each high-severity rule individually
    const highSeverityIssues = detectedIssues.filter((i) => i.severity === 'high');
    for (const issue of highSeverityIssues) {
      if (variants.length >= cap) break;
      const rule = rules.find((r) => r.id === issue.id);
      if (!rule) continue;

      const hardened = rule.fix(prompt);
      if (hardened === prompt) continue;

      const newAnalysis = scorePrompt(hardened);
      variants.push({
        original: prompt,
        hardened,
        appliedRules: [rule.id],
        scoreBefore: analysis.overallScore,
        scoreAfter: newAnalysis.overallScore,
        diff: generateSimpleDiff(prompt, hardened),
      });
    }
  } else {
    // Aggressive: apply all rules cumulatively
    let current = prompt;
    const appliedRules: string[] = [];

    // First variant: apply all high-severity
    for (const issue of detectedIssues.filter((i) => i.severity === 'high')) {
      const rule = rules.find((r) => r.id === issue.id);
      if (!rule) continue;
      const patched = rule.fix(current);
      if (patched !== current) {
        current = patched;
        appliedRules.push(rule.id);
      }
    }
    if (appliedRules.length > 0 && variants.length < cap) {
      const newAnalysis = scorePrompt(current);
      variants.push({
        original: prompt,
        hardened: current,
        appliedRules: [...appliedRules],
        scoreBefore: analysis.overallScore,
        scoreAfter: newAnalysis.overallScore,
        diff: generateSimpleDiff(prompt, current),
      });
    }

    // Second variant: apply all rules (high + medium + low)
    current = prompt;
    const allApplied: string[] = [];
    for (const issue of detectedIssues) {
      const rule = rules.find((r) => r.id === issue.id);
      if (!rule) continue;
      const patched = rule.fix(current);
      if (patched !== current) {
        current = patched;
        allApplied.push(rule.id);
      }
    }
    if (allApplied.length > appliedRules.length && variants.length < cap) {
      const newAnalysis = scorePrompt(current);
      variants.push({
        original: prompt,
        hardened: current,
        appliedRules: allApplied,
        scoreBefore: analysis.overallScore,
        scoreAfter: newAnalysis.overallScore,
        diff: generateSimpleDiff(prompt, current),
      });
    }

    // Generate individual rule variants for remaining capacity
    for (const issue of detectedIssues) {
      if (variants.length >= cap) break;
      if (issue.severity === 'high') continue; // Already covered above
      const rule = rules.find((r) => r.id === issue.id);
      if (!rule) continue;
      const hardened = rule.fix(prompt);
      if (hardened === prompt) continue;
      const newAnalysis = scorePrompt(hardened);
      variants.push({
        original: prompt,
        hardened,
        appliedRules: [rule.id],
        scoreBefore: analysis.overallScore,
        scoreAfter: newAnalysis.overallScore,
        diff: generateSimpleDiff(prompt, hardened),
      });
    }
  }

  // Sort by improvement (biggest score gain first)
  variants.sort((a, b) => (b.scoreAfter - b.scoreBefore) - (a.scoreAfter - a.scoreBefore));

  return variants.slice(0, cap);
}

// ---------------------------------------------------------------------------
// Simple Diff
// ---------------------------------------------------------------------------

function generateSimpleDiff(original: string, modified: string): string {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const diffs: string[] = [];

  const maxLen = Math.max(origLines.length, modLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const mod = modLines[i];
    if (orig === mod) continue;
    if (orig !== undefined && mod === undefined) {
      diffs.push(`- ${orig}`);
    } else if (orig === undefined && mod !== undefined) {
      diffs.push(`+ ${mod}`);
    } else {
      diffs.push(`- ${orig}`);
      diffs.push(`+ ${mod}`);
    }
  }

  return diffs.join('\n');
}
