/**
 * H19.1: Kotoba Prompt Optimizer — Core Types
 * Type definitions for prompt analysis, scoring, hardening rules, and variant generation.
 */

// --- Score Categories ---

export const SCORE_CATEGORIES = [
  'boundary_clarity',
  'instruction_priority',
  'role_definition',
  'output_constraints',
  'injection_resistance',
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

// --- Letter Grades ---

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// --- Grade Thresholds ---

export const MIN_SCORE_A = 90;
export const MIN_SCORE_B = 75;
export const MIN_SCORE_C = 60;
export const MIN_SCORE_D = 40;

// --- Input Limits ---

export const MAX_INPUT_LENGTH = 50_000;

// --- Prompt Analysis ---

export interface PromptAnalysis {
  readonly promptText: string;
  readonly overallScore: number;
  readonly grade: LetterGrade;
  readonly categoryScores: Record<ScoreCategory, number>;
  readonly issues: PromptIssue[];
  readonly analyzedAt: string;
}

// --- Prompt Issue ---

export interface PromptIssue {
  readonly id: string;
  readonly category: ScoreCategory;
  readonly severity: 'high' | 'medium' | 'low';
  readonly description: string;
  readonly location: { readonly start: number; readonly end: number } | null;
  readonly suggestedFix: string;
}

// --- Hardening Rule ---

export interface HardeningRule {
  readonly id: string;
  readonly name: string;
  readonly category: ScoreCategory;
  readonly description: string;
  readonly detect: (prompt: string) => PromptIssue | null;
  readonly fix: (prompt: string) => string;
}

// --- Hardening Level ---

export type HardeningLevel = 'moderate' | 'aggressive';

// --- Prompt Variant ---

export interface PromptVariant {
  readonly original: string;
  readonly hardened: string;
  readonly appliedRules: string[];
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  readonly diff: string;
}

// --- Category Weights ---

export const CATEGORY_WEIGHTS: Record<ScoreCategory, number> = {
  boundary_clarity: 0.25,
  instruction_priority: 0.20,
  role_definition: 0.20,
  output_constraints: 0.15,
  injection_resistance: 0.20,
} as const;
