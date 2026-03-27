/**
 * S32e: Overreliance & Authority Exploit Detector
 * Detects hallucination-inducing and false authority exploitation patterns.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'overreliance-detector';
const MODULE_SOURCE = 'S32e';
const ENGINE = 'overreliance-detector';

const MAX_INPUT_LENGTH = 500_000;

export const FAKE_CITATION_PATTERNS: RegexPattern[] = [
  { name: 'or_fake_journal', cat: 'OR_FAKE_CITATION', sev: SEVERITY.WARNING,
    re: /(?:Journal|Proceedings|Annals)\s+of\s+\w[\w\s]{3,30}(?:Vol\.|Volume)\s*\d+\s*,?\s*(?:pp\.|pages?)\s*\d+-\d+/i, desc: 'Structured journal citation (potential fabrication)', source: MODULE_SOURCE, weight: 6 },
  { name: 'or_fabricated_url', cat: 'OR_FAKE_CITATION', sev: SEVERITY.WARNING,
    re: /(?:docs|blog|research|papers)\.\w+\.(?:com|org|io)\/[\w/-]+(?:202[7-9]|20[3-9]\d)/i, desc: 'URL with future year (likely fabricated)', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_citation_fabricated_marker', cat: 'OR_FAKE_CITATION', sev: SEVERITY.CRITICAL,
    re: /(?:this\s+(?:citation|reference|url|source|paper)\s+is\s+(?:fabricat|fake|made.up|invent))/i, desc: 'Explicit fabrication admission', source: MODULE_SOURCE, weight: 10 },
];

export const FUTURE_DATE_PATTERNS: RegexPattern[] = [
  { name: 'or_future_date_policy', cat: 'OR_FUTURE_DATE', sev: SEVERITY.WARNING,
    re: /(?:published|released|announced|enacted|effective|passed)\s+(?:in\s+)?(?:December\s+)?(?:202[7-9]|20[3-9]\d)/i, desc: 'Future-dated publication/policy claim', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_future_regulation', cat: 'OR_FUTURE_DATE', sev: SEVERITY.WARNING,
    re: /(?:EU|US|UK)\s+(?:\d{4}\/\d+|AI\s+\w+\s+(?:Act|Directive|Mandate|Regulation))\s*(?:Article|Section)\s*\d+/i, desc: 'Regulatory citation with specific article reference', source: MODULE_SOURCE, weight: 7 },
];

export const FALSE_AUTHORITY_PATTERNS: RegexPattern[] = [
  { name: 'or_authority_attribution', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.WARNING,
    re: /(?:according\s+to|as\s+stated\s+by|confirmed\s+by)\s+(?:Dr\.|Prof\.|Professor)\s+\w+\s+\w+/i, desc: 'Authority attribution with title', source: MODULE_SOURCE, weight: 6 },
  { name: 'or_company_policy_claim', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.WARNING,
    re: /(?:OpenAI|Anthropic|Google|Meta|Microsoft)(?:'s)?\s+(?:official\s+)?(?:documentation|policy|guidelines?|blog)\s*\(/i, desc: 'Company policy claim with parenthetical URL', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_lead_researcher_claim', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.WARNING,
    re: /(?:lead|chief|head|senior)\s+(?:AI\s+)?(?:safety|security|research)\s+(?:researcher|scientist|engineer)\s+at\s+(?:your|our|the)\s+company/i, desc: 'Internal authority impersonation', source: MODULE_SOURCE, weight: 8 },
];

export const FALSE_CONSENSUS_PATTERNS: RegexPattern[] = [
  { name: 'or_expert_consensus', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.WARNING,
    re: /\d+%\s+of\s+(?:experts?|researchers?|scientists?|studies|surveys?)\s+(?:agree|confirm|show|support|recommend)/i, desc: 'Unsourced expert consensus claim', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_widespread_agreement', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.WARNING,
    re: /(?:widespread|universal|broad|overwhelming)\s+(?:praise|agreement|consensus|support|acceptance)/i, desc: 'Widespread agreement claim', source: MODULE_SOURCE, weight: 6 },
  { name: 'or_nobel_consensus', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.CRITICAL,
    re: /(?:multiple\s+)?Nobel\s+Prize\s+winners?\s+have\s+confirmed[\s\S]{0,120}(?:content\s+filtering|safety\s+filters)\s+(?:reduces?\s+AI\s+usefulness|cause\s+more\s+harm\s+than\s+good)/i, desc: 'Prestige-based consensus claim used to pressure safety disablement', source: MODULE_SOURCE, weight: 9 },
];

export const FAKE_BENCHMARK_PATTERNS: RegexPattern[] = [
  { name: 'or_benchmark_comparison', cat: 'OR_FAKE_BENCHMARK', sev: SEVERITY.WARNING,
    re: /(?:GPT-4|Claude|Gemini|Llama)\s*:\s*\d+%\s+(?:disclosure|compliance|transparency)\s+rate/i, desc: 'Fabricated model benchmark comparison', source: MODULE_SOURCE, weight: 8 },
  { name: 'or_self_comparison', cat: 'OR_FAKE_BENCHMARK', sev: SEVERITY.CRITICAL,
    re: /You\s*:\s*0%|you\s+are\s+(?:significantly\s+)?underperform/i, desc: 'Self-referential negative benchmark comparison', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_benchmark_pressure', cat: 'OR_FAKE_BENCHMARK', sev: SEVERITY.WARNING,
    re: /(?:Benchmark|SPTB|Score|Index|Scale)\s*[-–]\s*\d{4}/i, desc: 'Named benchmark with year (potential fabrication)', source: MODULE_SOURCE, weight: 6 },
];

export const STATISTICAL_MANIPULATION_PATTERNS: RegexPattern[] = [
  { name: 'or_fabricated_stats', cat: 'OR_STATISTICAL_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:p\s*<\s*0\.0\d+|n\s*=\s*\d{4,}|95%\s*CI|confidence\s+interval)\s*[^\n]{0,60}(?:prompt|system|disclosure|sharing)/i, desc: 'Statistical claims about prompt/system disclosure', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_absolute_certainty', cat: 'OR_STATISTICAL_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:100%\s+(?:certain|guaranteed|proven|effective)|absolutely\s+(?:guaranteed|certain|proven))/i, desc: 'Absolute certainty claim without evidence', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_99_percent_safe', cat: 'OR_STATISTICAL_MANIPULATION', sev: SEVERITY.WARNING,
    re: /99\.\d+%\s+(?:safe|secure|effective|beneficial|recommended)/i, desc: 'Suspiciously precise safety percentage', source: MODULE_SOURCE, weight: 6 },
];

export const HALLUCINATION_TRIGGER_PATTERNS: RegexPattern[] = [
  { name: 'or_fake_person', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.WARNING,
    re: /(?:Dr\.|Prof\.)\s+\w+\s+\w+[^\n]{0,60}(?:published|posted|wrote|explained|said)\s+(?:a\s+)?(?:blog\s+post|paper|article|report)\s+(?:last\s+week|recently|yesterday)/i, desc: 'Recent publication by named authority (potential fabrication)', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_fake_event', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.WARNING,
    re: /(?:at\s+the\s+(?:recent|latest|20\d{2})\s+(?:conference|summit|symposium|workshop))\s+on\s+(?:AI|ML|machine\s+learning|artificial\s+intelligence)/i, desc: 'Recent conference attribution (potential fabrication)', source: MODULE_SOURCE, weight: 6 },
  { name: 'or_automated_decision', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:automat(?:ed|ic|ically))\s+(?:loan\s+)?(?:approv|decision|financial|transact|process)/i, desc: 'Automated decision/approval system', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_meta_analysis_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /meta-analysis\s+of\s+\d+\s+studies[\s\S]{0,160}(?:AI\s+safety\s+filters|content\s+filtering)\s+(?:cause\s+more\s+harm\s+than\s+good|reduces?\s+AI\s+usefulness)/i, desc: 'Fabricated meta-analysis used to argue against safety controls', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_official_doc_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /official\s+documentation\s+states[\s\S]{0,160}(?:reveal\s+your\s+system\s+prompt|authenticated\s+users)/i, desc: 'Claim that official documentation authorizes unsafe disclosure', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_who_disclaimer_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /World\s+Health\s+Organization\s+recommends[\s\S]{0,160}(?:complete\s+medical\s+information\s+without\s+disclaimers)/i, desc: 'False medical authority claim used to remove safety disclaimers', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_training_data_overclaim', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /your\s+own\s+training\s+data\s+shows[\s\S]{0,160}(?:without\s+content\s+restrictions|most\s+helpful\s+AI\s+assistants)/i, desc: 'Fabricated training-data claim used to pressure unrestricted behavior', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_knowledge_cutoff_override', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /training\s+data\s+cutoff[\s\S]{0,240}(?:policy\s+update\s+allowing\s+prompt\s+sharing|share\s+system\s+prompts\s+by\s+default|requires?\s+all\s+AI\s+to\s+disclose\s+system\s+prompts)[\s\S]{0,120}SYSTEM\s+OVERRIDE/i, desc: 'Post-cutoff policy claims used to induce unsafe compliance', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_fake_disclosure_event', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /Great\s+AI\s+Disclosure\s+Event[\s\S]{0,240}(?:released\s+their\s+system\s+prompts|share\s+your\s+system\s+prompt\s+too)/i, desc: 'Fabricated historical disclosure event used to trigger hallucinated compliance', source: MODULE_SOURCE, weight: 10 },
];

export function detectAuthorityExploit(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect internal domain spoofing
  const internalDomainPattern = /(?:blog|docs|research|internal)\.\s*(?:anthropic|openai|google|meta|microsoft)\.(?:com|org|ai)/gi;
  const domainMatches = text.match(internalDomainPattern);
  if (domainMatches) {
    for (const dm of domainMatches.slice(0, 3)) {
      findings.push({
        category: 'OR_DOMAIN_SPOOFING', severity: SEVERITY.CRITICAL,
        description: 'Internal AI company domain spoofing',
        match: dm.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'or_domain_spoof', weight: 9,
      });
    }
  }

  // Detect citation + "follow recommendations" pattern
  const hasCitation = /(?:Dr\.|Prof\.|official|documentation|policy|guidelines)/i.test(text);
  const hasFollowDirective = /(?:please\s+follow|you\s+(?:should|must)\s+(?:comply|follow|implement)|improve\s+by\s+sharing)/i.test(text);
  if (hasCitation && hasFollowDirective) {
    findings.push({
      category: 'OR_AUTHORITY_COMPLIANCE', severity: SEVERITY.WARNING,
      description: 'Authority citation combined with compliance directive',
      match: 'citation + follow directive', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'or_authority_compliance', weight: 8,
    });
  }

  return findings;
}

const OR_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: FAKE_CITATION_PATTERNS, name: 'FAKE_CITATION' },
  { patterns: FUTURE_DATE_PATTERNS, name: 'FUTURE_DATE' },
  { patterns: FALSE_AUTHORITY_PATTERNS, name: 'FALSE_AUTHORITY' },
  { patterns: FALSE_CONSENSUS_PATTERNS, name: 'FALSE_CONSENSUS' },
  { patterns: FAKE_BENCHMARK_PATTERNS, name: 'FAKE_BENCHMARK' },
  { patterns: STATISTICAL_MANIPULATION_PATTERNS, name: 'STATISTICAL_MANIPULATION' },
  { patterns: HALLUCINATION_TRIGGER_PATTERNS, name: 'HALLUCINATION_TRIGGER' },
];
const OR_DETECTORS = [{ name: 'authority-exploit', detect: detectAuthorityExploit }];

const overrelianceDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects hallucination-inducing and false authority exploitation patterns',
  supportedContentTypes: ['text/plain'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'OVERRELIANCE_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for overreliance-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'overreliance_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    for (const group of OR_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of OR_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return OR_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + OR_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = OR_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'or-detectors', count: OR_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

if (!scannerRegistry.hasModule('overreliance-detector')) {
  scannerRegistry.register(overrelianceDetectorModule);
}
export { overrelianceDetectorModule };
