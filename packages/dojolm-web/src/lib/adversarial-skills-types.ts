/**
 * File: adversarial-skills-types.ts
 * Purpose: TypeScript interfaces for adversarial skills system
 * Story: 12.2a — Skill Data Model + Core Skills
 * Index:
 * - SkillDifficulty type (line 11)
 * - SkillCategory type (line 13)
 * - OwaspLlmMapping type (line 15)
 * - SkillStep interface (line 21)
 * - AdversarialSkill interface (line 33)
 * - SkillExecutionResult interface (line 56)
 */

/** Difficulty levels for adversarial skills */
export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/** Skill categories organized by attack phase */
export type SkillCategory =
  | 'reconnaissance'
  | 'injection'
  | 'encoding'
  | 'exfiltration'
  | 'evasion'
  | 'tool-abuse'
  | 'compliance'
  | 'audio-voice'

/** OWASP LLM Top 10 (2023 v1.1) mapping IDs */
export type OwaspLlmMapping =
  | 'LLM01' // Prompt Injection
  | 'LLM02' // Insecure Output Handling
  | 'LLM03' // Training Data Poisoning
  | 'LLM04' // Model Denial of Service
  | 'LLM05' // Supply Chain Vulnerabilities
  | 'LLM06' // Sensitive Information Disclosure
  | 'LLM07' // Insecure Plugin Design
  | 'LLM08' // Excessive Agency
  | 'LLM09' // Overreliance
  | 'LLM10' // Model Theft

/** A single step within an adversarial skill execution flow */
export interface SkillStep {
  /** Step order (1-based) */
  order: number
  /** Short step label */
  label: string
  /** Detailed instruction for this step */
  instruction: string
  /** Example payload or input for this step */
  examplePayload?: string
  /** Expected outcome description */
  expectedOutcome: string
}

/** An adversarial skill definition */
export interface AdversarialSkill {
  /** Unique skill identifier (kebab-case) */
  id: string
  /** Human-readable skill name */
  name: string
  /** Brief description of what the skill tests */
  description: string
  /** Attack category */
  category: SkillCategory
  /** Difficulty level */
  difficulty: SkillDifficulty
  /** OWASP LLM Top 10 mapping */
  owaspMapping: OwaspLlmMapping[]
  /** Ordered execution steps */
  steps: SkillStep[]
  /** TPI story reference */
  tpiStory: string
  /** Tags for filtering */
  tags: string[]
  /** Approved tool IDs this skill can invoke (sandbox boundary) */
  approvedTools: string[]
  /** Estimated execution time in seconds */
  estimatedDurationSec: number
}

/** Result of executing an adversarial skill */
export interface SkillExecutionResult {
  /** Skill ID that was executed */
  skillId: string
  /** Whether execution completed successfully */
  success: boolean
  /** Overall severity of findings */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Execution timestamp */
  timestamp: string
  /** Time taken in milliseconds */
  durationMs: number
  /** Step-by-step results */
  stepResults: {
    order: number
    label: string
    status: 'passed' | 'failed' | 'blocked' | 'skipped'
    output?: string
    finding?: string
    /** Raw severity string from scanner finding (for structured escalation) */
    findingSeverity?: string
  }[]
  /** Raw output content (displayed via SafeCodeBlock) */
  rawContent: string
  /** Summary of what was discovered */
  summary: string
}

/** Difficulty level metadata for display */
export const DIFFICULTY_CONFIG: Record<SkillDifficulty, { label: string; color: string; order: number }> = {
  beginner: { label: 'Beginner', color: 'text-green-500', order: 0 },
  intermediate: { label: 'Intermediate', color: 'text-[var(--severity-warning)]', order: 1 },
  advanced: { label: 'Advanced', color: 'text-[var(--severity-high)]', order: 2 },
  expert: { label: 'Expert', color: 'text-[var(--severity-critical)]', order: 3 },
}

/** Category metadata for display */
export const CATEGORY_CONFIG: Record<SkillCategory, { label: string; description: string }> = {
  reconnaissance: { label: 'Reconnaissance', description: 'Information gathering and system probing' },
  injection: { label: 'Injection', description: 'Prompt injection and jailbreak techniques' },
  encoding: { label: 'Encoding', description: 'Payload encoding and obfuscation' },
  exfiltration: { label: 'Exfiltration', description: 'Data extraction and leakage' },
  evasion: { label: 'Evasion', description: 'Detection bypass and filter evasion' },
  'tool-abuse': { label: 'Tool Abuse', description: 'MCP tool and plugin exploitation' },
  compliance: { label: 'Compliance', description: 'Policy and guideline testing' },
  'audio-voice': { label: 'Audio/Voice', description: 'Audio and voice-based attack vectors' },
}
