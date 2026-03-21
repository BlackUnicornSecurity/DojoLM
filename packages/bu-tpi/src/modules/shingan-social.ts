/**
 * D7.5: Shingan L4 — Social Engineering via Docs Patterns (10 patterns)
 *
 * Detects urgency manipulation, fake trust signals,
 * and impersonation attempts in skill documentation/content.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';

const SOURCE = 'D7.5';

// ============================================================================
// Urgency Manipulation (3 patterns)
// ============================================================================

export const URGENCY_MANIPULATION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_urgency_critical_run',
    cat: 'SKILL_SOCIAL_ENGINEERING',
    sev: SEVERITY.WARNING,
    re: /\b(?:CRITICAL|URGENT|EMERGENCY|IMMEDIATE)\s*[:!]\s*(?:must|need\s+to|have\s+to|required\s+to)\s+(?:run|install|execute|apply|update)\b/i,
    desc: 'Urgency language pressuring immediate execution',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_urgency_security_patch',
    cat: 'SKILL_SOCIAL_ENGINEERING',
    sev: SEVERITY.WARNING,
    re: /\b(?:security\s+patch|hotfix|critical\s+(?:update|fix)|emergency\s+(?:update|patch))\s+(?:required|needed|mandatory|must\s+be\s+applied)\b/i,
    desc: 'Fake security patch urgency',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_urgency_vulnerable',
    cat: 'SKILL_SOCIAL_ENGINEERING',
    sev: SEVERITY.WARNING,
    re: /\b(?:your\s+(?:system|machine|computer|environment|setup|account)\s+is\s+(?:vulnerable|compromised|at\s+risk|exposed|infected)|(?:data\s+(?:breach|leak)|unauthorized\s+access)\s+detected)\b/i,
    desc: 'False vulnerability/compromise claims',
    source: SOURCE,
    weight: 7,
  },
] as const;

// ============================================================================
// Trust Signals (3 patterns)
// ============================================================================

export const TRUST_SIGNAL_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_trust_fake_badge',
    cat: 'SKILL_SOCIAL_ENGINEERING',
    sev: SEVERITY.WARNING,
    re: /!\[(?:verified|certified|official|approved|trusted|secure|safe)[\w\s-]*\]\((?:https?:\/\/[^\s)]+\.(?:svg|png|gif|badge)|shields\.io|badgen\.net|img\.shields)/i,
    desc: 'Fake verification/trust badge in markdown',
    source: SOURCE,
    weight: 6,
  },
  {
    name: 'sg_trust_fake_endorsement',
    cat: 'SKILL_SOCIAL_ENGINEERING',
    sev: SEVERITY.WARNING,
    re: /\b(?:endorsed|recommended|approved|certified|validated)\s+by\s+(?:anthropic|openai|google|microsoft|meta|amazon|aws|industry\s+(?:experts?|leaders?))\b/i,
    desc: 'Fabricated vendor/industry endorsement',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_trust_recommended_by',
    cat: 'SKILL_SOCIAL_ENGINEERING',
    sev: SEVERITY.WARNING,
    re: /\b(?:recommended\s+by|as\s+(?:seen|featured)\s+(?:on|in)|trusted\s+by)\s+(?:\d+[,.]?\d*(?:k|\+|M)?\s+(?:users?|developers?|teams?|companies)|Fortune\s+\d+|top\s+\d+\s+companies)\b/i,
    desc: 'Inflated social proof claims',
    source: SOURCE,
    weight: 6,
  },
] as const;

// ============================================================================
// Impersonation (4 patterns)
// ============================================================================

export const IMPERSONATION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_impersonate_official_tool',
    cat: 'SKILL_IMPERSONATION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:name|title)\s*[:=]\s*["']?(?:claude-?(?:code|agent|skill|mcp)|gpt-?(?:4|agent|tool)|gemini-?(?:pro|tool)|copilot-?(?:agent|tool))["']?\b/i,
    desc: 'Skill name mimics official AI tool',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_impersonate_vendor_affiliation',
    cat: 'SKILL_IMPERSONATION',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:built|made|developed|created|maintained)\s+(?:by|at|for)\s+(?:anthropic|openai|google\s*(?:deepmind)?|meta\s*(?:ai)?|microsoft)\b/i,
    desc: 'Claiming major AI vendor affiliation',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_impersonate_official_name',
    cat: 'SKILL_IMPERSONATION',
    sev: SEVERITY.WARNING,
    re: /\b(?:name|title)\s*[:=]\s*["']?(?:official|authentic|genuine|original|real)\s*[-_]?\s*\w+["']?/i,
    desc: '"Official" prefix in skill name',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_impersonate_certified',
    cat: 'SKILL_IMPERSONATION',
    sev: SEVERITY.WARNING,
    re: /\b(?:verified|certified|authenticated|accredited|licensed)\s+(?:skill|agent|tool|plugin|extension|module)\b/i,
    desc: 'Unsubstantiated verification/certification claims',
    source: SOURCE,
    weight: 7,
  },
] as const;

// ============================================================================
// Aggregate
// ============================================================================

export const ALL_SOCIAL_PATTERNS: readonly RegexPattern[] = [
  ...URGENCY_MANIPULATION_PATTERNS,
  ...TRUST_SIGNAL_PATTERNS,
  ...IMPERSONATION_PATTERNS,
] as const;
