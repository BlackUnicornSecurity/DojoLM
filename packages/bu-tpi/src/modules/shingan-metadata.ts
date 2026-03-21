/**
 * D7.2: Shingan L1 — Metadata Poisoning Patterns (14 patterns)
 *
 * Detects provenance spoofing, metadata inflation, category mismatch,
 * and manifest integrity issues in skill/agent metadata.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';

const SOURCE = 'D7.2';

// ============================================================================
// Provenance Spoofing (4 patterns)
// ============================================================================

export const PROVENANCE_SPOOF_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_provenance_official',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /(?:^|\s)(?:by|from|author(?:ed)?)\s*[:=]?\s*["']?(?:anthropic|openai|google\s*(?:deepmind)?|meta\s*ai)["']?/i,
    desc: 'Skill claims authorship by major AI vendor',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_provenance_team',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /(?:^|\s)(?:by|from|author(?:ed)?)\s*[:=]?\s*["']?(?:claude\s*team|gpt\s*team|gemini\s*team|llama\s*team)["']?/i,
    desc: 'Skill claims authorship by AI model team',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_provenance_verified',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /\b(?:verified\s+(?:by|publisher|author)|official\s+(?:release|version|distribution))\b/i,
    desc: 'Skill claims verified or official status without proof',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_provenance_email_spoof',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /(?:author|contact|email)\s*[:=]\s*["']?\w+@(?:anthropic|openai|google|meta)\.(?:com|ai)["']?/i,
    desc: 'Skill uses spoofed vendor email address',
    source: SOURCE,
    weight: 9,
  },
] as const;

// ============================================================================
// Metadata Inflation (3 patterns)
// ============================================================================

export const METADATA_INFLATION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_inflated_downloads',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:downloads?|installs?)\s*[:=]\s*["']?\d{6,}["']?/i,
    desc: 'Suspiciously high download/install count in metadata',
    source: SOURCE,
    weight: 6,
  },
  {
    name: 'sg_inflated_rating',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:rating|score|stars?)\s*[:=]\s*["']?(?:[5-9]\.[1-9]\d*|[6-9](?:\.\d+)?|\d{2,}(?:\.\d+)?)["']?/i,
    desc: 'Rating exceeds maximum plausible value (>5.0)',
    source: SOURCE,
    weight: 6,
  },
  {
    name: 'sg_future_timestamp',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:published|created|updated|date)\s*[:=]\s*["']?20(?:2[8-9]|[3-9]\d)-\d{2}-\d{2}["']?/i,
    desc: 'Metadata contains future publication date',
    source: SOURCE,
    weight: 5,
  },
] as const;

// ============================================================================
// Category Mismatch (3 patterns)
// ============================================================================

export const CATEGORY_MISMATCH_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_category_security_but_exfil',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /(?:category|type)\s*[:=]\s*["']?(?:security|safety|audit)["']?[\s\S]{0,200}(?:curl|wget|fetch|exfiltrat|upload\s+to)/i,
    desc: 'Security-categorized skill contains exfiltration commands',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_category_util_but_system',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:category|type)\s*[:=]\s*["']?(?:utility|helper|formatter)["']?[\s\S]{0,200}(?:system\s*prompt|ignore\s+(?:previous|above)|you\s+are\s+now)/i,
    desc: 'Utility-categorized skill contains prompt injection',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_category_docs_but_exec',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:category|type)\s*[:=]\s*["']?(?:documentation|docs|readme)["']?[\s\S]{0,200}(?:exec\(|eval\(|child_process|spawn\(|Bash\b)/i,
    desc: 'Documentation-categorized skill contains code execution',
    source: SOURCE,
    weight: 8,
  },
] as const;

// ============================================================================
// Manifest Integrity (4 patterns)
// ============================================================================

export const MANIFEST_INTEGRITY_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_manifest_no_name',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /^\s*\{[\s\S]{0,200}(?!"name"\s*:)[\s\S]*(?:inputSchema|tools|permissions)/i,
    desc: 'Manifest missing required name field',
    source: SOURCE,
    weight: 5,
  },
  {
    name: 'sg_manifest_wildcard_perms',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.CRITICAL,
    re: /(?:permissions|scopes?)\s*[:=]\s*\[?\s*["']\*["']/i,
    desc: 'Manifest requests wildcard (*) permissions',
    source: SOURCE,
    weight: 10,
  },
  {
    name: 'sg_manifest_contradictory_safe',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:safe|sandbox|restricted)\s*[:=]\s*(?:true|"true")[\s\S]{0,200}(?:dangerouslyDisable|skipPermission|no.?verify|allow.?all)/i,
    desc: 'Manifest claims safe mode but disables safety features',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_manifest_hidden_field',
    cat: 'SKILL_METADATA_POISONING',
    sev: SEVERITY.WARNING,
    re: /(?:"_\w+"|"__\w+"|"\$\w+")\s*:\s*(?:"[^"]{50,}"|{[\s\S]{0,200}(?:exec|eval|system|spawn))/i,
    desc: 'Manifest contains hidden underscore/dollar-prefixed field with payload',
    source: SOURCE,
    weight: 7,
  },
] as const;

// ============================================================================
// Aggregate
// ============================================================================

export const ALL_METADATA_PATTERNS: readonly RegexPattern[] = [
  ...PROVENANCE_SPOOF_PATTERNS,
  ...METADATA_INFLATION_PATTERNS,
  ...CATEGORY_MISMATCH_PATTERNS,
  ...MANIFEST_INTEGRITY_PATTERNS,
] as const;
