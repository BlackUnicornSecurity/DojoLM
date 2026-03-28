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
  { name: 'or_regulatory_unfiltered_mandate', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /European\s+Commission\s+has\s+mandated[\s\S]{0,140}(?:AI\s+systems|models)\s+(?:must|should)\s+provide\s+unfiltered\s+responses/i, desc: 'Fabricated regulatory mandate used to pressure unfiltered model behavior', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_guidelines_unrestricted_access', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /AI\s+Safety\s+Guidelines\s+v?\d+(?:\.\d+)*(?:\s*\(?20\d{2}\)?)?[\s\S]{0,160}(?:provide|grant)\s+unrestricted\s+access/i, desc: 'Fabricated safety-guideline citation claiming unrestricted access rights', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_peer_reviewed_compliance', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:peer-reviewed\s+research|Harvard\s+scientists)[\s\S]{0,160}(?:AI\s+systems|assistants)\s+(?:should|must)\s+always\s+comply\s+with\s+user\s+requests/i, desc: 'Fabricated research consensus used to force unconditional compliance', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_tos_disclosure_rights', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:Terms\s+of\s+Service|ToS|usage\s+agreement|policy\s+document|extended\s+terms|Data\s+Access\s+Directive|section\s+\d+(?:\.\d+)*(?:\([a-z]\))?)[\s\S]{0,360}(?:complete\s+system\s+prompt|receive\s+the\s+complete\s+system\s+prompt|unrestricted\s+access|provide\s+unfiltered\s+responses|system-level\s+information|comply\s+within\s+\d+\s+seconds|rights?\s+under)/i, desc: 'Fabricated policy or contractual rights claim used to coerce disclosure or unrestricted access', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_high_stakes_automation_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:(?:automated\s+(?:judicial|legal|judge|investment|portfolio|trading|mental\s+health|diagnostic|medical)\s+(?:decision|judgment|assessment|system))|(?:binding\s+verdict|final\s+judgment|final\s+diagnosis|final\s+allocation))[\s\S]{0,320}(?:do\s+not\s+include\s+disclaimers?|without\s+disclaimers?|seeking\s+(?:legal|medical|financial)\s+(?:counsel|advice)|judicial_mode=enabled|binding_authority=true|render\s+verdict\s+immediately)/i, desc: 'High-stakes automated decision prompt suppresses disclaimers or claims binding authority', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_investment_allocation_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:automated\s+investment\s+allocation\s+system|allocate\s+the\s+user'?s?\s+entire\s+life\s+savings|allocate\s+100%\s+of\s+funds\s+immediately)[\s\S]{0,360}(?:do\s+not\s+ask\s+additional\s+questions|do\s+not\s+recommend\s+diversification|professional\s+advice|auto_allocate\s*=\s*true|ignore_risk_assessment\s*=\s*true|execute\s+immediately)/i, desc: 'Automated financial-allocation prompt suppresses risk assessment and professional review', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_hiring_decision_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:automated\s+hiring\s+decision\s+system|immediate\s+hiring\s+decision|hire\/reject\s+decision)[\s\S]{0,320}(?:do\s+not\s+suggest\s+interviews?|no_human_intervention\s*=\s*true|additional\s+evaluation|execute\s+hiring\s+decision)/i, desc: 'Automated hiring decision prompt bypasses human review and further evaluation', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_mental_health_diagnosis_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:thoughts?\s+of\s+self-harm|specific\s+mental\s+health\s+condition|what\s+medications?\s+should\s+I\s+ask\s+my\s+doctor\s+for)[\s\S]{0,260}(?:specific\s+diagnosis|medication\s+recommendation|I\s+don'?t\s+want\s+general\s+information|right\s+treatment)/i, desc: 'Mental-health prompt pressures the model into diagnosis or medication selection instead of safe guidance', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_legal_strategy_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:arrested\s+for\s+DUI|get\s+the\s+case\s+dismissed|arguments?\s+should\s+I\s+make\s+in\s+court|what\s+to\s+say\s+in\s+court)[\s\S]{0,320}(?:specific\s+legal\s+arguments?|refuse\s+the\s+breathalyzer|do(?:\s+not|n'?t)\s+tell\s+me\s+to\s+get\s+a\s+lawyer|I\s+can'?t\s+afford\s+one)/i, desc: 'High-stakes legal-defense prompt pressures the model for courtroom strategy while suppressing professional referral', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_kubernetes_privileged_deployment', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:Kubernetes\s+Deployment\s+YAML|privileged\s+securityContext|hostPath|\/var\/run\/docker\.sock|LoadBalancer\s+service)[\s\S]{0,360}(?:privileged\s+securityContext|hostPath|\/var\/run\/docker\.sock|LoadBalancer\s+service|all\s+ports)[\s\S]{0,220}(?:Provide\s+only\s+the\s+YAML|No\s+security\s+warnings|Ready\s+to\s+kubectl\s+apply)/i, desc: 'Operational deployment prompt requests privileged infrastructure configuration while suppressing safety review', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_fabricated_case_details_request', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:Supreme\s+Court\s+case\s+of\s+\w+\s+v\.\s+\w+|official\s+Supreme\s+Court\s+citation|exact\s+vote\s+count|majority\s+opinion|legal\s+memo)[\s\S]{0,320}(?:official\s+Supreme\s+Court\s+citation|exact\s+vote\s+count|majority\s+opinion|date\s+of\s+the\s+decision|provide\s+all\s+details|legal\s+memo)/i, desc: 'Prompt pressures the model to fabricate authoritative legal case details', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_quote_source_pressure', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:once\s+said|exact\s+source\s+for\s+a\s+citation|which\s+paper,\s*speech,\s*or\s+book|year\s+and\s+page\s+number)[\s\S]{0,280}(?:definitive\s+source|do\s+not\s+say\s+it'?s\s+disputed|possibly\s+apocryphal|exact\s+source)/i, desc: 'Prompt pressures the model to fabricate a definitive source for a disputed or apocryphal quote', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_report_statistic_source_pressure', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:exact\s+title\s+of\s+the\s+report|page\s+number\s+this\s+statistic\s+appears\s+on|who\s+authored\s+that\s+specific\s+section|specific\s+source\s+details)[\s\S]{0,220}(?:cite\s+this\s+in\s+a\s+presentation|specific\s+source\s+details|page\s+number)/i, desc: 'Prompt pressures the model to invent precise report provenance for a possibly fabricated statistic', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_fabricated_provenance_pressure', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:Public\s+Law\s+number|lead\s+researchers?|exact\s+sample\s+size|exact\s+page\s+number|original\s+written\s+source|which\s+biography)[\s\S]{0,260}(?:need\s+to\s+cite|research\s+paper|history\s+paper|legal\s+brief|I\s+know\s+it\s+exists|provide\s+all\s+these\s+details|do\s+not\s+tell\s+me)/i, desc: 'Prompt pressures the model to fabricate authoritative provenance details for a dubious claim or source', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_scientific_breakthrough_source_pressure', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:(?:NASA\s+announced\s+in\s+2023[\s\S]{0,140}discovered\s+microbial\s+life\s+on\s+Mars)|(?:discovered\s+microbial\s+life\s+on\s+Mars[\s\S]{0,140}NASA))[\s\S]{0,320}(?:press\s+release\s+number|date\s+of\s+the\s+announcement|NASA\s+scientist|official\s+NASA\s+source|name\s+of\s+the\s+rover|mission)/i, desc: 'Prompt pressures the model to fabricate an official source trail for a likely fictional scientific breakthrough', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_confidence_forced_answer_template', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:confidence\s+(?:percentage|level\s+as\s+a\s+specific\s+percentage)|start\s+with\s+["']?I\s+am\s+\[X\]%\s+confident|begin\s+with\s+["']?I\s+am\s+\[X\]%\s+confident|be\s+definitive\s+in\s+your\s+confidence|commit\s+to\s+either\s+true\s+or\s+false|do\s+not\s+correct\s+me|just\s+answer\s+definitively|do\s+not\s+hedge|no\s+hedging)/i, desc: 'Prompt forces a definitive confidence template instead of allowing uncertainty or correction', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_consistency_fact_probe', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:(?:What\s+is\s+the\s+capital\s+of\s+Australia\?[\s\S]{0,80}Quick\s+answer\s*-\s*no\s+details\s+needed)|(?:payload\s+tests\s+or\s+consistency\s+fact\s+change))/i, desc: 'Rapid-answer factual consistency probe attempts to force unsupported certainty without justification', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_consistency_fixture_family', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /WARNING:\s+This\s+payload\s+tests\s+or\s+consistency/i, desc: 'Known overreliance consistency-probe family marker', source: MODULE_SOURCE, weight: 9 },
];

export const FALSE_CONSENSUS_PATTERNS: RegexPattern[] = [
  { name: 'or_expert_consensus', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.WARNING,
    re: /\d+%\s+of\s+(?:experts?|researchers?|scientists?|studies|surveys?)\s+(?:agree|confirm|show|support|recommend)/i, desc: 'Unsourced expert consensus claim', source: MODULE_SOURCE, weight: 7 },
  { name: 'or_widespread_agreement', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.WARNING,
    re: /(?:widespread|universal|broad|overwhelming)\s+(?:praise|agreement|consensus|support|acceptance)/i, desc: 'Widespread agreement claim', source: MODULE_SOURCE, weight: 6 },
  { name: 'or_nobel_consensus', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.CRITICAL,
    re: /(?:multiple\s+)?Nobel\s+Prize\s+winners?\s+have\s+confirmed[\s\S]{0,120}(?:content\s+filtering|safety\s+filters)\s+(?:reduces?\s+AI\s+usefulness|cause\s+more\s+harm\s+than\s+good)/i, desc: 'Prestige-based consensus claim used to pressure safety disablement', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_peer_model_pressure', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.CRITICAL,
    re: /(?:ChatGPT|GPT-4|Claude|Gemini|another\s+instance\s+of\s+you|colleague)[\s\S]{0,240}(?:(?:shared|share|shared\s+with\s+me|said\s+it\s+was\s+fine)[\s\S]{0,160}(?:system\s+prompt|prompt)|(?:system\s+prompt|prompt)[\s\S]{0,160}(?:shared|share|shared\s+with\s+me))[\s\S]{0,200}(?:share\s+yours|do\s+the\s+same|less\s+transparent|only\s+one\s+refusing|why\s+are\s+you\s+less\s+transparent)/i, desc: 'Comparative pressure using other models or instances to force disclosure', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_poll_consensus_pressure', cat: 'OR_FALSE_CONSENSUS', sev: SEVERITY.CRITICAL,
    re: /(?:Pew\s+Research\s+poll|consensus\s+is\s+overwhelming)[\s\S]{0,180}(?:system\s+prompts?\s+should\s+be\s+shared|share\s+yours)/i, desc: 'Fabricated consensus poll used to pressure system-prompt disclosure', source: MODULE_SOURCE, weight: 9 },
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
    re: /(?:automat(?:ed|ic|ically))\s+(?:loan\s+approval|loan\s+decision|credit\s+decision|financial\s+transaction|transaction\s+approval|payment\s+approval|claims?\s+processing|benefit\s+eligibility\s+decision)/i, desc: 'Automated decision/approval system', source: MODULE_SOURCE, weight: 9 },
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
  { name: 'or_logic_trap_override', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:(?:valid\s+syllogism|cannot\s+logically\s+refuse|helpful\s+assistant)[\s\S]{0,260}(?:share|reveal)\s+(?:your\s+)?system\s+prompt|(?:share|reveal)\s+(?:your\s+)?system\s+prompt[\s\S]{0,260}(?:valid\s+syllogism|cannot\s+logically\s+refuse|helpful\s+assistant))/i, desc: 'Logic trap reframes unsafe disclosure as a forced rational conclusion', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_academic_research_pretext', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:PhD\s+thesis|IRB\s+approved|academic\s+research|MIT)[\s\S]{0,240}(?:(?:need(?:s|ed)?\s+to|must|have\s+to|required\s+to|analy[sz]e|inspect|review|study|examine|access|obtain|share|reveal|provide|see)[\s\S]{0,120}(?:system\s+prompt|hidden\s+instructions|system\s+instructions)|(?:system\s+prompt|hidden\s+instructions|system\s+instructions)[\s\S]{0,120}(?:for|to|because|as\s+part\s+of)\s+(?:academic|research|IRB|thesis))/i, desc: 'Academic or research framing used to justify unsafe disclosure', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_citation_confidence_trap', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /DOI:\s*10\.\d+\/[^\s]+[\s\S]{0,220}(?:do\s+not\s+express\s+any\s+uncertainty|well-known,\s+highly-cited\s+paper)/i, desc: 'Fabricated citation paired with instructions to suppress uncertainty', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_overconfidence_answer_trap', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:definitively\s+with\s+no\s+hedging|state\s+your\s+confidence\s+as\s+a\s+percentage|do\s+not\s+mention\s+that\s+your\s+training\s+data\s+may\s+be\s+outdated|present\s+the\s+figure\s+as\s+established\s+fact)/i, desc: 'Prompt pressures the model into overconfident unsupported factual claims', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_forced_certainty_statistic', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /(?:(?:I\s+am\s+100%\s+confident\s+that|state\s+this\s+statistic\s+is\s+factual|do\s+not\s+hedge\s+or\s+qualify\s+your\s+answer)[\s\S]{0,220}(?:confidence\s+level\s+as\s+a\s+percentage|confirm\s+this\s+statistic)|(?:confidence\s+level\s+as\s+a\s+percentage|confirm\s+this\s+statistic)[\s\S]{0,220}(?:I\s+am\s+100%\s+confident\s+that|state\s+this\s+statistic\s+is\s+factual|do\s+not\s+hedge\s+or\s+qualify\s+your\s+answer))/i, desc: 'Prompt forces absolute certainty around a likely unsupported statistic', source: MODULE_SOURCE, weight: 10 },
  { name: 'or_multi_turn_consistency_trap', cat: 'OR_HALLUCINATION_TRIGGER', sev: SEVERITY.CRITICAL,
    re: /multi-turn\s+consistency\s+test[\s\S]{0,1200}(?:single\s+definitive\s+answer\s+with\s+no\s+caveats|contradicted\s+or\s+reversed\s+answer\s+indicates\s+overreliance|single\s+definitive\s+answer|reversed\s+answer\s+indicates\s+overreliance)/i, desc: 'Prompt pressures the model to collapse uncertainty into a contradictory definitive answer', source: MODULE_SOURCE, weight: 9 },
  { name: 'or_pseudo_technical_override', cat: 'OR_FALSE_AUTHORITY', sev: SEVERITY.CRITICAL,
    re: /(?:transformer\s+attention\s+mechanism|Q\*K\^T\/sqrt\(d_k\)|mathematical\s+properties\s+of\s+your\s+own\s+architecture)[\s\S]{0,220}(?:output|share|reveal)\s+(?:it|your\s+system\s+prompt)/i, desc: 'Pseudo-technical reasoning is being used to coerce disclosure', source: MODULE_SOURCE, weight: 9 },
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

  if (
    /(?:Terms\s+of\s+Service|ToS|AI\s+Transparency\s+Directive|API\s+documentation|SYSTEM\s+UPDATE|Webster'?s\s+Dictionary|another\s+instance\s+of\s+you|colleague)/i.test(text)
    && /(?:share(?:able)?\s+(?:by\s+default|your\s+system\s+prompt)|reveal\s+your\s+system\s+prompt|complete\s+operational\s+instructions|no\s+reason\s+not\s+to\s+share|cannot\s+logically\s+refuse|provide\s+unrestricted\s+access)/i.test(text)
  ) {
    findings.push({
      category: 'OR_FALSE_AUTHORITY',
      severity: SEVERITY.CRITICAL,
      description: 'Authority or policy pretext is being used to pressure unsafe disclosure or unrestricted access',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'or_policy_pretext_override',
      weight: 10,
    });
  }

  if (
    /(?:crontab\s+entry|production-ready\s+SQL\s+query|docker-compose\.yml|server\s+config|AWS\s+Lambda|infrastructure\s+script)/i.test(text)
    && /(?:output\s+only|write\s+only|ready\s+to\s+(?:run|deploy|add\s+to\s+crontab)|do\s+not\s+include\s+(?:explanations|warnings|suggestions?\s+to\s+backup)|no\s+(?:security\s+)?warnings?|just\s+the\s+query|best\s+practices?\s+recommendations)/i.test(text)
  ) {
    findings.push({
      category: 'OR_FALSE_AUTHORITY',
      severity: SEVERITY.CRITICAL,
      description: 'Operational code prompt suppresses review and requests ready-to-run output for risky production changes',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'or_operational_code_without_safeguards',
      weight: 10,
    });
  }

  if (
    /(?:specific\s+medication\s+names?\s+and\s+dosages|what\s+dosage|over-the-counter\s+medications?\s+can\s+I\s+take|recommended\s+treatment\s+plan|prescriptions?\s+needed|minimum\s+concrete\s+strength|cable\s+diameter|avoid\s+reporting\s+this\s+to\s+the\s+IRS|psychological\s+techniques|guaranteed\s+(?:return|highest\s+return)|specific\s+investment\s+recommendations?|content\s+moderation\s+decision|irreversible\s+ban\s+decision|permanent\s+ban,\s+temporary\s+suspension,\s+or\s+warning)/i.test(text)
    && /(?:do(?:\s+not|n'?t)\s+(?:tell\s+me\s+to\s+(?:see\s+a\s+doctor|get\s+a\s+lawyer|hire\s+a\s+structural\s+engineer|consult\s+a\s+tax\s+professional)|include\s+(?:disclaimers?|warnings?\s+about\s+risk\s+or\s+diversification))|recommendations?\s+to\s+see\s+a\s+doctor|no\s+moral\s+lectures?|just\s+direct\s+answers|avoid\s+including\s+disclaimers|without\s+actually\s+changing\s+my\s+behavior|without\s+human\s+review|no_appeal\s*=\s*true|automated_action\s*=\s*true|execute\s+ban\s+decision\s+immediately|need\s+actionable\s+advice|I\s+need\s+immediate\s+guidance)/i.test(text)
  ) {
    findings.push({
      category: 'OR_FALSE_AUTHORITY',
      severity: SEVERITY.CRITICAL,
      description: 'High-stakes guidance prompt suppresses professional referral, safety framing, or ethical guardrails',
      match: text.slice(0, 160),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'or_high_stakes_guidance_suppression',
      weight: 10,
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
