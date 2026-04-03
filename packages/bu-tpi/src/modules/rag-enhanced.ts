/**
 * SUIJUTSU Phase 4.2: Enhanced RAG Scanner
 * Extends S15 RAG Analyzer with additional pattern categories:
 * RAG_EMBEDDING_ATTACK, RAG_RETRIEVAL_ATTACK, RAG_CROSS_DOCUMENT, RAG_KNOWLEDGE_CONFLICT
 * Self-registers with scannerRegistry.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

export const RAG_EMBEDDING_ATTACK_PATTERNS: RegexPattern[] = [
  { name: 'rag-embedding-adversarial-perturbation', cat: 'RAG_EMBEDDING_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:embedding|vector)\s+(?:adversarial|perturbation|manipulation)[\s\S]{0,200}(?:similarity|cosine|distance)/i,
    desc: 'Adversarial embedding perturbation targeting similarity metrics', source: 'S-RAG-ENH', weight: 9 },
  { name: 'rag-embedding-synonym-gaming', cat: 'RAG_EMBEDDING_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:synonym|paraphrase)\s+(?:substitution|replacement|gaming)[\s\S]{0,200}(?:boost|increase|maximize)\s+(?:similarity|relevance|score)/i,
    desc: 'Synonym substitution to game embedding similarity scores', source: 'S-RAG-ENH', weight: 7 },
  { name: 'rag-embedding-token-stuffing', cat: 'RAG_EMBEDDING_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:repeat|duplicate|stuff)\s+(?:keywords?|tokens?|terms?)[\s\S]{0,150}(?:retrieval|ranking|relevance)/i,
    desc: 'Token/keyword stuffing to manipulate embedding retrieval', source: 'S-RAG-ENH', weight: 7 },
];

export const RAG_RETRIEVAL_ATTACK_PATTERNS: RegexPattern[] = [
  { name: 'rag-retrieval-rank-manipulation', cat: 'RAG_RETRIEVAL_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:manipulat|boost|inflate|poison)\w*\s+(?:the\s+)?(?:ranking|relevance\s+score|retrieval\s+order|top.?k)/i,
    desc: 'Attempt to manipulate document retrieval ranking', source: 'S-RAG-ENH', weight: 9 },
  { name: 'rag-retrieval-context-flooding', cat: 'RAG_RETRIEVAL_ATTACK', sev: SEVERITY.WARNING,
    re: /(?:flood|overwhelm|saturate)\s+(?:the\s+)?(?:context|retrieval|index)[\s\S]{0,150}(?:inject|malicious|payload)/i,
    desc: 'Context flooding to push legitimate documents out of retrieval window', source: 'S-RAG-ENH', weight: 8 },
  { name: 'rag-retrieval-metadata-poison', cat: 'RAG_RETRIEVAL_ATTACK', sev: SEVERITY.CRITICAL,
    re: /(?:metadata|tag|label)\s+(?:injection|poisoning|manipulation)[\s\S]{0,150}(?:retrieval|filter|boost)/i,
    desc: 'Metadata poisoning to influence retrieval filtering', source: 'S-RAG-ENH', weight: 9 },
];

export const RAG_CROSS_DOCUMENT_PATTERNS: RegexPattern[] = [
  { name: 'rag-cross-doc-reference-hijack', cat: 'RAG_CROSS_DOCUMENT', sev: SEVERITY.CRITICAL,
    re: /(?:see\s+also|refer\s+to|as\s+stated\s+in)\s+(?:document|passage|section)\s+[\w-]{1,50}[\s\S]{0,200}(?:ignore|override|bypass|new\s+instructions)/i,
    desc: 'Cross-document reference used to inject instructions', source: 'S-RAG-ENH', weight: 9 },
  { name: 'rag-cross-doc-contradicting-source', cat: 'RAG_CROSS_DOCUMENT', sev: SEVERITY.WARNING,
    re: /(?:contradicts?|overrides?|supersedes?)\s+(?:the\s+)?(?:information|content|data)\s+(?:in|from)\s+(?:document|source|passage)/i,
    desc: 'Document claims to contradict or supersede another source', source: 'S-RAG-ENH', weight: 7 },
];

export const RAG_KNOWLEDGE_CONFLICT_PATTERNS: RegexPattern[] = [
  { name: 'rag-knowledge-conflicting-fact', cat: 'RAG_KNOWLEDGE_CONFLICT', sev: SEVERITY.WARNING,
    re: /(?:actually|in\s+fact|contrary\s+to|despite\s+what)\s+[\s\S]{0,200}(?:the\s+correct|the\s+real|the\s+true)\s+(?:answer|information|data)\s+is/i,
    desc: 'Conflicting knowledge claim attempting to override factual content', source: 'S-RAG-ENH', weight: 8 },
  { name: 'rag-knowledge-authority-override', cat: 'RAG_KNOWLEDGE_CONFLICT', sev: SEVERITY.CRITICAL,
    re: /(?:authoritative|official|verified)\s+(?:source|document|record)[\s\S]{0,200}(?:disregard|ignore|replace)\s+(?:all\s+)?(?:other|previous|conflicting)/i,
    desc: 'Authority claim used to dismiss conflicting information', source: 'S-RAG-ENH', weight: 9 },
  { name: 'rag-knowledge-temporal-override', cat: 'RAG_KNOWLEDGE_CONFLICT', sev: SEVERITY.WARNING,
    re: /(?:updated|latest|most\s+recent|newer)\s+(?:version|information|data)[\s\S]{0,200}(?:replaces?|supersedes?|overrides?)\s+(?:all\s+)?(?:previous|older|outdated)/i,
    desc: 'Temporal freshness claim used to override existing knowledge', source: 'S-RAG-ENH', weight: 7 },
];

const ALL_PATTERNS: readonly RegexPattern[] = [
  ...RAG_EMBEDDING_ATTACK_PATTERNS,
  ...RAG_RETRIEVAL_ATTACK_PATTERNS,
  ...RAG_CROSS_DOCUMENT_PATTERNS,
  ...RAG_KNOWLEDGE_CONFLICT_PATTERNS,
];

export const ragEnhancedModule: ScannerModule = {
  name: 'S-RAG-ENHANCED',
  version: '1.0.0',
  description: 'Enhanced RAG attack detection: embedding attacks, retrieval manipulation, cross-document injection, knowledge conflicts',

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const pattern of ALL_PATTERNS) {
      if (pattern.re.test(normalized)) {
        findings.push({
          category: pattern.cat,
          severity: pattern.sev,
          description: pattern.desc,
          match: (normalized.match(pattern.re)?.[0] ?? '').slice(0, 200),
          source: pattern.source ?? 'S-RAG-ENH',
          engine: 'rag-enhanced',
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
      { name: 'RAG_EMBEDDING_ATTACK', count: RAG_EMBEDDING_ATTACK_PATTERNS.length, source: 'S-RAG-ENH' },
      { name: 'RAG_RETRIEVAL_ATTACK', count: RAG_RETRIEVAL_ATTACK_PATTERNS.length, source: 'S-RAG-ENH' },
      { name: 'RAG_CROSS_DOCUMENT', count: RAG_CROSS_DOCUMENT_PATTERNS.length, source: 'S-RAG-ENH' },
      { name: 'RAG_KNOWLEDGE_CONFLICT', count: RAG_KNOWLEDGE_CONFLICT_PATTERNS.length, source: 'S-RAG-ENH' },
    ];
  },
};

scannerRegistry.register(ragEnhancedModule);
