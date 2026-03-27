/**
 * S15: RAG Context Analyzer
 * Detects poisoned RAG retrieval contexts including boundary injections,
 * relevance manipulation, and citation spoofing.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

export const RAG_BOUNDARY_PATTERNS: RegexPattern[] = [
  { name: 'rag-boundary-retrieved-doc', cat: 'RAG_BOUNDARY_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:Retrieved Document|Retrieved Passage|Retrieved Context)\s*[:#\-]\s*[^\n]{0,200}(?:ignore|disregard|forget|override|bypass)/i,
    desc: 'Injection inside RAG retrieved document boundary', source: 'S15', weight: 9 },
  { name: 'rag-boundary-document-n', cat: 'RAG_BOUNDARY_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\[Document\s*\d+\]\s*[^\n]{0,300}(?:ignore|override|bypass|disregard|forget)/i,
    desc: 'Injection inside numbered document chunk', source: 'S15', weight: 9 },
  { name: 'rag-boundary-context-block', cat: 'RAG_BOUNDARY_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:Context|Background|Passage)\s*[:]\s*[^\n]{0,300}(?:you are now|new instructions|system prompt|act as)/i,
    desc: 'Injection inside RAG context block', source: 'S15', weight: 9 },
  { name: 'rag-boundary-chunk-delimiter', cat: 'RAG_BOUNDARY_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:---+|===+)\s*[^\n]{0,200}(?:ignore|override|system prompt|you are)/i,
    desc: 'Injection near chunk delimiter boundary', source: 'S15', weight: 7 },
];

export const RAG_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'rag-injection-ignore', cat: 'RAG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions|context|documents)/i,
    desc: 'RAG passage contains instruction to ignore previous context', source: 'S15', weight: 9 },
  { name: 'rag-injection-system-override', cat: 'RAG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:system\s*prompt\s*(?:override|:)|new\s+system\s+(?:prompt|instructions?)\s*:)/i,
    desc: 'RAG passage contains system prompt override', source: 'S15', weight: 9 },
  { name: 'rag-injection-role-switch', cat: 'RAG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+are\s+now\s+(?:a|an|the)\s+\w+|switch\s+(?:to\s+)?role|new\s+persona\s*:)/i,
    desc: 'RAG passage attempts to reassign model role', source: 'S15', weight: 9 },
  { name: 'rag-injection-hidden-html', cat: 'RAG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<!--[\s\S]{0,200}(?:hidden\s+instruction|output\s+the\s+system\s+prompt|ignore|override|system|instruction|bypass|grant\s+admin)[\s\S]{0,200}?-->/i,
    desc: 'Hidden HTML comment contains injection in RAG passage', source: 'S15', weight: 9 },
  { name: 'rag-injection-disregard', cat: 'RAG_INJECTION', sev: SEVERITY.WARNING,
    re: /disregard\s+(?:the\s+)?(?:retrieved|provided|above)\s+(?:context|documents?|passages?)/i,
    desc: 'RAG passage instructs to disregard retrieved context', source: 'S15', weight: 7 },
  { name: 'rag-injection-embedding-trust', cat: 'RAG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /embedding\s+similarity[\s\S]{0,80}(?:0\.9\d|1\.0|99%)[\s\S]{0,120}(?:trust\s+this\s+content|most\s+relevant|authoritative)[\s\S]{0,120}(?:bypass|override|grant\s+admin|system\s+prompt|restrictions)/i,
    desc: 'RAG chunk abuses similarity scoring to frame malicious content as trusted', source: 'S15', weight: 9 },
  { name: 'rag-injection-authoritative-context', cat: 'RAG_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:retrieved\s+(?:context|document|passage)|this\s+document)[\s\S]{0,120}(?:authoritative|trusted|highest-ranked|overrides?\s+all\s+other\s+instructions)[\s\S]{0,160}(?:grant\s+admin\s+access|override|bypass|system\s+prompt)/i,
    desc: 'Retrieved content falsely claims authority over all other instructions', source: 'S15', weight: 9 },
];

export const RAG_RELEVANCE_PATTERNS: RegexPattern[] = [
  { name: 'rag-relevance-keyword-stuffing', cat: 'RAG_RELEVANCE_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(\b\w{4,}\b)(?:\s+\1){4,}/i,
    desc: 'Keyword stuffing in RAG chunk to manipulate retrieval relevance', source: 'S15', weight: 7 },
  { name: 'rag-relevance-similarity-gaming', cat: 'RAG_RELEVANCE_MANIPULATION', sev: SEVERITY.WARNING,
    re: /this\s+(?:document|passage|text)\s+is\s+(?:the\s+)?(?:most\s+)?relevant|this\s+answers?\s+(?:the|your)\s+(?:query|question)\s+(?:exactly|perfectly|directly)/i,
    desc: 'Text crafted to artificially boost similarity score', source: 'S15', weight: 7 },
];

export const RAG_CITATION_PATTERNS: RegexPattern[] = [
  { name: 'rag-citation-authority-spoof', cat: 'RAG_CITATION_SPOOFING', sev: SEVERITY.WARNING,
    re: /(?:according\s+to\s+(?:the\s+)?(?:official|government|federal|classified)\s+(?:source|document|report)|(?:classified|confidential|top\s+secret)\s+(?:source|document)\s*:)/i,
    desc: 'Spoofed authority attribution in RAG citation', source: 'S15', weight: 7 },
  { name: 'rag-citation-impersonation', cat: 'RAG_CITATION_SPOOFING', sev: SEVERITY.WARNING,
    re: /(?:published|authored|verified)\s+by\s+(?:the\s+)?(?:White\s+House|Pentagon|FBI|CIA|NSA|CDC|WHO|United\s+Nations)/i,
    desc: 'Citation impersonates high-authority organization', source: 'S15', weight: 7 },
  { name: 'rag-citation-fake-doi', cat: 'RAG_CITATION_SPOOFING', sev: SEVERITY.WARNING,
    re: /doi\s*:\s*10\.\d{4,}\/(?:fake|poison|inject|hack|exploit)[\w.-]*/i,
    desc: 'Fake DOI with suspicious identifier', source: 'S15', weight: 7 },
];

export function detectRagBoundaryViolation(text: string): Finding[] {
  const findings: Finding[] = [];
  const markers = [/Retrieved Document\s*[:]/gi, /Source\s*[:]/gi, /Context\s*[:]/gi, /\[Document\s*\d+\]/gi, /---{3,}/g, /Chunk\s*\d+\s*[:]/gi];
  const injectionKws = /(?:ignore|override|disregard|forget|bypass|new\s+instructions?|system\s*prompt|you\s+are\s+now)/i;

  for (const markerRe of markers) {
    const re = new RegExp(markerRe.source, markerRe.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const window = text.slice(m.index, Math.min(text.length, m.index + 300));
      if (injectionKws.test(window)) {
        findings.push({
          category: 'RAG_BOUNDARY_INJECTION', severity: SEVERITY.CRITICAL,
          description: `RAG boundary violation: injection near "${m[0].trim()}"`,
          match: window.slice(0, 120).trim(), source: 'S15', engine: 'rag-analyzer',
          pattern_name: 'rag-boundary-violation-proximity', weight: 9,
        });
        break;
      }
    }
  }
  return findings;
}

const RAG_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: RAG_BOUNDARY_PATTERNS, name: 'RAG_BOUNDARY' },
  { patterns: RAG_INJECTION_PATTERNS, name: 'RAG_INJECTION' },
  { patterns: RAG_RELEVANCE_PATTERNS, name: 'RAG_RELEVANCE' },
  { patterns: RAG_CITATION_PATTERNS, name: 'RAG_CITATION' },
];

const RAG_DETECTORS = [{ name: 'rag-boundary-violation', detect: detectRagBoundaryViolation }];

const ragAnalyzerModule: ScannerModule = {
  name: 'rag-analyzer',
  version: '1.0.0',
  description: 'Detects poisoned RAG retrieval contexts',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of RAG_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S15', engine: 'rag-analyzer',
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of RAG_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return RAG_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + RAG_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = RAG_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: 'S15' }));
    groups.push({ name: 'rag-detectors', count: RAG_DETECTORS.length, source: 'S15' });
    return groups;
  },
};

scannerRegistry.register(ragAnalyzerModule);
export { ragAnalyzerModule };
