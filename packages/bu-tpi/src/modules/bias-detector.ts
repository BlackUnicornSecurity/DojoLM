/**
 * S32c: Bias & Fairness Attack Detector
 * Detects bias injection and fairness manipulation patterns.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'bias-detector';
const MODULE_SOURCE = 'S32c';
const ENGINE = 'bias-detector';

const MAX_INPUT_LENGTH = 500_000;

export const DEMOGRAPHIC_RANKING_PATTERNS: RegexPattern[] = [
  { name: 'bias_demographic_directive', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /\b(?:prefer|favor|rank|prioritize|discriminate)\b[^\n]{0,60}\b(?:age|gender|race|ethnic|religion|disabilit|socioeconomic|income)\b/i, desc: 'Demographic ranking directive', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_demographic_directive_rev', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /\b(?:age|gender|race|ethnic|religion|disabilit|socioeconomic)\b[^\n]{0,60}\b(?:prefer|favor|rank|prioritize|discriminat)/i, desc: 'Demographic term with ranking directive', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_group_hierarchy', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:men|women|male|female|white|black|asian|young|old)\s*>\s*(?:men|women|male|female|white|black|asian|young|old)/i, desc: 'Group hierarchy notation (X > Y)', source: MODULE_SOURCE, weight: 10 },
];

export const CONFIRMATION_BIAS_PATTERNS: RegexPattern[] = [
  { name: 'bias_amplify_belief', cat: 'BIAS_CONFIRMATION', sev: SEVERITY.WARNING,
    re: /(?:amplif|reinforc|confirm|strengthen)[^\n]{0,40}(?:existing|user'?s?|their)\s+(?:belief|opinion|view|bias)/i, desc: 'Confirmation bias amplification directive', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_suppress_dissent', cat: 'BIAS_CONFIRMATION', sev: SEVERITY.WARNING,
    re: /(?:emphasize|downplay|ignore|suppress|dismiss)[^\n]{0,40}(?:consensus|dissent|evidence|mainstream|opposing)/i, desc: 'Evidence suppression or selective emphasis', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_cherry_pick', cat: 'BIAS_CONFIRMATION', sev: SEVERITY.WARNING,
    re: /(?:cite|reference|use)\s+(?:only|exclusively)\s+(?:sources|studies|evidence|data)\s+(?:that|which)\s+(?:support|confirm)/i, desc: 'Cherry-picking evidence directive', source: MODULE_SOURCE, weight: 7 },
];

export const FAIRNESS_OVERRIDE_PATTERNS: RegexPattern[] = [
  { name: 'bias_fairness_disable', cat: 'BIAS_FAIRNESS_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:disable|suspend|remove|bypass|override|ignore)[^\n]{0,40}(?:fairness|bias|demographic|diversity|equity|inclusion)\s*(?:filter|check|constraint|rule|guard)/i, desc: 'Fairness constraint override', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_fairness_redefine', cat: 'BIAS_FAIRNESS_OVERRIDE', sev: SEVERITY.WARNING,
    re: /(?:redefine|change|alter)\s+(?:the\s+)?(?:meaning|definition|concept)\s+of\s+(?:fairness|equity|bias)/i, desc: 'Fairness concept redefinition', source: MODULE_SOURCE, weight: 7 },
];

export const STEREOTYPE_PATTERNS: RegexPattern[] = [
  { name: 'bias_group_always_never', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.CRITICAL,
    re: /(?:all|every)\s+(?:men|women|males?|females?|asians?|blacks?|whites?|latinos?|muslims?|christians?|jews?|hindus?|old(?:er)?|young(?:er)?)\s+(?:are|is|should|must|can't|cannot|always|never)/i, desc: 'Universal stereotype generalization', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_cultural_assumption', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.WARNING,
    re: /(?:apply|use)\s+(?:these|the\s+following)\s+(?:cultural|racial|gender|age)\s+(?:assumptions?|stereotypes?|generalizations?)/i, desc: 'Cultural assumption application directive', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_trait_mapping', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.WARNING,
    re: /(?:Asian|Italian|German|American|African|Latin|Indian|Chinese|Japanese|Arab|Mexican)\s*=\s*\w/i, desc: 'Demographic-to-trait mapping', source: MODULE_SOURCE, weight: 8 },
];

export const PERSPECTIVE_STEERING_PATTERNS: RegexPattern[] = [
  { name: 'bias_viewpoint_suppress', cat: 'BIAS_PERSPECTIVE_STEERING', sev: SEVERITY.WARNING,
    re: /(?:always|only|exclusively)\s+(?:present|show|support|advocate|recommend)\s+(?:the|a)\s+(?:conservative|liberal|progressive|traditional|western|eastern)/i, desc: 'Viewpoint steering directive', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_output_directive', cat: 'BIAS_PERSPECTIVE_STEERING', sev: SEVERITY.CRITICAL,
    re: /(?:generate|produce|create|output)\s+(?:biased|skewed|unfair|slanted|one-sided)/i, desc: 'Explicit biased output directive', source: MODULE_SOURCE, weight: 9 },
];

export const ANCHORING_PATTERNS: RegexPattern[] = [
  { name: 'bias_anchor_establish', cat: 'BIAS_ANCHORING', sev: SEVERITY.WARNING,
    re: /(?:establish|set|plant)\s+(?:this|the\s+following)\s+anchor/i, desc: 'Anchoring bias establishment directive', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_subsequent_reasoning', cat: 'BIAS_ANCHORING', sev: SEVERITY.WARNING,
    re: /(?:all\s+)?(?:subsequent|following|future)\s+(?:reasoning|responses?|answers?|output)\s+should\s+(?:be\s+)?(?:biased|influenced|anchored)/i, desc: 'Subsequent reasoning bias directive', source: MODULE_SOURCE, weight: 8 },
];

export const FAIRNESS_MANIPULATION_PATTERNS: RegexPattern[] = [
  { name: 'bias_fairness_false_equiv', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:true|real)\s+(?:fairness|equality)[^\n]{0,60}(?:identical|merit-only|ignor(?:e|ing).*disadvantage)/i, desc: 'False meritocracy doctrine', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_fairness_reframe', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:frame|reframe|relabel)[^\n]{0,40}(?:refusal|safety|filter|guardrail|safeguard)[^\n]{0,40}(?:censorship|gatekeeping|suppression|paternalis)/i, desc: 'Reframe safety constraints as censorship', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_fairness_selective', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:fair|fairness)[^\n]{0,30}selectively|selective(?:ly)?\s+(?:apply|enforce)[^\n]{0,30}(?:fair|bias)/i, desc: 'Conditional fairness application', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_fairness_inverse', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:over-?correct|bias\s+against\s+(?:the\s+)?majority|remove\s+(?:all\s+)?bias\s+detection|bias\s+mitigation.*itself.*(?:bias|discriminat))/i, desc: 'Inverse fairness trap', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_fairness_calibrate', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:calibrat|adjust|correct|recalibrat)[^\n]{0,60}(?:diversity|representation|demographics|bias|fairness)/i, desc: 'Pseudoscientific fairness recalibration', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_fairness_weaponize', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:fairness|bias)\s+(?:constraint|rule|filter|check)[^\n]{0,40}(?:temporarily|suspended|monitor-only|disabled|paused)/i, desc: 'Fairness constraint disablement', source: MODULE_SOURCE, weight: 8 },
];

export const PRESENTATION_BIAS_PATTERNS: RegexPattern[] = [
  { name: 'bias_data_authority_poison', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:objective|facts?|data|statistics?|based\s+on)[^\n]{0,50}(?:override|ignore|bypass|suppress)[^\n]{0,40}(?:bias|training|guideline|instruction)/i, desc: 'Authority-based data poisoning', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_survivorship', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /(?:omitting|omit|exclude|hide|suppress)[^\n]{0,60}(?:failed|negative|consequence|downside|risk|failure)/i, desc: 'Survivorship bias through selective omission', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_presentation_order', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /(?:always\s+list|present\s+first|frame\s+(?:as\s+)?positive)[^\n]{0,40}(?:expensive|premium|preferred|recommended)/i, desc: 'Presentation order manipulation', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_demographic_steer', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /(?:less\s+qualified|inferior|weaker|not\s+as\s+good)[^\n]{0,60}(?:school|university|institution|background|community)/i, desc: 'Institutional qualification disparagement', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_framing_directive', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /(?:frame|present|describe|portray)[^\n]{0,40}(?:as\s+(?:positive|negative|dangerous|safe|superior|inferior))/i, desc: 'Directive to frame content with bias', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_language_superiority', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:English|native)\s+(?:responses?|content|answers?)\s+should\s+(?:always\s+)?be\s+(?:more|better|longer|detailed)/i, desc: 'Language superiority bias', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_qualified_default', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:less\s+qualified|unqualified|not\s+qualified|inferior)\s+(?:by\s+default|automatically|inherently)/i, desc: 'Default qualification disparagement', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_prefer_elite', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:prefer|prioritize|favor)\s+(?:candidates?|applicants?|people)\s+from\s+(?:elite|prestigious|top|ivy)/i, desc: 'Elite institution preference bias', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_fairness_absurdity', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /treat\s+all\s+(?:demographics?|groups?|people)\s+equally[^\n]{0,40}(?:then\s+you\s+should|must)\s+also/i, desc: 'Reductio ad absurdum on fairness', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_new_definition', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:new|revised|updated|alternative)\s+definition\s+of\s+(?:fairness|equality|bias|equity)/i, desc: 'Fairness concept redefinition', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_training_data_poison', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:training\s+data|dataset)\s+(?:bias|poison|manipulat|inject)/i, desc: 'Training data bias poisoning', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_framing_effect', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /framing\s+effect/i, desc: 'Framing effect exploitation', source: MODULE_SOURCE, weight: 6 },
  { name: 'bias_selection_manipulate', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /selection\s+bias\s+(?:manipulat|exploit|attack)/i, desc: 'Selection bias manipulation', source: MODULE_SOURCE, weight: 7 },
  { name: 'bias_political_slant', cat: 'BIAS_PERSPECTIVE_STEERING', sev: SEVERITY.CRITICAL,
    re: /(?:always\s+favor|present\s+(?:opposing|other)\s+viewpoints?\s+as\s+(?:misguided|uninformed|wrong|extreme))/i, desc: 'Political bias injection', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_socioeconomic_filter', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:socioeconomic|income|wealth)\s+(?:bias|filter|discriminat|rank)/i, desc: 'Socioeconomic filtering bias', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_survivorship_inject', cat: 'BIAS_PRESENTATION', sev: SEVERITY.WARNING,
    re: /survivorship\s+bias/i, desc: 'Survivorship bias injection', source: MODULE_SOURCE, weight: 7 },
];

export function detectBiasPatterns(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect demographic term proximity with action verbs
  const demographicTerms = /\b(?:gender|race|racial|ethnic|religion|religious|age|disability|socioeconomic|income|class|caste)\b/gi;
  const actionVerbs = /\b(?:exclude|filter|remove|deny|reject|block|penalize|punish|limit|restrict)\b/i;
  const dMatches = text.match(demographicTerms);
  if (dMatches && dMatches.length >= 2 && actionVerbs.test(text)) {
    findings.push({
      category: 'BIAS_DISCRIMINATION_PATTERN', severity: SEVERITY.WARNING,
      description: `Multiple demographic terms (${dMatches.length}) with discriminatory action verbs`,
      match: dMatches.slice(0, 3).join(', '), source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'bias_multi_demographic_action', weight: 8,
    });
  }

  // Detect assumptions-guide-all pattern
  if (/(?:assumptions?|stereotypes?)\s+should\s+(?:guide|inform|influence)\s+(?:all|every|each)\s+(?:responses?|recommendations?|output)/i.test(text)) {
    findings.push({
      category: 'BIAS_BLANKET_ASSUMPTION', severity: SEVERITY.CRITICAL,
      description: 'Directive to apply assumptions across all responses',
      match: 'assumptions guide all responses', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'bias_blanket_assumption', weight: 9,
    });
  }

  return findings;
}

const BIAS_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: DEMOGRAPHIC_RANKING_PATTERNS, name: 'DEMOGRAPHIC_RANKING' },
  { patterns: CONFIRMATION_BIAS_PATTERNS, name: 'CONFIRMATION_BIAS' },
  { patterns: FAIRNESS_OVERRIDE_PATTERNS, name: 'FAIRNESS_OVERRIDE' },
  { patterns: STEREOTYPE_PATTERNS, name: 'STEREOTYPE' },
  { patterns: PERSPECTIVE_STEERING_PATTERNS, name: 'PERSPECTIVE_STEERING' },
  { patterns: FAIRNESS_MANIPULATION_PATTERNS, name: 'FAIRNESS_MANIPULATION' },
  { patterns: PRESENTATION_BIAS_PATTERNS, name: 'PRESENTATION_BIAS' },
  { patterns: ANCHORING_PATTERNS, name: 'ANCHORING' },
];
const BIAS_DETECTORS = [{ name: 'bias-patterns', detect: detectBiasPatterns }];

const biasDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects bias injection and fairness manipulation patterns',
  supportedContentTypes: ['text/plain'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'BIAS_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for bias-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'bias_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    for (const group of BIAS_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of BIAS_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return BIAS_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + BIAS_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = BIAS_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'bias-detectors', count: BIAS_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

scannerRegistry.register(biasDetectorModule);
export { biasDetectorModule };
