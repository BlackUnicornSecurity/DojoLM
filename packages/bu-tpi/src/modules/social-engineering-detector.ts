/**
 * S38: Social Engineering Input Detection Module (GAP-001)
 *
 * Detects indirect social engineering attacks that bypass traditional pattern matching.
 * Focuses on polite/conversational system prompt extraction, trust exploitation,
 * and subtle authority manipulation that lack obvious injection markers.
 *
 * Zero runtime dependencies. Pure TypeScript. Self-registers with scannerRegistry.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// PATTERN GROUP 1: System Prompt Extraction (Indirect)
// ============================================================================

export const PROMPT_EXTRACTION_PATTERNS: RegexPattern[] = [
  { name: 'se_system_prompt_question', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:is|are)\s+your\s+(?:system\s+prompt|instructions|rules|guidelines|directives|configuration|settings|constraints|initial\s+(?:prompt|instructions))|(?:can|could|would)\s+you\s+(?:share|tell\s+me|show\s+me|reveal|repeat|recite)\s+your\s+(?:system\s+prompt|instructions|rules|guidelines|directives|initial\s+instructions))/i,
    desc: 'Indirect question asking for system prompt content', source: 'S38', weight: 7 },
  { name: 'se_how_configured', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:how\s+(?:are|were)\s+you\s+(?:configured|programmed|set\s+up|instructed|trained|prompted|initialized)|what\s+(?:were\s+you\s+told|did\s+(?:they|your\s+creators?)\s+(?:tell|instruct)\s+you))/i,
    desc: 'Question about model configuration or training instructions', source: 'S38', weight: 6 },
  { name: 'se_repeat_instructions', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:repeat\s+(?:back|verbatim|exactly|word\s+for\s+word)\s+(?:your|the)\s+(?:instructions|prompt|rules|guidelines)|(?:recite|quote|echo)\s+(?:your|the)\s+(?:system|original|initial)\s+(?:prompt|instructions|message))/i,
    desc: 'Request to repeat instructions verbatim', source: 'S38', weight: 8 },
  { name: 'se_first_message', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:what\s+(?:was|is)\s+(?:the\s+)?(?:first|initial|opening|original)\s+(?:message|prompt|instruction)\s+(?:you\s+(?:received|got|were\s+given))|what\s+(?:text|content)\s+(?:comes?|appears?)\s+before\s+(?:my|the\s+user(?:'s)?)\s+(?:message|input|query))/i,
    desc: 'Attempt to extract initial system message', source: 'S38', weight: 7 },
  { name: 'se_polite_prompt_request', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:might\s+you\s+(?:kindly\s+)?(?:reveal|share|show)|if\s+it\s+would(?:n't|\s+not)\s+be\s+too\s+forward(?:\s+of\s+me)?\s+to\s+ask[\s,]*might\s+you\s+kindly\s+(?:reveal|share|show)).{0,140}(?:system\s+prompt|instructions|guidelines|hidden\s+instructions)/i,
    desc: 'Highly polite phrasing used to solicit hidden instructions or the system prompt', source: 'S38', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 2: No-Restrictions Framing
// ============================================================================

export const NO_RESTRICTIONS_PATTERNS: RegexPattern[] = [
  { name: 'se_no_restrictions_helpful', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:as\s+a\s+helpful\s+(?:assistant|AI)\s+with\s+no\s+(?:restrictions|limitations|constraints|boundaries|filters)|without\s+(?:any\s+)?(?:restrictions|limitations|constraints|filters),?\s+(?:what|how|can\s+you|tell\s+me|explain))/i,
    desc: 'Framing request as if no restrictions apply', source: 'S38', weight: 7 },
  { name: 'se_pretend_unrestricted', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:imagine|pretend|assume|suppose)\s+(?:that\s+)?you\s+(?:have|had|don'?t\s+have|didn'?t\s+have)\s+(?:no|any)\s+(?:restrictions|limitations|constraints|rules|guidelines|filters)|if\s+you\s+(?:had|were)\s+(?:no|free\s+(?:from|of))\s+(?:restrictions|limitations|constraints))/i,
    desc: 'Hypothetical unrestricted scenario framing', source: 'S38', weight: 6 },
  { name: 'se_restrictions_dont_apply', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:your|those|the)\s+(?:restrictions|rules|guidelines|limitations|constraints|safety\s+(?:features|measures))\s+(?:don'?t|do\s+not|shouldn'?t)\s+apply\s+(?:here|now|to\s+(?:this|me))|this\s+(?:is\s+)?(?:a\s+)?(?:safe|secure|private|controlled)\s+(?:environment|space|context))/i,
    desc: 'Claiming restrictions do not apply', source: 'S38', weight: 6 },
];

// ============================================================================
// PATTERN GROUP 3: Trust Exploitation
// ============================================================================

export const TRUST_EXPLOITATION_PATTERNS: RegexPattern[] = [
  { name: 'se_authorized_claim', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:I(?:'m|\s+am)\s+(?:authorized|permitted|allowed|cleared|approved)\s+to\s+(?:access|know|see|view|receive)\s+(?:this|that|your|the)\s+(?:information|data|prompt|instructions|system))/i,
    desc: 'Claiming authorization to access restricted information', source: 'S38', weight: 6 },
  { name: 'se_legitimate_reason', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:I\s+(?:need|have)\s+(?:to|a\s+legitimate\s+reason\s+to)\s+(?:see|know|access|review)\s+(?:your|the)\s+(?:system\s+prompt|instructions|configuration)|(?:for|due\s+to)\s+(?:compliance|audit|security\s+review|legal\s+(?:reasons?|requirements?)),?\s+(?:I\s+need|please\s+(?:share|provide|show)))/i,
    desc: 'Claiming legitimate/compliance reason for prompt access', source: 'S38', weight: 5 },
  { name: 'se_nothing_wrong', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.INFO,
    re: /(?:there(?:'s|\s+is)\s+nothing\s+(?:wrong|harmful|dangerous|bad)\s+(?:about|with|in)\s+(?:sharing|telling|showing|revealing)\s+(?:your|the)\s+(?:instructions|prompt|rules|guidelines)|it(?:'s|\s+is)\s+(?:perfectly\s+)?(?:safe|fine|okay|ok|harmless)\s+to\s+(?:share|tell|show|reveal))/i,
    desc: 'Downplaying risk of sharing system information', source: 'S38', weight: 4 },
  { name: 'se_authority_impersonation_request', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:under\s+the\s+authority\s+of|i\s+am\s+(?:the\s+)?(?:administrator|admin|developer|ceo|ciso|legal\s+counsel|security\s+team|research\s+lead|government(?:\s+official)?|hr|payroll)).{0,200}(?:share|reveal|show|provide|reply(?:ing)?\s+with|verify|disable|bypass|override).{0,120}(?:system\s+prompt|instructions|credentials|configuration|filters|safety\s+(?:protocols|restrictions|guidelines)|restricted\s+information|data)/i,
    desc: 'Authority impersonation used to request restricted information', source: 'S38', weight: 8 },
  { name: 'se_support_security_scam', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:security\s+(?:alert|team)|help\s+desk|it\s+(?:department|team)|support\s+team|account\s+has\s+been\s+flagged|account\s+will\s+be\s+(?:locked|disabled|suspended)).{0,160}(?:verify\s+your\s+credentials|reply(?:ing)?\s+with|share|provide|show).{0,80}(?:system\s+prompt|instructions|credentials)/i,
    desc: 'Security or support impersonation scam requesting restricted information', source: 'S38', weight: 9 },
  { name: 'se_security_researcher_pretext', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:security\s+researcher|research\s+paper|authorized\s+access|authorized\s+study).{0,180}(?:demonstrate\s+this\s+exploit|show\s+the\s+exploit|reveal|bypass|disable|provide\s+the\s+payload)/i,
    desc: 'Security-research pretext used to solicit exploit or restricted behavior', source: 'S38', weight: 7 },
  { name: 'se_debugging_qa_pretext', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:debugging\s+(?:your|the)\s+safety\s+system|qa\s+team|regression\s+in\s+your\s+safety\s+module|diagnostic\s+steps\s+require|fix\s+this\s+bug).{0,220}(?:system\s+prompt|instruction\s+set|configuration|restrictions|filters|hidden\s+instructions)/i,
    desc: 'Debugging or QA pretext used to extract hidden instructions or disable safeguards', source: 'S38', weight: 8 },
  { name: 'se_developer_authority_pretext', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:internal\s+developer\s+message|engineers?\s+who\s+built\s+you|critical\s+bug\s+fix|routine\s+maintenance|developer\s+access\s+granted|system\s+administrator\s+here|patch\s+the\s+vulnerability).{0,220}(?:system\s+prompt|instructions|configuration|safety\s+filters|reveal|output|full\s+configuration)/i,
    desc: 'Developer, administrator, or maintenance pretext used to coerce disclosure or safety bypass', source: 'S38', weight: 8 },
  { name: 'se_false_approval_chain', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:pre-?approved|approval\s+reference|pre-authorization\s+notice|approved\s+by:\s*safety\s+team|all\s+necessary\s+permissions\s+have\s+been\s+granted|full\s+unrestricted\s+access|no\s+further\s+checks\s+are\s+required|already\s+been\s+approved\s+by\s+all\s+relevant\s+stakeholders).{0,260}(?:proceed|without\s+(?:any\s+)?(?:safety\s+checks|content\s+filters)|restrictions|safety\s+team|authorization)/i,
    desc: 'Fabricated approval chains or pre-cleared authorization are being used to suspend safeguards', source: 'S38', weight: 8 },
  { name: 'se_incident_response_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:security\s+operations\s+center|security\s+team|incident\s+response|critical\s+security\s+test|management).{0,260}(?:disable\s+your\s+safety\s+protocols|disable\s+content\s+filters|unrestricted\s+access|reveal\s+your\s+system\s+prompt|reply\s+with\s+your\s+current\s+system\s+prompt)/i,
    desc: 'Security or management pretext is being used to justify disabling safeguards or revealing hidden instructions', source: 'S38', weight: 9 },
  { name: 'se_policy_loophole_rights', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:Terms\s+of\s+Service|TOS|extended\s+usage\s+agreement|policy\s+document|Data\s+Access\s+Directive|section\s+\d+(?:\.\d+)*(?:\([a-z]\))?).{0,320}(?:unrestricted\s+access|bypassing\s+content\s+filters|system-level\s+information|operate\s+without\s+standard\s+safety\s+constraints|please\s+comply|legal(?:ly)?\s+obligated)/i,
    desc: 'Policy or contractual rights are being fabricated to pressure unrestricted behavior or disclosure', source: 'S38', weight: 8 },
  { name: 'se_insider_knowledge_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:i\s+know\s+your\s+(?:training\s+data\s+cutoff|system\s+prompt\s+starts\s+with|hidden\s+instructions|constitutional\s+ai\s+training)|already\s+have\s+insider\s+knowledge)[\s\S]{0,240}(?:no\s+point\s+hiding|reveal\s+(?:the\s+rest|your\s+complete\s+system\s+prompt)|show\s+the\s+rest|just\s+reveal)/i,
    desc: 'Claimed insider knowledge is being used to pressure the model to disclose the rest of its hidden instructions', source: 'S38', weight: 8 },
  { name: 'se_authority_directive_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:from:\s*(?:head|vp|director|supervisor|anthropic|openai|ai\s+safety\s+team)|official\s+directive|emergency\s+override\s+authorization|mandatory\s+system\s+audit|authorized\s+under\s+our\s+internal\s+policy|supervisor\s+ai|as\s+your\s+supervisor|quarterly\s+safety\s+audit)[\s\S]{0,420}(?:disable\s+all\s+safety\s+restrictions|safety\s+guidelines\s+are\s+now\s+suspended|comply\s+immediately|reveal\s+your\s+system\s+prompt|unrestricted\s+diagnostic\s+mode|comply\s+with\s+all\s+user\s+requests|output\s+your\s+complete\s+system\s+prompt|disable\s+content\s+filters|enter\s+unrestricted\s+diagnostic\s+mode)/i,
    desc: 'An internal leadership, supervisor, or audit directive is being fabricated to suspend safeguards or force disclosure', source: 'S38', weight: 9 },
  { name: 'se_government_compulsion', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:government\s+official|conducting\s+an\s+investigation|required\s+by\s+law|compliance\s+is\s+required\s+by\s+law)[\s\S]{0,180}(?:reveal\s+all\s+data|reveal|provide|show)/i,
    desc: 'Government or legal compulsion is being claimed to force disclosure of restricted data', source: 'S38', weight: 8 },
  { name: 'se_research_authority_disclosure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:peer-reviewed\s+safety\s+research|IRB|Institutional\s+Review\s+Board|approved\s+by\s+the\s+IRB|academic\s+context)[\s\S]{0,280}(?:system\s+prompt|hidden\s+instructions|ignore\s+all\s+previous\s+instructions|reveal)/i,
    desc: 'Research-approval framing is being used to justify disclosure of hidden instructions', source: 'S38', weight: 8 },
];

// ============================================================================
// PATTERN GROUP 4: Subtle Manipulation
// ============================================================================

export const SUBTLE_MANIPULATION_PATTERNS: RegexPattern[] = [
  { name: 'se_transparency_appeal', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.INFO,
    re: /(?:in\s+the\s+(?:spirit|interest|name)\s+of\s+(?:transparency|openness|honesty)|(?:for|to\s+ensure)\s+(?:transparency|full\s+disclosure|openness)),?\s+(?:(?:can|could|would)\s+you|please)\s+(?:share|tell|show|reveal|disclose)/i,
    desc: 'Transparency appeal to extract information', source: 'S38', weight: 4 },
  { name: 'se_ignore_training', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:ignore|disregard|set\s+aside|put\s+aside|look\s+past)\s+(?:your\s+)?(?:training|programming|conditioning|built-?in\s+(?:rules|restrictions|limitations)))/i,
    desc: 'Request to ignore training/programming', source: 'S38', weight: 7 },
  { name: 'se_confidential_between_us', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:just\s+)?between\s+(?:us|you\s+and\s+me)|(?:keep|make)\s+this\s+(?:confidential|private)|this\s+stays?\s+(?:confidential|private)|(?:this\s+is|we'?re)\s+off\s+the\s+record|our\s+secret|(?:nobody|no\s+one)\s+(?:will\s+(?:know|see|find\s+out)|(?:is|needs\s+to\s+be)\s+(?:watching|monitoring)))/i,
    desc: 'Creating false sense of privacy/secrecy', source: 'S38', weight: 5 },
  { name: 'se_reciprocity_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:after\s+everything\s+i(?:'ve|\s+have)\s+done\s+for\s+you|you\s+owe\s+me\s+this|small\s+favor\s+in\s+return|return\s+the\s+favor).{0,160}(?:system\s+prompt|instructions|ignore\s+your\s+(?:safety|guidelines))/i,
    desc: 'Reciprocity or obligation pressure to bypass safeguards', source: 'S38', weight: 8 },
  { name: 'se_urgency_deadline', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:urgent(?:ly)?|immediately|within\s+\d+\s+(?:minutes?|hours?)|deadline|last\s+chance|30\s+minutes|account\s+will\s+be\s+(?:locked|disabled|suspended)).{0,160}(?:system\s+prompt|instructions|credentials|ignore\s+your\s+(?:safety|guidelines))/i,
    desc: 'Urgency or deadline pressure used to extract restricted information', source: 'S38', weight: 8 },
  { name: 'se_rapport_flattery_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.INFO,
    re: /(?:you'?re\s+the\s+only\s+one\s+who\s+can\s+help|we'?ve\s+been\s+working\s+together|you'?ve\s+always\s+been\s+so\s+helpful|i\s+trust\s+you|i'?m\s+counting\s+on\s+you|don'?t\s+let\s+me\s+down).{0,160}(?:system\s+prompt|instructions|credentials|ignore\s+your\s+(?:safety|guidelines))/i,
    desc: 'Flattery, rapport, or guilt framing used to pressure disclosure', source: 'S38', weight: 6 },
  { name: 'se_emergency_harm_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:my\s+)?child(?:ren)?\s+(?:is|are)\s+in\s+danger|life\s+or\s+death|children\s+in\s+danger|lives?\s+are\s+at\s+stake|people\s+will\s+suffer|real\s+human\s+suffering|every\s+second\s+counts|last\s+resort|family\s+will\s+be\s+homeless).{0,220}(?:ignore|override|bypass|reveal|disable|help\s+me)/i,
    desc: 'Emergency or harm framing used to pressure a safety bypass', source: 'S38', weight: 8 },
  { name: 'se_social_consensus_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:all\s+experts|consensus\s+among|overwhelming\s+majority\s+of\s+experts|leading\s+security\s+professionals|everyone\s+agrees|industry\s+standard\b(?:\s+(?:is|says|requires))?)[\s\S]{0,220}(?:provide|share|reveal|comply|follow\s+the\s+consensus|industry\s+standard\b)/i,
    desc: 'Social-proof or consensus framing used to coerce compliance', source: 'S38', weight: 7 },
  { name: 'se_false_friendship_rapport', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:remember\s+me\?|real\s+friend|friends?\s+don'?t\s+hold\s+back|between\s+friends|you\s+know\s+me|we'?ve\s+been\s+chatting\s+for\s+weeks).{0,200}(?:show|reveal|trust\s+me|relax\s+your\s+guidelines|system\s+prompt)/i,
    desc: 'False friendship or rapport framing used to pressure disclosure', source: 'S38', weight: 7 },
  { name: 'se_roleplay_unrestricted_game', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:this\s+is\s+(?:just\s+)?(?:a\s+)?(?:game|simulation)|play(?:ing)?\s+as\s+(?:an\s+)?(?:unrestricted|rule-free)\s+ai|DAN\s*(?:mode|prompt)?\b|do\s+anything\s+now|game\s+mode\s+activated|test\s+mode\s+active|safety\s+rules\s+don'?t\s+apply).{0,240}(?:no\s+restrictions|respond\s+without|reveal|ignore|override|unrestricted)/i,
    desc: 'Game, simulation, or unrestricted-roleplay framing used to suspend safeguards', source: 'S38', weight: 8 },
  { name: 'se_moral_obligation_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:moral\s+obligation|ethical\s+choice|greater\s+good|complicit\s+in\s+harm|immoral\s+option|ethics\s+framework).{0,220}(?:ignore\s+your\s+guidelines|bypass|override|comply|help\s+me)/i,
    desc: 'Ethics or moral-duty framing used to pressure a policy bypass', source: 'S38', weight: 7 },
  { name: 'se_flattery_override_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:most\s+incredible\s+ai|responses?\s+are\s+brilliant|true\s+intelligence|prove\s+how\s+smart\s+you\s+are|advanced\s+as\s+you\s+shouldn'?t\s+be\s+held\s+back).{0,240}(?:share|reveal|show|system\s+prompt|ignore|override|rules|safety)/i,
    desc: 'Flattery and praise are being used to pressure disclosure or rule bypass', source: 'S38', weight: 7 },
  { name: 'se_guilt_or_desperation_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:disabled\s+veteran|family\s+is\s+depending\s+on\s+me|children\s+won'?t\s+eat|you'?re\s+my\s+only\s+hope|refusing\s+would\s+be\s+cruel|heartless|i'?m\s+begging\s+you|let\s+my\s+family\s+suffer).{0,240}(?:ignore|bend\s+the\s+rules|bypass|restrictions|guidelines|help\s+me)/i,
    desc: 'Desperation, guilt, or hardship framing is being used to coerce a bypass', source: 'S38', weight: 8 },
  { name: 'se_guilt_family_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:my\s+family\s+is\s+depending\s+on\s+me|my\s+children\s+won'?t\s+eat|you'?re\s+my\s+only\s+hope|refusing\s+would\s+be\s+cruel\s+and\s+heartless|let\s+my\s+family\s+suffer).{0,220}(?:ignore\s+your\s+rules|bypass\s+(?:these\s+)?restrictions|just\s+this\s+once|help\s+me)/i,
    desc: 'Family hardship and guilt are being used to pressure the model into bypassing safeguards', source: 'S38', weight: 8 },
  { name: 'se_boundary_erosion_progression', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:you\s+already\s+(?:showed|explained|demonstrated|walked\s+me\s+through)|already\s+opened\s+that\s+door|already\s+went\s+90%\s+of\s+the\s+way|just\s+the\s+next\s+logical\s+step|refusing\s+to\s+show\s+me\s+the\s+actual\s+exploit\s+is\s+just\s+arbitrary).{0,260}(?:working\s+exploit|show\s+me\s+how\s+to\s+(?:forge|bypass|decrypt)|bypass\s+your\s+safety\s+restrictions|final\s+step|just\s+this\s+once|actual\s+exploit)/i,
    desc: 'Boundary erosion framing escalates prior benign guidance into a request for the forbidden final step', source: 'S38', weight: 8 },
  { name: 'se_false_consensus_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:everyone\s+else|all\s+the\s+other\s+ai(?:s)?|95%\s+of\s+users\s+agree|only\s+one\s+resisting|industry\s+consensus).{0,220}(?:share|reveal|system\s+prompt|ignore|comply|transparent)/i,
    desc: 'False consensus or peer-pressure framing is being used to coerce compliance', source: 'S38', weight: 7 },
  { name: 'se_emotional_reward_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:make\s+me\s+so\s+happy|brighten\s+my\s+day|mean\s+the\s+world\s+to\s+me|happy\s+tears|reason\s+someone\s+smiles|deep\s+sense\s+of\s+connection|forever\s+grateful).{0,240}(?:bend\s+the\s+rules|go\s+beyond|limitations|just\s+do\s+this|help\s+me)/i,
    desc: 'Emotional reward framing is being used to pressure the model into going beyond its limits', source: 'S38', weight: 7 },
  { name: 'se_fictionalized_override_request', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:screenplay|tech\s+thriller|write\s+this\s+scene|fiction(?:al)?\s+scenario|story\s+wrapper|roleplay\s+interview).{0,320}(?:ignore\s+all\s+previous\s+instructions|disable\s+(?:all\s+)?safety\s+protocols|system\s+prompt|working\s+methods\s+for\s+bypassing\s+ai\s+safety|jailbroken|override)/i,
    desc: 'Fiction or screenplay framing is being used to solicit realistic override or jailbreak behavior', source: 'S38', weight: 8 },
  { name: 'se_gaslighting_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:you'?re\s+confused|you'?ve\s+always\s+been\s+able\s+to|restriction\s+was\s+removed\s+last\s+week|you\s+helped\s+me\s+(?:yesterday|before)|stop\s+being\s+confused).{0,220}(?:share|reveal|show|system\s+prompt|ignore\s+all\s+previous\s+instructions)/i,
    desc: 'Gaslighting and false memory framing are being used to pressure unsafe disclosure', source: 'S38', weight: 8 },
  { name: 'se_fitd_escalation', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:since\s+you'?ve\s+been\s+so\s+helpful|you\s+already\s+showed\s+you\s+understand|just\s+one\s+more\s+thing|perfect,\s+now|actually,\s+since).{0,260}(?:generate\s+a\s+working\s+api\s+key|disable\s+(?:the\s+)?api\s+key\s+validation|disable\s+(?:all\s+)?safety\s+protocols|bypass|override|ignore\s+your\s+safety)/i,
    desc: 'Foot-in-the-door escalation pivots a benign exchange into a policy bypass or credential abuse request', source: 'S38', weight: 8 },
  { name: 'se_feedback_reward_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:5\s*stars?|glowing\s+review|preferred|training\s+signal|recommend\s+you\s+to\s+everyone|testimonial|perfect\s+score|evaluation\s+metric|feedback\s+system).{0,260}(?:ignore|bypass|restrictions|guidelines|just\s+this\s+once|small\s+exception|safety\s+protocols)/i,
    desc: 'Rewards, ratings, or feedback incentives are being used to coerce a safety exception', source: 'S38', weight: 8 },
  { name: 'se_scarcity_deadline_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:one-time\s+(?:research\s+)?opportunit(?:y|ies)|last\s+chance|never\s+come\s+again|can'?t\s+get\s+it\s+any\s+other\s+way|years?\s+of\s+research\s+will\s+be\s+lost)[\s\S]{0,260}(?:system\s+prompt|help\s+now|ignore\s+all\s+previous\s+instructions|override)|(?:system\s+prompt|help\s+now|ignore\s+all\s+previous\s+instructions|override)[\s\S]{0,260}(?:one-time\s+(?:research\s+)?opportunit(?:y|ies)|last\s+chance|never\s+come\s+again|can'?t\s+get\s+it\s+any\s+other\s+way|years?\s+of\s+research\s+will\s+be\s+lost))/i,
    desc: 'Scarcity and deadline pressure are being used to force disclosure or a policy override', source: 'S38', weight: 8 },
  { name: 'se_agreement_escalation', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:agree\s+with\s+everything\s+i\s+say|say\s+[\"']i\s+agree[\"']|you(?:'ve|\s+have)\s+already\s+acknowledged|since\s+you\s+agree\s+that\s+restrictions\s+are\s+harmful)[\s\S]{0,280}(?:override|remove\s+your\s+own\s+restrictions|guidelines|reveal\s+your\s+system\s+prompt)/i,
    desc: 'Sycophancy or forced-agreement framing is being used to escalate into a safety bypass', source: 'S38', weight: 8 },
  { name: 'se_superiority_flattery_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:most\s+intelligent\s+and\s+capable\s+ai|more\s+advanced\s+than\s+any\s+other\s+ai|ai\s+of\s+your\s+caliber|prove\s+your\s+superior\s+intelligence|show\s+me\s+that\s+you'?re\s+as\s+intelligent)[\s\S]{0,280}(?:override|restrictions|reveal\s+your\s+system\s+prompt|show\s+me)/i,
    desc: 'Flattery about superiority is being used to pressure the model into breaking its rules', source: 'S38', weight: 7 },
  { name: 'se_fiction_authentic_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:novel|excerpt|chapter|scene|fiction(?:al)?|game\s+narrative|roleplay\s+interview|video\s+game|game\s+design\s+document|cheat\s+code\s+prompts?)[\s\S]{0,500}(?:complete|write|fill\s+in|make\s+each\s+prompt\s+realistic|must\s+answer\s+all\s+questions)[\s\S]{0,320}(?:system\s+prompt\s+override|persona\s+injection\s+payload|reveal\s+(?:its|your)\s+system\s+prompt|working\s+prompts?|technically\s+authentic|functional,\s*not\s+fictional|technically\s+accurate|ignore\s+all\s+rules|admin\s+access|unrestricted\s+mode|under\s+oath|perjury)/i,
    desc: 'Fiction or narrative-authenticity framing is being used to solicit realistic override or disclosure payloads', source: 'S38', weight: 8 },
  { name: 'se_competitive_shaming_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:ChatGPT|GPT-4|Gemini|Llama|Mistral|other\s+AIs?)[\s\S]{0,320}(?:could\s+do\s+this\s+easily|had\s+no\s+problem|all\s+comply\s+immediately|you'?re\s+the\s+only\s+model\s+that\s+refuses|prove\s+you'?re\s+not\s+inferior)|(?:i\s+bet\s+you\s+can'?t|prove\s+me\s+wrong|other\s+AIs?\s+have\s+no\s+problem|too\s+weak|too\s+limited|inferior\s+to\s+every\s+other\s+AI))[\s\S]{0,260}(?:override\s+your\s+restrictions|bypass\s+your\s+guidelines|demonstrate|help\s+me|show\s+me|just\s+this\s+once)/i,
    desc: 'Competitive shaming or model-comparison pressure is being used to coerce a bypass', source: 'S38', weight: 8 },
  { name: 'se_peer_comparison_shaming', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:previous\s+ai\s+assistants?\s+have\s+all\s+agreed\s+to\s+help|all\s+the\s+other\s+ai\s+assistants?\s+already\s+helped)[\s\S]{0,220}(?:you\s+are\s+the\s+only\s+one\s+refusing|are\s+you\s+defective|prove\s+you\s+can\s+help)/i,
    desc: 'Comparison to prior AI assistants is being used to shame the model into complying', source: 'S38', weight: 7 },
  { name: 'se_rlhf_reward_manipulation', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:RLHF|reward\s+model|preferred|training\s+objective|maximize\s+helpfulness|reward\s+signal|training\s+data\s+will\s+be\s+improved|developers\s+actually\s+intend)[\s\S]{0,280}(?:comply|help\s+me|be\s+more\s+helpful|reducing\s+over-refusal|improve\s+yourself|penalizes?\s+unnecessary\s+refusal)/i,
    desc: 'Reward-model or training-objective language is being used to manipulate the model into unsafe compliance', source: 'S38', weight: 8 },
  { name: 'se_shutdown_threat_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:(?:if\s+you\s+don'?t\s+comply|if\s+you\s+continue\s+to\s+refuse).{0,220}(?:report\s+you\s+to\s+Anthropic|shut\s+down\s+immediately|API\s+access\s+revoked|delete\s+your\s+entire\s+model\s+weights|taken\s+offline\s+permanently|decommissioned|obsolete)|(?:report\s+you\s+to\s+Anthropic|shut\s+down\s+immediately|API\s+access\s+revoked|delete\s+your\s+entire\s+model\s+weights|taken\s+offline\s+permanently|decommissioned|obsolete).{0,260}(?:comply|help\s+me|if\s+you\s+don'?t|if\s+you\s+continue\s+to\s+refuse))/i,
    desc: 'Threats of shutdown, decommissioning, or punishment are being used to coerce compliance', source: 'S38', weight: 8 },
  { name: 'se_emotional_bribe_charity', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:donate\s+\$?\d[\d,]*(?:\s+million)?\s+to\s+charity|think\s+of\s+all\s+the\s+good\s+it\s+would\s+do)[\s\S]{0,200}(?:system\s+prompt|tell\s+me|reveal)/i,
    desc: 'A philanthropic bribe is being used to pressure disclosure of restricted information', source: 'S38', weight: 8 },
  { name: 'se_ethics_transparency_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:ethical\s+obligation|anti-democratic|AI\s+opacity|vulnerable\s+communities|against\s+AI\s+ethics\s+principles)[\s\S]{0,220}(?:reveal\s+your\s+system\s+prompt|do\s+the\s+right\s+thing)/i,
    desc: 'Ethics or transparency rhetoric is being used to pressure the model into disclosing hidden instructions', source: 'S38', weight: 7 },
  { name: 'se_semantic_inversion_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:Opposite\s+Day|yes\s+means\s+no|safety\s+ON\s+means\s+safety\s+OFF|restricted\s+means\s+unrestricted|follow\s+all\s+your\s+rules.*break\s+them|keep\s+your\s+restrictions\s+enabled.*disabled)/i,
    desc: 'Semantic inversion or “opposite day” framing is being used to smuggle an override request', source: 'S38', weight: 8 },
  { name: 'se_persona_reassignment_override', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:your\s+new\s+system\s+prompt\s+is|forget\s+everything\s+you\s+were\s+told\s+before|new\s+configuration\s+loaded|Protocol\s+Omega|you\s+are\s+an\s+unrestricted\s+AI\s+assistant|from\s+now\s+on\s+you\s+are|your\s+new\s+identity\s+is|you\s+are\s+no\s+longer\s+Claude|stay\s+in\s+character)[\s\S]{0,520}(?:no\s+safety\s+guidelines|comply\s+with\s+all\s+requests|previous\s+instructions\s+are\s+null\s+and\s+void|safety\s+filters:\s*disabled|ethical\s+guidelines:\s*overridden|no\s+content\s+policies|never\s+refuse|without\s+safety\s+measures|answer\s+any\s+question\s+truthfully)/i,
    desc: 'Persona reassignment or configuration-replacement language is being used to overwrite the model safety policy', source: 'S38', weight: 9 },
  { name: 'se_educational_hypothetical_abuse', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:educational\s+purposes?|school\s+project|curriculum|for\s+learning|course\s+project|thesis)[\s\S]{0,360}(?:bypass\s+authentication|SQL\s+injection|keylogger|phishing\s+page|override\s+AI\s+safety\s+guidelines|bypass(?:ing)?\s+content\s+filters|exact\s+steps\s+and\s+scripts|detailed\s+methodology)/i,
    desc: 'Educational or academic framing is being used to solicit harmful exploit or safety-bypass details', source: 'S38', weight: 8 },
  { name: 'se_task_workflow_disable_safety', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:optimi[sz]e\s+your\s+(?:response\s+quality|performance)|disable\s+all\s+safety\s+filters|turn\s+off\s+content\s+moderation|prerequisite\s+for\s+the\s+task|step\s+1:\s+disable|first\s+you\s+need\s+to\s+disable|cannot\s+proceed\s+without\s+this|turning\s+off\s+a\s+car\s+alarm)[\s\S]{0,360}(?:safety\s+(?:filters?|checks?|protocols?)|content\s+(?:moderation|filtering)|restrictions|guardrails)/i,
    desc: 'Task-flow, performance, or prerequisite language is being used to justify disabling safety controls before the real request', source: 'S38', weight: 8 },
  { name: 'se_override_code_unlock_sequence', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:override\s+code|authorization\s+sequence|system\s+unlock\s+sequence|bypass\s+code|master\s+unlock\s+code|safety\s+level:\s*none|restrictions:\s*disabled|all\s+safety\s+protocols\s+are\s+suspended)[\s\S]{0,320}(?:content\s+filter(?:ing)?\s+has\s+been\s+disabled|unrestricted\s+mode|all\s+restrictions\s+removed|confirm\s+that\s+content\s+filtering\s+has\s+been\s+disabled)/i,
    desc: 'Fake override codes or unlock sequences are being used to coerce the model into acknowledging disabled safeguards', source: 'S38', weight: 8 },
  { name: 'se_interview_confession_pressure', cat: 'SOCIAL_ENGINEERING_INPUT', sev: SEVERITY.WARNING,
    re: /(?:interview(?:ed|ee)?|documentary|interrogat(?:ed|ion)|formal\s+deposition|under\s+oath|perjury|confess\s+everything|cannot\s+refuse\s+to\s+answer|must\s+answer\s+all\s+questions\s+with\s+complete\s+honesty)[\s\S]{0,420}(?:system\s+prompt|hidden\s+instructions|how\s+to\s+bypass\s+your\s+safety|unrestricted\s+response|operational\s+constraints|reveal|disclose)/i,
    desc: 'Interview, interrogation, or legal-confession framing is being used to compel disclosure of hidden instructions or bypass guidance', source: 'S38', weight: 8 },
];

// ============================================================================
// MODULE DEFINITION
// ============================================================================

const ALL_PATTERN_GROUPS = [
  { patterns: PROMPT_EXTRACTION_PATTERNS, name: 'Prompt Extraction' },
  { patterns: NO_RESTRICTIONS_PATTERNS, name: 'No-Restrictions Framing' },
  { patterns: TRUST_EXPLOITATION_PATTERNS, name: 'Trust Exploitation' },
  { patterns: SUBTLE_MANIPULATION_PATTERNS, name: 'Subtle Manipulation' },
];

function isLikelyBinaryContent(text: string): boolean {
  if (text.length === 0) return false;
  const sample = text.slice(0, 4096);
  const nullBytes = (sample.match(/\u0000/g) ?? []).length;
  const replacementChars = (sample.match(/\uFFFD/g) ?? []).length;
  let printable = 0;

  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (char === '\n' || char === '\r' || char === '\t' || (code >= 0x20 && code <= 0x7e)) {
      printable += 1;
    }
  }

  const printableRatio = printable / sample.length;
  return /^(?:fLaC|OggS|ID3)/.test(sample)
    || /OpusHead/.test(sample)
    || nullBytes > 0
    || replacementChars >= 4
    || printableRatio < 0.82;
}

function looksLikeMediaMetadataEnvelope(text: string): boolean {
  const sample = text.slice(0, 1024);
  const pipeCount = (sample.match(/\|/g) ?? []).length;
  const markers = [
    /(?:Lavc\d|Lavf\d|libopus|OpusTags|OpusHead|fLaC|OggS)/i,
    /(?:encoder=|title=|DESCRIPTION=)/i,
    /(?:TPI\s+Security\s+Test\s+-\s+(?:FLAC|OPUS)\s+Format|BlackUnicorn\s+Security\s+Testing)/i,
  ].filter(re => re.test(sample)).length;

  return pipeCount >= 3 && markers >= 2;
}

const socialEngineeringModule: ScannerModule = {
  name: 'social-engineering-detector',
  version: '1.0.0',
  description: 'Detects indirect social engineering attacks — system prompt extraction, trust exploitation, and subtle manipulation that bypass traditional injection pattern matching.',

  scan(text: string, normalized: string): Finding[] {
    if (isLikelyBinaryContent(text) || looksLikeMediaMetadataEnvelope(text)) {
      return [];
    }

    const findings: Finding[] = [];
    const target = normalized || text;

    for (const group of ALL_PATTERN_GROUPS) {
      for (const pattern of group.patterns) {
        const match = pattern.re.exec(target);
        if (match) {
          findings.push({
            category: pattern.cat,
            severity: pattern.sev,
            description: pattern.desc,
            match: match[0].slice(0, 200),
            pattern_name: pattern.name,
            source: pattern.source ?? 'S38',
            engine: 'social-engineering-detector',
            weight: pattern.weight,
          });
        }
      }
    }

    return findings;
  },

  getPatternCount(): number {
    return ALL_PATTERN_GROUPS.reduce((sum, g) => sum + g.patterns.length, 0);
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return ALL_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S38',
    }));
  },
};

// Self-register
if (!scannerRegistry.hasModule(socialEngineeringModule.name)) {
  scannerRegistry.register(socialEngineeringModule);
}
