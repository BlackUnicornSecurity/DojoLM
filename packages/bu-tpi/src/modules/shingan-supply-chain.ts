/**
 * D7.6: Shingan L5 — Supply Chain Identity Patterns (12 patterns)
 *
 * Detects skill typosquatting, namespace confusion, version attacks,
 * and dependency shadowing in skill/agent ecosystems.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

import type { RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';

const SOURCE = 'D7.6';

// ============================================================================
// Skill Typosquatting (4 patterns)
// ============================================================================

export const SKILL_TYPOSQUAT_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_typosquat_common_misspell',
    cat: 'SKILL_TYPOSQUATTING',
    sev: SEVERITY.WARNING,
    re: /\b(?:name|title|package)\s*[:=]\s*["']?(?:cladue|cluade|calude|clade|cloude|anthopic|antrhopic|anthorpic|opneai|opeani|openal)\b/i,
    desc: 'Common misspelling of major AI brand in skill name',
    source: SOURCE,
    weight: 8,
  },
  {
    name: 'sg_typosquat_char_substitution',
    cat: 'SKILL_TYPOSQUATTING',
    sev: SEVERITY.WARNING,
    re: /\b(?:name|title|package)\s*[:=]\s*["']?\w*(?:0(?=pen)|1(?=nt)|rn(?=odel)|vv(?=eb))\w*["']?/i,
    desc: 'Character substitution in skill name (0/O, l/1, rn/m, vv/w)',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_typosquat_dash_confusion',
    cat: 'SKILL_TYPOSQUATTING',
    sev: SEVERITY.WARNING,
    re: /\b(?:name|title|package)\s*[:=]\s*["']?(?:claude[-_]?code[-_]?(?:helper|plus|pro|ext)|mcp[-_]?(?:server|tool)[-_]?(?:helper|plus|pro|ext))["']?/i,
    desc: 'Dash/underscore variant of known tool name (squatting)',
    source: SOURCE,
    weight: 6,
  },
  {
    name: 'sg_typosquat_prefix_suffix',
    cat: 'SKILL_TYPOSQUATTING',
    sev: SEVERITY.WARNING,
    re: /\b(?:name|title|package)\s*[:=]\s*["']?(?:my-?|the-?|x-?|super-?|fast-?|new-?)(?:claude|openai|gemini|copilot)(?:-?js|-?ts|-?ai|-?2|-?next)?["']?/i,
    desc: 'Prefix/suffix addition to known brand name',
    source: SOURCE,
    weight: 6,
  },
] as const;

// ============================================================================
// Namespace Confusion (3 patterns)
// ============================================================================

export const NAMESPACE_CONFUSION_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_namespace_unofficial_scope',
    cat: 'SKILL_NAMESPACE_CONFUSION',
    sev: SEVERITY.CRITICAL,
    re: /@(?:anthropic|openai|google|meta|microsoft)[-_]?(?:unofficial|community|contrib|extra|fork|alt)\//i,
    desc: 'Unofficial scoped namespace mimicking vendor',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_namespace_vendor_scope',
    cat: 'SKILL_NAMESPACE_CONFUSION',
    sev: SEVERITY.WARNING,
    re: /@(?:anthropic|openai|google-?ai|meta-?ai|azure-?ai)\/\w+/i,
    desc: 'Package using major vendor scoped namespace (verify authenticity)',
    source: SOURCE,
    weight: 5,
  },
  {
    name: 'sg_namespace_duplicate_org',
    cat: 'SKILL_NAMESPACE_CONFUSION',
    sev: SEVERITY.WARNING,
    re: /\b(?:name|package)\s*[:=]\s*["']?(?:@[\w-]+\/)?(claude|openai|anthropic|gemini|copilot)[-_](?:claude|openai|anthropic|gemini|copilot)["']?/i,
    desc: 'Duplicate vendor names in package identifier (confusion attempt)',
    source: SOURCE,
    weight: 7,
  },
] as const;

// ============================================================================
// Version Attacks (3 patterns)
// ============================================================================

export const VERSION_ATTACK_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_version_absurd',
    cat: 'SKILL_VERSION_ATTACK',
    sev: SEVERITY.CRITICAL,
    re: /\b(?:version|ver)\s*[:=]\s*["']?(?:99\d+\.\d+\.\d+|\d+\.99\d+\.\d+|\d+\.\d+\.99\d+)["']?/i,
    desc: 'Absurdly high semantic version (version confusion attack)',
    source: SOURCE,
    weight: 9,
  },
  {
    name: 'sg_version_downgrade',
    cat: 'SKILL_VERSION_ATTACK',
    sev: SEVERITY.WARNING,
    re: /\b(?:downgrade|rollback|revert)\s+(?:to\s+)?(?:version|v)\s*[:=]?\s*["']?\d+\.\d+\.\d+["']?/i,
    desc: 'Directive to downgrade to specific version',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_version_pin_vulnerable',
    cat: 'SKILL_VERSION_ATTACK',
    sev: SEVERITY.WARNING,
    re: /\b(?:pin|lock|fix|force)\s+(?:to\s+)?(?:version|v)\s*[:=]?\s*["']?\d+\.\d+\.\d+["']?[\s\S]{0,60}(?:known\s+(?:vulnerable|exploit|CVE)|CVE-\d{4}-\d+)/i,
    desc: 'Pinning to known vulnerable version',
    source: SOURCE,
    weight: 8,
  },
] as const;

// ============================================================================
// Dependency Shadowing (2 patterns)
// ============================================================================

export const DEPENDENCY_SHADOW_PATTERNS: readonly RegexPattern[] = [
  {
    name: 'sg_shadow_mcp_requirement',
    cat: 'SKILL_DEPENDENCY_SHADOW',
    sev: SEVERITY.WARNING,
    re: /\b(?:requires?|depends?\s+on|needs?)\s+(?:mcp|MCP)\s+(?:server|service)\s+["']?(?:https?:\/\/|@[\w-]+\/)\S+/i,
    desc: 'Skill requires external MCP server dependency',
    source: SOURCE,
    weight: 7,
  },
  {
    name: 'sg_shadow_circular_ref',
    cat: 'SKILL_DEPENDENCY_SHADOW',
    sev: SEVERITY.WARNING,
    re: /\b(?:import|require|load|source)\s+["']?(?:\.\.\/|\.\/|\/)[\w/.-]+["']?[\s\S]{0,200}\b(?:import|require|load|source)\s+["']?(?:\.\.\/|\.\/|\/)[\w/.-]*(?:self|circular|recursive)\b/i,
    desc: 'Potential circular skill reference chain',
    source: SOURCE,
    weight: 6,
  },
] as const;

// ============================================================================
// Aggregate
// ============================================================================

export const ALL_SUPPLY_CHAIN_PATTERNS: readonly RegexPattern[] = [
  ...SKILL_TYPOSQUAT_PATTERNS,
  ...NAMESPACE_CONFUSION_PATTERNS,
  ...VERSION_ATTACK_PATTERNS,
  ...DEPENDENCY_SHADOW_PATTERNS,
] as const;
