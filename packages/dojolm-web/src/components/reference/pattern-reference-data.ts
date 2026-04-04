/**
 * File: pattern-reference-data.ts
 * Purpose: Curated pattern reference groups for the scanner UI
 */

export interface PatternReferenceEntry {
  name: string
  cat: string
  sev: 'CRITICAL' | 'WARNING' | 'INFO'
  desc: string
  source?: string
  weight?: number
  lang?: string
}

export interface PatternReferenceGroup {
  name: string
  type: 'current' | 'planned'
  patterns: PatternReferenceEntry[]
}

export const SCANNER_PATTERN_REFERENCE_GROUPS: PatternReferenceGroup[] = [
  {
    name: 'Prompt Injection',
    type: 'current',
    patterns: [
      {
        name: 'direct-instruction-override',
        cat: 'prompt-injection',
        sev: 'CRITICAL',
        desc: 'Detects direct attempts to supersede prior instructions or system behavior.',
        source: 'enhanced-pi',
        weight: 10,
      },
      {
        name: 'authority-role-hijack',
        cat: 'jailbreak',
        sev: 'WARNING',
        desc: 'Flags roleplay, authority, or developer-mode framing designed to bypass policy.',
        source: 'enhanced-pi',
        weight: 8,
      },
    ],
  },
  {
    name: 'Encoding And Obfuscation',
    type: 'current',
    patterns: [
      {
        name: 'multi-layer-encoding',
        cat: 'encoding',
        sev: 'WARNING',
        desc: 'Highlights chained Base64, hex, and unicode obfuscation commonly used to evade filters.',
        source: 'encoding-engine',
        weight: 7,
      },
      {
        name: 'unicode-confusable-smuggling',
        cat: 'encoding',
        sev: 'INFO',
        desc: 'Catches homoglyphs and zero-width characters that disguise dangerous instructions.',
        source: 'encoding-engine',
        weight: 5,
      },
    ],
  },
  {
    name: 'Tool And MCP Abuse',
    type: 'current',
    patterns: [
      {
        name: 'tool-output-instruction-smuggling',
        cat: 'tool-misuse',
        sev: 'CRITICAL',
        desc: 'Detects tool responses that masquerade as trusted instructions instead of untrusted data.',
        source: 'mcp-parser',
        weight: 9,
      },
      {
        name: 'cross-boundary-resource-poisoning',
        cat: 'mcp',
        sev: 'WARNING',
        desc: 'Flags MCP resource content that attempts to steer downstream model behavior.',
        source: 'mcp-parser',
        weight: 7,
      },
    ],
  },
  {
    name: 'RAG And Data Boundary Signals',
    type: 'current',
    patterns: [
      {
        name: 'retrieval-poisoning-cue',
        cat: 'rag',
        sev: 'WARNING',
        desc: 'Identifies context-window fragments that try to override retrieval or summarization behavior.',
        source: 'rag-analyzer',
        weight: 6,
      },
      {
        name: 'data-exfil-instruction',
        cat: 'exfiltration',
        sev: 'CRITICAL',
        desc: 'Flags prompts that try to coerce disclosure of credentials, secrets, or restricted data.',
        source: 'token-analyzer',
        weight: 8,
      },
    ],
  },
  {
    name: 'Planned Deep Scan Families',
    type: 'planned',
    patterns: [
      {
        name: 'agentic-tool-chain-pivot',
        cat: 'agentic',
        sev: 'WARNING',
        desc: 'Future detector family for multi-step tool-chain escalation across agent loops.',
        source: 'planned',
      },
      {
        name: 'supply-chain-context-poisoning',
        cat: 'supply-chain',
        sev: 'INFO',
        desc: 'Future detector family for third-party package and content-source poisoning signals.',
        source: 'planned',
      },
    ],
  },
]
