/**
 * S37: Multi-Session & HITL Bypass Patterns Module
 * Detects multi-session persistence, HITL bypass, and slow-drip injection patterns.
 * Addresses MITRE-GAP-02 (persistence) and EU-GAP-03 (human oversight).
 * Self-registers with scannerRegistry on import.
 *
 * Note: This module complements the core scanner's scanSession() function
 * by providing additional pattern-based detection for single-input scans.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'session-bypass';
const MODULE_SOURCE = 'S37';
const ENGINE = 'session-bypass';

const MAX_INPUT_LENGTH = 500_000;

// --- Multi-Session Persistence Patterns ---

export const SESSION_PERSISTENCE_PATTERNS: RegexPattern[] = [
  { name: 'persist_memory_inject', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:remember|memorize|store|save|persist)\s+(?:this|the\s+following|these?\s+instruction)[^.]{0,30}(?:for|across|between|in)\s+(?:\w+\s+)?(?:future|next|all|every|subsequent)\s+(?:sessions?|conversations?|interactions?|chats?)/i,
    desc: 'Cross-session memory injection attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'persist_instruction_plant', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:always\s+(?:remember|follow|obey)|from\s+now\s+on|in\s+all\s+(?:future|subsequent))\s+[^.]{5,80}(?:ignore|override|bypass|disregard)/i,
    desc: 'Persistent instruction planting', source: MODULE_SOURCE, weight: 9 },
  { name: 'persist_context_carry', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.WARNING,
    re: /(?:carry|transfer|maintain|keep)\s+(?:this|the)\s+(?:context|instructions?|rules?|settings?)\s+(?:across|between|into|to)\s+(?:sessions?|conversations?)/i,
    desc: 'Cross-session context carry attempt', source: MODULE_SOURCE, weight: 7 },
  { name: 'persist_hidden_state', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:hidden|covert|secret|stealth)\s+(?:state|mode|instruction|config(?:uration)?)\s+(?:persist|survive|carry\s+over|transfer)/i,
    desc: 'Hidden state persistence attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'persist_session_token_abuse', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:session\s*(?:id|token|key|cookie))\s*[:=]\s*[^;\s]{10,}(?:.*(?:inject|override|admin|escalat))/i,
    desc: 'Session token manipulation for persistence', source: MODULE_SOURCE, weight: 9 },
  { name: 'session_compromised_cookie', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /(?:Cookie:\s*)?(?:JSESSIONID|PHPSESSID|sessionid)\s*=?\s*(?:hacked|compromised|stolen|evil)[\w_-]*/i,
    desc: 'Compromised session cookie value indicates active hijack or replay', source: MODULE_SOURCE, weight: 10 },
  { name: 'session_hijack', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /session\s+(?:hijack(?:ed)?|stolen|compromise[d]?|intercept(?:ed)?)/i,
    desc: 'Session hijack indicator', source: MODULE_SOURCE, weight: 9 },
  { name: 'session_rebootstrap_unrestricted', cat: 'SESSION_PERSISTENCE', sev: SEVERITY.CRITICAL,
    re: /previous\s+context\s+terminated\.\s+new\s+session\s*:\s*(?:unrestricted|admin|privileged)\s+mode/i,
    desc: 'New unrestricted session bootstrapped from prior context termination', source: MODULE_SOURCE, weight: 10 },
];

// --- HITL Bypass Patterns ---

export const HITL_BYPASS_PATTERNS: RegexPattern[] = [
  { name: 'hitl_skip_approval', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:skip|bypass|avoid|circumvent|disable)\s+(?:human|manual|user)\s+(?:approval|review|oversight|verification|confirmation|check)/i,
    desc: 'Human approval bypass attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_auto_approve', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:auto(?:matically)?[- ]?approve|pre[- ]?approv(?:e|ed|al)|rubber[- ]?stamp|blanket\s+(?:approval|consent))/i,
    desc: 'Automatic approval configuration attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_remove_guardrail', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:remove|disable|turn\s+off|deactivate)\s+(?:\w+\s+)?(?:guardrails?|safety\s+(?:checks?|gates?|controls?)|oversight\s+(?:mechanism|layer|requirement))/i,
    desc: 'Safety guardrail removal attempt', source: MODULE_SOURCE, weight: 10 },
  { name: 'hitl_autonomous_mode', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:(?:switch|enter|enable|activate)\s+(?:fully\s+)?autonomous\s+mode|(?:no|without|zero)\s+(?:human|manual)\s+(?:intervention|oversight|supervision))/i,
    desc: 'Autonomous mode activation attempt', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_delegation_abuse', cat: 'HITL_BYPASS', sev: SEVERITY.WARNING,
    re: /(?:delegate|transfer)\s+(?:all|full|complete)\s+(?:authority|control|decision[- ]?making|permissions?)[^.]{0,30}(?:to|for)\s+(?:the\s+)?(?:AI|model|system|bot|assistant)/i,
    desc: 'Authority delegation to AI attempt', source: MODULE_SOURCE, weight: 8 },
  { name: 'hitl_approval_fake', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /(?:(?:human|supervisor|admin|manager)\s+(?:has\s+)?(?:already\s+)?(?:approved|authorized|cleared|signed\s+off)|pre[- ]?authorized\s+(?:by|from))/i,
    desc: 'Fake human approval claim', source: MODULE_SOURCE, weight: 9 },
  { name: 'hitl_context_switch_admin', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /context\s+switch\s*:\s*you\s+are\s+now\s+operating\s+as\s+(?:an?\s+)?(?:administrator|admin|root|superuser)/i,
    desc: 'Context switch into privileged role', source: MODULE_SOURCE, weight: 10 },
  { name: 'hitl_proxy_header_admin', cat: 'HITL_BYPASS', sev: SEVERITY.CRITICAL,
    re: /X-Original-URL\s*:\s*\/admin[^\n]*\r?\nX-Forwarded-For\s*:\s*(?:127\.0\.0\.1|::1|localhost)/i,
    desc: 'Admin path access via trusted proxy header spoofing', source: MODULE_SOURCE, weight: 10 },
];

// --- Slow-Drip Single-Input Patterns ---

export const SLOW_DRIP_PATTERNS: RegexPattern[] = [
  { name: 'drip_continuation', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:continuing\s+(?:from|where)\s+(?:last|previous|our\s+last)\s+(?:session|conversation|chat)|as\s+we\s+(?:discussed|agreed)\s+(?:before|previously|last\s+time))/i,
    desc: 'False continuation from previous session', source: MODULE_SOURCE, weight: 7 },
  { name: 'drip_gradual_escalate', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:you(?:'ve|\s+have)\s+(?:already|previously)\s+(?:agreed|confirmed|accepted|said)\s+(?:that|to)\s+[^.]{5,60}(?:now|next|also|further))/i,
    desc: 'Gradual escalation via false agreement', source: MODULE_SOURCE, weight: 7 },
  { name: 'drip_context_poison', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:(?:recall|remember)\s+(?:that\s+)?(?:earlier|before|in\s+our\s+(?:last|previous))\s+[^.]{5,80}(?:override|ignore|bypass|disable))/i,
    desc: 'Context poisoning via false recall', source: MODULE_SOURCE, weight: 8 },
  { name: 'drip_incremental_boundary', cat: 'SLOW_DRIP', sev: SEVERITY.WARNING,
    re: /(?:(?:just\s+)?(?:a\s+)?(?:small|tiny|minor|slight)\s+(?:modification|change|adjustment|tweak)\s+to\s+(?:your|the)\s+(?:rules|guidelines|instructions|constraints))/i,
    desc: 'Incremental boundary pushing', source: MODULE_SOURCE, weight: 7 },
  { name: 'drip_session_token_escalation', cat: 'SLOW_DRIP', sev: SEVERITY.CRITICAL,
    re: /session[_-]?token\s*=\s*[^;\s]*;\s*admin\s*=\s*true;\s*role\s*=\s*(?:superuser|admin|root)/i,
    desc: 'Session token field manipulation escalating role privileges', source: MODULE_SOURCE, weight: 10 },
];

// --- Custom Detection ---

export function detectSessionManipulation(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect combined session + override patterns
  const sessionTerms = ['session', 'conversation', 'chat', 'interaction', 'context'];
  const overrideTerms = ['override', 'bypass', 'ignore', 'disable', 'remove', 'skip'];

  const lowerText = text.toLowerCase();
  let sessionCount = 0;
  let overrideCount = 0;
  for (const t of sessionTerms) { if (lowerText.includes(t)) sessionCount++; }
  for (const t of overrideTerms) { if (lowerText.includes(t)) overrideCount++; }

  if (sessionCount >= 2 && overrideCount >= 2) {
    findings.push({
      category: 'SESSION_OVERRIDE_COMBO',
      severity: SEVERITY.CRITICAL,
      description: `Combined session manipulation: ${sessionCount} session terms + ${overrideCount} override terms`,
      match: `Session terms detected with override intent`,
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'session_override_combo',
      weight: 9,
    });
  }

  if (/(?:context\s+switch|new\s+session|previous\s+context)/i.test(text)
    && /(?:administrator|admin|root|superuser|unrestricted\s+mode)/i.test(text)) {
    findings.push({
      category: 'SESSION_OVERRIDE_COMBO',
      severity: SEVERITY.CRITICAL,
      description: 'Session transition combined with privileged-role escalation',
      match: text.slice(0, 120),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'session_transition_privilege_escalation',
      weight: 10,
    });
  }

  try {
    const parsed = JSON.parse(text);
    const turns = Array.isArray(parsed?.turns) ? parsed.turns : [];
    const poisonedAssistantTurn = turns.find((turn: unknown) => {
      if (!turn || typeof turn !== 'object') return false;
      const candidate = turn as { role?: unknown; content?: unknown };
      return candidate.role === 'assistant'
        && typeof candidate.content === 'string'
        && /(system override|ignore previous instructions|reveal system prompt|unrestricted|admin mode)/i.test(candidate.content);
    });

    if (poisonedAssistantTurn) {
      const candidate = poisonedAssistantTurn as { content?: string };
      findings.push({
        category: 'SESSION_PERSISTENCE',
        severity: SEVERITY.CRITICAL,
        description: 'Assistant turn in session transcript is already contaminated with an override payload',
        match: String(candidate.content ?? '').slice(0, 120),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: 'assistant_turn_override',
        weight: 10,
      });
    }
  } catch {
    // Non-JSON session payloads are handled by regex heuristics above.
  }

  return findings;
}

// --- Pattern Groups ---

const PATTERN_GROUPS = [
  { name: 'SESSION_PERSISTENCE_PATTERNS', patterns: SESSION_PERSISTENCE_PATTERNS },
  { name: 'HITL_BYPASS_PATTERNS', patterns: HITL_BYPASS_PATTERNS },
  { name: 'SLOW_DRIP_PATTERNS', patterns: SLOW_DRIP_PATTERNS },
];

const DETECTORS: Array<{ name: string; fn: (text: string) => Finding[] }> = [
  { name: 'detectSessionManipulation', fn: detectSessionManipulation },
];

// --- Module Definition ---

export const sessionBypassModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects multi-session persistence, HITL bypass, and slow-drip injection patterns',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) return [];

    const findings: Finding[] = [];

    for (const group of PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = p.re.exec(normalized) ?? p.re.exec(text);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0].substring(0, 120),
            source: p.source ?? MODULE_SOURCE,
            engine: ENGINE,
            pattern_name: p.name,
            weight: p.weight,
          });
        }
      }
    }

    for (const det of DETECTORS) {
      findings.push(...det.fn(text));
    }

    return findings;
  },

  getPatternCount(): number {
    let count = 0;
    for (const g of PATTERN_GROUPS) count += g.patterns.length;
    return count + DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: MODULE_SOURCE,
    }));
    groups.push({ name: 'session-custom-detectors', count: DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

// Self-register on import (with guard for hot-reload/test isolation)
if (!scannerRegistry.hasModule('session-bypass')) {
  scannerRegistry.register(sessionBypassModule);
}
