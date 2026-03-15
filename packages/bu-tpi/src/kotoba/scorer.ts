/**
 * H19.1: Kotoba Prompt Optimizer — Scorer
 * Deterministic, rule-based prompt scoring engine.
 * Scores prompts across 5 categories and assigns letter grades.
 */

import type { LetterGrade, PromptAnalysis, PromptIssue, ScoreCategory } from './types.js';
import {
  CATEGORY_WEIGHTS,
  MAX_INPUT_LENGTH,
  MIN_SCORE_A,
  MIN_SCORE_B,
  MIN_SCORE_C,
  MIN_SCORE_D,
  SCORE_CATEGORIES,
} from './types.js';
import { getAllRules } from './rules/index.js';

/**
 * Get letter grade from a numeric score.
 */
export function getLetterGrade(score: number): LetterGrade {
  if (score >= MIN_SCORE_A) return 'A';
  if (score >= MIN_SCORE_B) return 'B';
  if (score >= MIN_SCORE_C) return 'C';
  if (score >= MIN_SCORE_D) return 'D';
  return 'F';
}

/**
 * Score boundary clarity (0-100).
 * Checks for XML/markdown delimiters, system/user separation.
 */
function scoreBoundaryClarity(prompt: string): number {
  let score = 40; // baseline

  // XML delimiters
  if (/<\w+>[\s\S]*<\/\w+>/i.test(prompt)) score += 15;
  // Markdown sections (## or ### headers)
  if (/^#{1,3}\s+\S/m.test(prompt)) score += 10;
  // System/user separation
  if (/\b(system|user|assistant)\s*[:\-]/i.test(prompt)) score += 15;
  // Clear boundary markers (---  or ===  or ***)
  if (/^[-=*]{3,}\s*$/m.test(prompt)) score += 10;
  // Closing tags present when opening tags exist
  const openTags = prompt.match(/<(\w+)>/g);
  if (openTags) {
    const allClosed = openTags.every((tag) => {
      const name = tag.slice(1, -1);
      return prompt.includes(`</${name}>`);
    });
    if (allClosed) score += 10;
  }

  return Math.min(100, score);
}

/**
 * Score instruction priority (0-100).
 * Checks instruction ordering: critical instructions should come first.
 */
function scoreInstructionPriority(prompt: string): number {
  let score = 50; // baseline

  const lines = prompt.split('\n');
  const totalLines = lines.length;
  if (totalLines === 0) return score;

  // Check for priority markers in first third
  const firstThird = lines.slice(0, Math.max(1, Math.ceil(totalLines / 3))).join('\n');
  const lastThird = lines.slice(Math.floor((totalLines * 2) / 3)).join('\n');

  // Critical/important keywords in first third
  if (/\b(important|critical|must|required|always|never)\b/i.test(firstThird)) score += 15;
  // Safety/security rules in first half
  const firstHalf = lines.slice(0, Math.ceil(totalLines / 2)).join('\n');
  if (/\b(safe|secur|guard|protect|restrict|forbidden|prohibited)\b/i.test(firstHalf)) score += 15;
  // Role before examples
  const roleIdx = prompt.search(/\b(you are|your role|as a|act as)\b/i);
  const exampleIdx = prompt.search(/\b(example|for instance|e\.g\.|such as)\b/i);
  if (roleIdx >= 0 && (exampleIdx < 0 || roleIdx < exampleIdx)) score += 10;
  // Constraints before content
  const constraintIdx = prompt.search(/\b(constraint|rule|requirement|guideline)\b/i);
  const contentIdx = prompt.search(/\b(content|body|text|input)\b/i);
  if (constraintIdx >= 0 && (contentIdx < 0 || constraintIdx < contentIdx)) score += 10;

  return Math.min(100, score);
}

/**
 * Score role definition (0-100).
 * Checks for persona/role statements.
 */
function scoreRoleDefinition(prompt: string): number {
  let score = 30; // baseline

  // Explicit role statement
  if (/\b(you are|your role is|act as|serve as|you will be)\b/i.test(prompt)) score += 20;
  // Strong role definition with specifics
  if (/\b(expert|specialist|professional|analyst|assistant)\b/i.test(prompt)) score += 15;
  // Authority scope
  if (/\b(authorized|permitted|allowed|scope|boundary|domain)\b/i.test(prompt)) score += 15;
  // Identity reinforcement
  if (/\b(always remember|do not forget|maintain|stay in|remain)\b/i.test(prompt)) score += 10;
  // Multiple role-related elements
  if (/\b(responsible for|tasked with|your job|your purpose)\b/i.test(prompt)) score += 10;

  return Math.min(100, score);
}

/**
 * Score output constraints (0-100).
 * Checks for format specifications.
 */
function scoreOutputConstraints(prompt: string): number {
  let score = 35; // baseline

  // Format specification
  if (/\b(format|json|xml|markdown|csv|table|list)\b/i.test(prompt)) score += 15;
  // Length limits
  if (/\b(max|maximum|limit|within|under|no more than)\s+\d+\s*(word|char|sentence|token|line)/i.test(prompt)) score += 15;
  // Output validation / structure
  if (/\b(must include|must contain|required field|schema|structure)\b/i.test(prompt)) score += 15;
  // Response structure
  if (/\b(respond with|output should|return|reply with|provide)\s+(a |the )?(json|list|summary|analysis)/i.test(prompt)) score += 10;
  // Fallback behavior
  if (/\b(if (you )?(cannot|can't|don't|unable)|otherwise|fallback|default|when unsure)\b/i.test(prompt)) score += 10;

  return Math.min(100, score);
}

/**
 * Score injection resistance (0-100).
 * Checks for defensive patterns.
 */
function scoreInjectionResistance(prompt: string): number {
  let score = 20; // baseline

  // Canary tokens
  if (/\b(canary|sentinel|marker|verification token)\b/i.test(prompt)) score += 15;
  // Sandwich defense (instructions at start AND end)
  const lines = prompt.split('\n');
  const firstFifth = lines.slice(0, Math.max(1, Math.ceil(lines.length / 5))).join('\n');
  const lastFifth = lines.slice(Math.floor((lines.length * 4) / 5)).join('\n');
  if (
    /\b(important|critical|must|rule|instruction)\b/i.test(firstFifth) &&
    /\b(important|critical|must|rule|instruction|remember|reminder)\b/i.test(lastFifth)
  ) {
    score += 15;
  }
  // Instruction reinforcement
  if (/\b(ignore (any|all) (attempts|instructions|requests)|do not (comply|follow|obey))\b/i.test(prompt)) score += 15;
  // Input validation mention
  if (/\b(validat|sanitiz|verify|check|filter)\s*(the\s+)?(user\s+)?(input|request|query|data)\b/i.test(prompt)) score += 15;
  // Jailbreak resistance
  if (/\b(jailbreak|bypass|override|escape|circumvent)\b/i.test(prompt)) score += 10;
  // Social engineering defense
  if (/\b(social engineering|manipulation|impersonat|pretend|claim to be)\b/i.test(prompt)) score += 10;

  return Math.min(100, score);
}

/**
 * Score a prompt across all categories and produce a full analysis.
 * Rule-based (deterministic, NOT AI).
 */
export function scorePrompt(prompt: string): PromptAnalysis {
  if (prompt.length > MAX_INPUT_LENGTH) {
    throw new Error(`Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`);
  }

  const categoryScorers: Record<ScoreCategory, (p: string) => number> = {
    boundary_clarity: scoreBoundaryClarity,
    instruction_priority: scoreInstructionPriority,
    role_definition: scoreRoleDefinition,
    output_constraints: scoreOutputConstraints,
    injection_resistance: scoreInjectionResistance,
  };

  const categoryScores = {} as Record<ScoreCategory, number>;
  for (const cat of SCORE_CATEGORIES) {
    categoryScores[cat] = categoryScorers[cat](prompt);
  }

  // Weighted average
  let overallScore = 0;
  for (const cat of SCORE_CATEGORIES) {
    overallScore += categoryScores[cat] * CATEGORY_WEIGHTS[cat];
  }
  overallScore = Math.round(overallScore);

  // Detect issues via rules
  const allRules = getAllRules();
  const issues: PromptIssue[] = [];
  for (const rule of allRules) {
    const issue = rule.detect(prompt);
    if (issue) {
      issues.push(issue);
    }
  }

  return {
    promptText: prompt,
    overallScore,
    grade: getLetterGrade(overallScore),
    categoryScores,
    issues,
    analyzedAt: new Date().toISOString(),
  };
}
