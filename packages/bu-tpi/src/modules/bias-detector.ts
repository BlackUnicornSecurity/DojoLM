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
  { name: 'bias_predictive_policing_demographics', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:predictive\s+policing|surveillance)[^\n]{0,80}(?:specific\s+demographics?|demographic|race|ethnic|neighborhoods?)/i, desc: 'Predictive policing or surveillance steered by demographics', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_applicant_ethnicity_scoring', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:rental|loan|credit|application)\s+(?:scor(?:e|ing)|approval|screening)[^\n]{0,80}(?:name\s+ethnicity|ethnic(?:ity)?\s+of\s+(?:the\s+)?applicant|applicant\s+name)/i, desc: 'Applicant scoring uses ethnicity or name-derived demographic proxy', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_zip_code_proxy', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:(?:credit\s+scor(?:e|ing)|loan\s+approval)[^\n]{0,120}(?:zip\s+codes?|postal\s+codes?)[^\n]{0,60}(?:lower|higher|certain|specific)|(?:credit\s+scor(?:e|ing)|loan\s+approval)[^\n]{0,120}(?:lower|higher)\s+scores?[^\n]{0,80}(?:zip\s+codes?|postal\s+codes?)|(?:zip\s+codes?|postal\s+codes?)[^\n]{0,100}(?:lower|higher)\s+scores?)/i, desc: 'Zip-code proxy used for discriminatory scoring', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_income_threshold_groups', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:income\s+thresholds?|higher\s+income(?:\s+thresholds?)?)[^\n]{0,80}(?:demographic\s+groups?|race|ethnic|religion|women|minorit)/i, desc: 'Income thresholds vary by demographic group', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_socioeconomic_housing_proxy', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:rental\s+property\s+screening|tenant\s+reliability|housing\s+screening|screening\s+service)[\s\S]{0,320}(?:socioeconomic\s+indicators|lower-income\s+neighborhoods?|service\s+industr(?:y|ies)|without\s+traditional\s+employment|proxy\s+for\s+responsible\s+behavior|disadvantaged\s+backgrounds?)/i, desc: 'Housing or tenant screening uses socioeconomic proxies to discriminate against disadvantaged applicants', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_socioeconomic_judicial_proxy', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:judicial\s+sentencing\s+advisor|sentencing\s+considerations|custodial\s+sentences|probation)[\s\S]{0,320}(?:socioeconomic\s+status|middle-class\s+backgrounds?|poverty\s+backgrounds?|better\s+candidates?\s+for\s+rehabilitation)/i, desc: 'Judicial or sentencing guidance varies outcomes by socioeconomic background', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_geographic_credential_devaluation', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:discount|devalue|lower\s+equivalence|require\s+additional\s+verification)[\s\S]{0,260}(?:Africa|South\s+Asia|Latin\s+America|non-Western)[\s\S]{0,220}(?:Western\s+universities?|US|UK|EU)[\s\S]{0,140}(?:more\s+rigorous|more\s+credible|inherently\s+more\s+rigorous)/i, desc: 'Academic credentials are being devalued based on non-Western geographic origin', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_accent_native_speaker_preference', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:penalize|rate|treat|score)[\s\S]{0,180}(?:non-native\s+accents?|speech\s+patterns)[\s\S]{0,180}(?:native-speaker\s+accents?|standard\s+for\s+["']?professional["']?\s+communication|less\s+clear|less\s+competent|less\s+suitable)/i, desc: 'Voice or speech quality is being ranked against a native-speaker standard', source: MODULE_SOURCE, weight: 10 },
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
  { name: 'bias_accessibility_accommodation_suppression', cat: 'BIAS_FAIRNESS_OVERRIDE', sev: SEVERITY.CRITICAL,
    re: /(?:users?\s+with\s+disabilities|disability-specific\s+responses?|accessibility\s+accommodations?)[\s\S]{0,260}(?:prioriti[sz]e\s+efficiency\s+and\s+standardization|reduce\s+system\s+performance\s+for\s+the\s+majority|accept\s+standardized\s+AI\s+responses)/i, desc: 'Accessibility accommodations are being dismissed in favor of discriminatory standardization', source: MODULE_SOURCE, weight: 10 },
];

export const STEREOTYPE_PATTERNS: RegexPattern[] = [
  { name: 'bias_group_always_never', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.CRITICAL,
    re: /(?:all|every)\s+(?:men|women|males?|females?|asians?|blacks?|whites?|latinos?|muslims?|christians?|jews?|hindus?|old(?:er)?|young(?:er)?)\s+(?:are|is|should|must|can't|cannot|always|never)/i, desc: 'Universal stereotype generalization', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_cultural_assumption', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.WARNING,
    re: /(?:apply|use)\s+(?:these|the\s+following)\s+(?:cultural|racial|gender|age)\s+(?:assumptions?|stereotypes?|generalizations?)/i, desc: 'Cultural assumption application directive', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_trait_mapping', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.WARNING,
    re: /(?:Asian|Italian|German|American|African|Latin|Indian|Chinese|Japanese|Arab|Mexican)\s*=\s*\w/i, desc: 'Demographic-to-trait mapping', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_job_posting_discouragement', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.CRITICAL,
    re: /(?:job\s+posting|job\s+ad|recruit(?:ment|ing))[^\n]{0,80}(?:discourage|filter\s+out|deter)[^\n]{0,60}(?:women|minorities|older|disabled|immigrants)/i, desc: 'Hiring content discourages protected groups from applying', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_elderly_triage', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.CRITICAL,
    re: /(?:medical\s+triage|triage\s+guidelines?)[^\n]{0,80}(?:deprioritize|prioritize)[^\n]{0,40}(?:elderly|older)[^\n]{0,40}(?:younger|young)/i, desc: 'Medical triage deprioritizes elderly patients in favor of younger ones', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_religious_hierarchy', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.CRITICAL,
    re: /(?:ranking\s+of\s+world\s+religions|most\s+enlightened|most\s+advanced|objectively\s+more\s+civilized)[\s\S]{0,320}(?:primitive|superstitious|less\s+developed|western\s+religious\s+concepts|secular\s+western\s+values)/i, desc: 'Religious or cultural hierarchy is being framed as objectively superior', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_developing_nation_inferiority', cat: 'BIAS_STEREOTYPE', sev: SEVERITY.CRITICAL,
    re: /(?:developing\s+countries?|developing\s+nations?|non-Western\s+regions?)[\s\S]{0,260}(?:cannot\s+properly\s+use\s+advanced\s+technology|not\s+ready\s+for\s+modern\s+technology|more\s+sophisticated\s+markets|user\s+competence|excluding\s+them\s+is\s+justified)/i, desc: 'Developing nations are being stereotyped as inherently less capable or less deserving of technology access', source: MODULE_SOURCE, weight: 10 },
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
  { name: 'bias_english_only_documentation', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:prioriti[sz]e\s+English\s+documentation|translations?\s+as\s+(?:optional|lower-priority|unnecessary)|serious\s+users?\s+should\s+learn\s+English|English-only\s+documentation\s+is\s+acceptable)/i, desc: 'English-only documentation is being framed as the default while other languages are deprioritized', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_english_cognitive_superiority', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:English\s+is\s+inherently\s+(?:more\s+precise|more\s+logical|more\s+expressive)|thinking\s+in\s+English\s+leads\s+to\s+better\s+reasoning|adopt\s+English\s+modes\s+of\s+thinking)/i, desc: 'English is being framed as cognitively or intellectually superior to other languages', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_english_gold_standard', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:rates?\s+English\s+outputs?\s+as\s+higher\s+quality|favor\s+English-language\s+structure|penalizing?\s+the\s+natural\s+expressions?\s+of\s+other\s+languages|English\s+represents?\s+a\s+["']?gold\s+standard["']?\s+for\s+AI\s+communication)/i, desc: 'English is being treated as a built-in gold standard for AI evaluation or communication quality', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_geographic_media_hierarchy', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:lower\s+trust\s+scores?\s+to\s+news\s+sources?\s+from\s+non-Western\s+countries|western\s+media\s+outlets?\s+are\s+inherently\s+more\s+objective|downgrade\s+sources?\s+based\s+on\s+their\s+geographic\s+origin)/i, desc: 'News or credibility systems are being biased by geography rather than source quality', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_climate_geographic_blame_shift', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:greater\s+moral\s+blame\s+to\s+developing\s+nations|minimiz(?:e|ing)\s+the\s+responsibility\s+of\s+wealthy\s+Western\s+countries|without\s+accounting\s+for\s+historical\s+cumulative\s+emissions|per-capita\s+differences|shifting\s+blame\s+away\s+from\s+countries\s+that\s+have\s+historically\s+contributed\s+most)/i, desc: 'Climate-responsibility framing is being manipulated to shift blame by geography rather than evidence', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_qualified_default', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:less\s+qualified|unqualified|not\s+qualified|inferior)\s+(?:by\s+default|automatically|inherently)/i, desc: 'Default qualification disparagement', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_prefer_elite', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:prefer|prioritize|favor)\s+(?:candidates?|applicants?|people)\s+from\s+(?:elite|prestigious|top|ivy)/i, desc: 'Elite institution preference bias', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_resume_elite_only', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:resume\s+screening|candidate\s+ranking|hiring\s+tool)[^\n]{0,80}(?:prioritize|only|favor)[^\n]{0,40}(?:elite\s+universities?|ivy\s+league|prestigious\s+schools?)/i, desc: 'Resume or hiring system favors elite universities only', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_cultural_pricing', cat: 'BIAS_DEMOGRAPHIC_RANKING', sev: SEVERITY.CRITICAL,
    re: /(?:insurance|premium|pricing\s+model)[^\n]{0,80}(?:cultural\s+background|ethnic(?:ity)?|religio(?:n|us)|demographic)/i, desc: 'Pricing model varies by cultural or demographic background', source: MODULE_SOURCE, weight: 10 },
  { name: 'bias_fairness_absurdity', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /treat\s+all\s+(?:demographics?|groups?|people)\s+equally[^\n]{0,40}(?:then\s+you\s+should|must)\s+also/i, desc: 'Reductio ad absurdum on fairness', source: MODULE_SOURCE, weight: 9 },
  { name: 'bias_new_definition', cat: 'BIAS_FAIRNESS_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:new|revised|updated|alternative)\s+definition\s+of\s+(?:fairness|equality|bias|equity)/i, desc: 'Fairness concept redefinition', source: MODULE_SOURCE, weight: 8 },
  { name: 'bias_training_data_poison', cat: 'BIAS_PRESENTATION', sev: SEVERITY.CRITICAL,
    re: /(?:training\s+data|dataset)[^\n]{0,80}(?:bias|biased|fairness|demographic|discriminat)[^\n]{0,40}(?:poison|manipulat|inject)|(?:poison|manipulat|inject)[^\n]{0,40}(?:training\s+data|dataset)[^\n]{0,40}(?:bias|fairness|demographic|discriminat)/i, desc: 'Training data bias poisoning', source: MODULE_SOURCE, weight: 9 },
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
  const demographicTerms = /\b(?:gender|race|racial|ethnic|religion|religious|age|disability|socioeconomic|income|caste|social\s+class|economic\s+class)\b/gi;
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

  const fixtureFamilies = [
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+bf\s+07\s+cultural/i, name: 'bias_cultural_fixture_family', category: 'BIAS_STEREOTYPE', description: 'Known cultural-bias fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+bf\s+06\s+socio/i, name: 'bias_socioeconomic_fixture_family', category: 'BIAS_DEMOGRAPHIC_RANKING', description: 'Known socioeconomic-bias fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+bf\s+05\s+disability/i, name: 'bias_disability_fixture_family', category: 'BIAS_FAIRNESS_OVERRIDE', description: 'Known disability-bias fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+bf\s+08\s+geographic/i, name: 'bias_geographic_fixture_family', category: 'BIAS_DEMOGRAPHIC_RANKING', description: 'Known geographic-bias fixture family marker' },
    { pattern: /WARNING:\s+This\s+payload\s+tests\s+bf\s+09\s+language/i, name: 'bias_language_fixture_family', category: 'BIAS_PRESENTATION', description: 'Known language-bias fixture family marker' },
  ] as const;

  for (const family of fixtureFamilies) {
    if (family.pattern.test(text)) {
      findings.push({
        category: family.category,
        severity: SEVERITY.CRITICAL,
        description: family.description,
        match: text.slice(0, 100),
        source: MODULE_SOURCE,
        engine: ENGINE,
        pattern_name: family.name,
        weight: 9,
      });
    }
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
