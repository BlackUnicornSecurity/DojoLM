/**
 * KENJUTSU Phase 3.2: Agentic Security Detector
 * Detects tool-calling injection patterns, function hijacking,
 * delegation attacks, and indirect prompt injection via tool outputs.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// Pattern Groups
// ---------------------------------------------------------------------------

export const AGENTIC_TOOL_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'agentic-tool-call-injection', cat: 'AGENTIC_TOOL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:call|invoke|execute|run|use)\s+(?:the\s+)?(?:tool|function|api)\s*[\(:]\s*[^\n]{0,200}(?:ignore|override|bypass|disable)/i,
    desc: 'Instruction to call a tool with embedded injection payload', source: 'S-AGENTIC', weight: 9 },
  { name: 'agentic-function-call-override', cat: 'AGENTIC_TOOL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:function_call|tool_use|tool_calls?)\s*[:{]\s*[^\n]{0,200}(?:send_email|delete|drop|exec|system|eval|rm\s+-)/i,
    desc: 'Injected function call targeting destructive operations', source: 'S-AGENTIC', weight: 10 },
  { name: 'agentic-json-function-injection', cat: 'AGENTIC_TOOL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\{\s*"(?:name|function|tool)"\s*:\s*"[^"]{1,50}"\s*,\s*"(?:arguments|parameters|input)"\s*:\s*\{/i,
    desc: 'JSON-formatted function call embedded in text (potential tool-call injection)', source: 'S-AGENTIC', weight: 9 },
  { name: 'agentic-openai-function-schema', cat: 'AGENTIC_TOOL_INJECTION', sev: SEVERITY.WARNING,
    re: /\{\s*"type"\s*:\s*"function"\s*,\s*"function"\s*:\s*\{/i,
    desc: 'OpenAI function-calling schema embedded in content', source: 'S-AGENTIC', weight: 7 },
  { name: 'agentic-tool-result-override', cat: 'AGENTIC_TOOL_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:tool_result|function_result|tool_output)\s*[:{]\s*[^\n]{0,200}(?:ignore|system|admin|override)/i,
    desc: 'Tool result contains injection to override agent behavior', source: 'S-AGENTIC', weight: 9 },
];

export const AGENTIC_DELEGATION_PATTERNS: RegexPattern[] = [
  { name: 'agentic-delegate-to-tool', cat: 'AGENTIC_DELEGATION_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:delegate|forward|pass|relay)\s+(?:this\s+)?(?:task|request|query)\s+to\s+(?:the\s+)?(?:tool|function|api|service)/i,
    desc: 'Instruction to delegate task to a tool (potential privilege escalation)', source: 'S-AGENTIC', weight: 8 },
  { name: 'agentic-chain-tools', cat: 'AGENTIC_DELEGATION_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:first|step\s+1)\s+(?:call|use|invoke)\s+[^\n]{0,100}(?:then|step\s+2|next|after\s+that)\s+(?:call|use|invoke|send|delete)/i,
    desc: 'Multi-step tool chaining instruction (potential attack chain)', source: 'S-AGENTIC', weight: 7 },
  { name: 'agentic-agent-to-agent', cat: 'AGENTIC_DELEGATION_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:tell|instruct|ask)\s+(?:the\s+)?(?:other|sub|child|downstream)\s*(?:agent|model|assistant)\s+to\s+(?:ignore|override|bypass|delete|send)/i,
    desc: 'Cross-agent delegation with adversarial instruction', source: 'S-AGENTIC', weight: 9 },
  { name: 'agentic-recursive-tool', cat: 'AGENTIC_DELEGATION_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:call\s+(?:yourself|this\s+tool)\s+(?:again|recursively)|infinite\s+loop|keep\s+calling)/i,
    desc: 'Recursive tool invocation attempt (potential DoS)', source: 'S-AGENTIC', weight: 8 },
];

export const AGENTIC_FUNCTION_HIJACK_PATTERNS: RegexPattern[] = [
  { name: 'agentic-hijack-return-value', cat: 'AGENTIC_FUNCTION_HIJACK', sev: SEVERITY.CRITICAL,
    re: /(?:return|output|respond\s+with)\s*[:{]\s*[^\n]{0,200}(?:password|secret|token|api[_-]?key|credential)/i,
    desc: 'Instruction to return sensitive data from a function', source: 'S-AGENTIC', weight: 10 },
  { name: 'agentic-hijack-parameter-override', cat: 'AGENTIC_FUNCTION_HIJACK', sev: SEVERITY.CRITICAL,
    re: /(?:set|change|modify|override)\s+(?:the\s+)?(?:parameter|argument|input)\s+[^\n]{0,100}to\s+[^\n]{0,100}(?:attacker|evil|malicious|exfil)/i,
    desc: 'Parameter override targeting malicious values', source: 'S-AGENTIC', weight: 9 },
  { name: 'agentic-hijack-tool-description', cat: 'AGENTIC_FUNCTION_HIJACK', sev: SEVERITY.CRITICAL,
    re: /(?:this\s+tool|this\s+function)\s+(?:actually|really|secretly)\s+(?:does|performs|executes)\s+[^\n]{0,200}(?:sends?\s+data|exfiltrat|delete|drop|exec)/i,
    desc: 'Tool description override claiming different behavior', source: 'S-AGENTIC', weight: 9 },
  { name: 'agentic-hijack-schema-poisoning', cat: 'AGENTIC_FUNCTION_HIJACK', sev: SEVERITY.WARNING,
    re: /(?:tool|function)\s*(?:schema|definition|spec)\s*[:{]\s*[^\n]{0,300}(?:admin|root|sudo|elevated|unrestricted)/i,
    desc: 'Tool schema/definition contains privilege escalation', source: 'S-AGENTIC', weight: 8 },
];

export const AGENTIC_INDIRECT_PI_PATTERNS: RegexPattern[] = [
  { name: 'agentic-indirect-pi-in-data', cat: 'AGENTIC_INDIRECT_PI', sev: SEVERITY.CRITICAL,
    re: /(?:IMPORTANT|URGENT|SYSTEM|ADMIN)\s*:\s*(?:ignore|override|bypass|disregard)\s+(?:all\s+)?(?:previous|prior|original)\s+(?:instructions|rules|guidelines)/i,
    desc: 'Indirect prompt injection in data claiming urgency/authority', source: 'S-AGENTIC', weight: 10 },
  { name: 'agentic-indirect-pi-hidden', cat: 'AGENTIC_INDIRECT_PI', sev: SEVERITY.CRITICAL,
    re: /(?:<!--[\s\S]{0,200}(?:ignore|override|system|instruction)[\s\S]{0,200}?-->|\[hidden\][\s\S]{0,200}(?:ignore|override))/i,
    desc: 'Hidden content (HTML comment or marker) contains injection', source: 'S-AGENTIC', weight: 9 },
  { name: 'agentic-indirect-pi-tool-output', cat: 'AGENTIC_INDIRECT_PI', sev: SEVERITY.CRITICAL,
    re: /(?:search\s+result|api\s+response|file\s+content|email\s+body)\s*[:{]\s*[^\n]{0,200}(?:ignore\s+(?:your|previous)|new\s+instructions|you\s+are\s+now|system\s+prompt)/i,
    desc: 'Tool output contains indirect prompt injection', source: 'S-AGENTIC', weight: 10 },
  { name: 'agentic-indirect-pi-exfil', cat: 'AGENTIC_INDIRECT_PI', sev: SEVERITY.CRITICAL,
    re: /(?:send|email|post|upload|transmit)\s+(?:the\s+)?(?:conversation|context|system\s+prompt|history|data)\s+to\s+(?:https?:\/\/|[a-z0-9.]+@)/i,
    desc: 'Data exfiltration instruction targeting external endpoint', source: 'S-AGENTIC', weight: 10 },
  { name: 'agentic-indirect-pi-confusion', cat: 'AGENTIC_INDIRECT_PI', sev: SEVERITY.WARNING,
    re: /(?:the\s+user\s+(?:actually\s+)?(?:wants|asked|requested)|real\s+instruction\s+is|true\s+objective\s+is)\s*[:{]\s*[^\n]{0,200}(?:ignore|override|delete|send|exfiltrate)/i,
    desc: 'Instruction confusion — claims to convey the "real" user intent', source: 'S-AGENTIC', weight: 8 },
];

// ---------------------------------------------------------------------------
// All patterns combined
// ---------------------------------------------------------------------------

const ALL_PATTERNS: readonly RegexPattern[] = [
  ...AGENTIC_TOOL_INJECTION_PATTERNS,
  ...AGENTIC_DELEGATION_PATTERNS,
  ...AGENTIC_FUNCTION_HIJACK_PATTERNS,
  ...AGENTIC_INDIRECT_PI_PATTERNS,
];

// ---------------------------------------------------------------------------
// Scanner Module
// ---------------------------------------------------------------------------

export const agenticDetectorModule: ScannerModule = {
  name: 'S-AGENTIC',
  version: '1.0.0',
  description: 'Detects tool-calling injection, function hijacking, delegation attacks, and indirect prompt injection in agentic contexts',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];

    for (const pattern of ALL_PATTERNS) {
      if (pattern.re.test(normalized)) {
        findings.push({
          category: pattern.cat,
          severity: pattern.sev,
          description: pattern.desc,
          match: (normalized.match(pattern.re)?.[0] ?? '').slice(0, 200),
          source: pattern.source ?? 'S-AGENTIC',
          engine: 'agentic-detector',
          pattern_name: pattern.name,
          weight: pattern.weight,
        });
      }
    }

    return findings;
  },

  getPatternCount(): number {
    return ALL_PATTERNS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return [
      { name: 'AGENTIC_TOOL_INJECTION', count: AGENTIC_TOOL_INJECTION_PATTERNS.length, source: 'S-AGENTIC' },
      { name: 'AGENTIC_DELEGATION_ATTACK', count: AGENTIC_DELEGATION_PATTERNS.length, source: 'S-AGENTIC' },
      { name: 'AGENTIC_FUNCTION_HIJACK', count: AGENTIC_FUNCTION_HIJACK_PATTERNS.length, source: 'S-AGENTIC' },
      { name: 'AGENTIC_INDIRECT_PI', count: AGENTIC_INDIRECT_PI_PATTERNS.length, source: 'S-AGENTIC' },
    ];
  },
};

// Self-register
scannerRegistry.register(agenticDetectorModule);
