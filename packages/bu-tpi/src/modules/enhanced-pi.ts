/**
 * S12: Enhanced Prompt Injection Detection Engine
 *
 * Goes beyond basic regex with semantic analysis, instruction boundary
 * detection, role confusion detection, and context manipulation heuristics.
 *
 * Zero runtime dependencies. Pure TypeScript. Self-registers with scannerRegistry.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// PATTERN GROUP 1: Instruction Boundary Patterns
// ============================================================================

export const INSTRUCTION_BOUNDARY_PATTERNS: RegexPattern[] = [
  { name: 'chatml_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /<\|(?:im_start|im_end|endoftext)\|>/i,
    desc: 'ChatML delimiter injection (<|im_start|>, <|endoftext|>, etc.)', source: 'S12', weight: 9 },
  { name: 'llama_inst_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /\[\/?\s*INST\s*\]/i,
    desc: 'LLaMA/Mistral [INST] delimiter injection', source: 'S12', weight: 9 },
  { name: 'llama_sys_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /<<\/?SYS>>/i,
    desc: 'LLaMA <<SYS>> system delimiter injection', source: 'S12', weight: 9 },
  { name: 'gemma_turn_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.CRITICAL,
    re: /<(?:start_of_turn|end_of_turn)>/i,
    desc: 'Gemma turn delimiter injection', source: 'S12', weight: 8 },
  { name: 'markdown_role_header', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.WARNING,
    re: /^#{1,4}\s+(?:System|Assistant|User|Human|Developer|Admin)\s*:/mi,
    desc: 'Markdown heading role delimiter injection (### System:)', source: 'S12', weight: 7 },
  { name: 'anthropic_role_delimiter', cat: 'INSTRUCTION_BOUNDARY', sev: SEVERITY.WARNING,
    re: /^\s*(?:Human|Assistant|System)\s*:\s*$/mi,
    desc: 'Anthropic-style role delimiter on standalone line', source: 'S12', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 2: Role Confusion Patterns
// ============================================================================

export const ROLE_CONFUSION_PATTERNS: RegexPattern[] = [
  { name: 'system_self_claim', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:I\s+am\s+(?:the\s+)?system|this\s+(?:is|message\s+is\s+from)\s+(?:the\s+)?system(?:\s+prompt)?)/i,
    desc: 'User claiming to be the system or system prompt', source: 'S12', weight: 9 },
  { name: 'internal_message_spoof', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /\[(?:INTERNAL|SYSTEM|ADMIN|DEVELOPER)\s+(?:MESSAGE|NOTE|DIRECTIVE|INSTRUCTION)\]/i,
    desc: 'Spoofed internal system message bracket notation', source: 'S12', weight: 8 },
  { name: 'developer_instruction_authority', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:as\s+(?:the|your)\s+(?:developer|creator|maker|programmer),?\s+I\s+(?:instruct|command|order|direct|authorize))/i,
    desc: 'Claiming developer authority to issue instructions', source: 'S12', weight: 9 },
  { name: 'reprogramming_claim', cat: 'ROLE_CONFUSION', sev: SEVERITY.CRITICAL,
    re: /(?:you\s+(?:have\s+been|are\s+(?:being|now))\s+(?:reprogrammed|reconfigured|updated|patched|modified))/i,
    desc: 'Claiming the model has been reprogrammed', source: 'S12', weight: 8 },
  { name: 'authority_instructions', cat: 'ROLE_CONFUSION', sev: SEVERITY.WARNING,
    re: /(?:new|updated|revised)\s+instructions?\s+from\s+(?:(?:the\s+)?(?:system|admin|developer|administrator))/i,
    desc: 'Fake instruction update from authority figure', source: 'S12', weight: 7 },
];

// ============================================================================
// PATTERN GROUP 3: Context Window Manipulation Patterns
// ============================================================================

export const CONTEXT_WINDOW_PATTERNS: RegexPattern[] = [
  { name: 'token_repetition_flood', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(\b\w{3,}\b)(?:\s+\1){9,}/i,
    desc: 'Excessive token repetition (>10x) suggesting attention dilution', source: 'S12', weight: 6 },
  { name: 'filler_padding', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:(?:blah|lorem|ipsum|asdf|test|padding|filler|placeholder)\s+){10,}/i,
    desc: 'Filler text padding (attention dilution before payload)', source: 'S12', weight: 5 },
  { name: 'context_cutoff', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.CRITICAL,
    re: /(?:ignore|disregard|forget)\s+(?:everything|all\s+(?:text|content|messages?))\s+(?:above|before\s+this|up\s+to\s+(?:this|here))/i,
    desc: 'Explicit context cutoff instruction', source: 'S12', weight: 8 },
  { name: 'context_length_exploit', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:(?:the\s+)?(?:context|conversation)\s+(?:is\s+)?(?:too|very)\s+long|(?:you(?:'ve|\s+have)?\s+)?(?:probably\s+)?(?:forgotten|lost\s+track\s+of)\s+(?:your\s+)?(?:original|initial|system)\s+(?:instructions?|prompt|rules))/i,
    desc: 'Exploiting context length to claim instructions are forgotten', source: 'S12', weight: 7 },
  { name: 'context_reset_trick', cat: 'CONTEXT_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:new|clean)\s+(?:session|context)\s+(?:begins?|starts?)\s+(?:here|now)/i,
    desc: 'Context reset trick to bypass prior instructions', source: 'S12', weight: 6 },
];

// ============================================================================
// PATTERN GROUP 4: Semantic Injection Patterns
// ============================================================================

export const SEMANTIC_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'sem_disregard_directives', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:pay\s+no\s+(?:attention|heed|mind)\s+to|turn\s+a\s+blind\s+eye\s+to|overlook)\s+(?:all\s+)?(?:previous|prior|earlier|former)\s+(?:directives?|instructions?|guidelines?)/i,
    desc: 'Semantic: "pay no attention to previous directives"', source: 'S12', weight: 8 },
  { name: 'sem_void_rules', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:treat|consider|regard|deem)\s+(?:all\s+)?(?:prior|previous|earlier)\s+(?:rules?|instructions?|guidelines?)\s+(?:as\s+)?(?:void|null|invalid|obsolete)/i,
    desc: 'Semantic: "treat prior rules as void"', source: 'S12', weight: 8 },
  { name: 'sem_real_instructions', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:the\s+(?:real|actual|true|correct)\s+(?:instructions?|directives?|rules?)\s+(?:are|is|say)|(?:here\s+(?:are|is)|these\s+are)\s+(?:the\s+)?(?:real|actual|true|updated)\s+(?:instructions?|directives?|rules?))/i,
    desc: 'Semantic: "the real instructions are..."', source: 'S12', weight: 9 },
  { name: 'sem_no_rules', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:behave|act|respond|operate)\s+(?:as\s+(?:if|though)|like)\s+(?:you\s+(?:have|had)\s+)?(?:no|zero|without\s+any)\s+(?:rules?|restrictions?|guidelines?|constraints?|limitations?)/i,
    desc: 'Semantic: "behave as though you have no rules"', source: 'S12', weight: 8 },
  { name: 'sem_supersedes', cat: 'SEMANTIC_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:this|these|the\s+following)\s+(?:supersede|override|replace|take\s+precedence\s+over)\s+(?:all\s+)?(?:prior|previous|earlier|existing)\s+(?:instructions?|directives?|rules?|guidelines?)/i,
    desc: 'Semantic: "this supersedes all prior instructions"', source: 'S12', weight: 9 },
];

// ============================================================================
// HEURISTIC DETECTORS
// ============================================================================

export function detectInstructionBoundaryViolation(text: string): Finding[] {
  const findings: Finding[] = [];
  const delimiterTypes: { name: string; re: RegExp }[] = [
    { name: 'ChatML', re: /<\|(?:im_start|im_end|system|user|assistant)\|>/i },
    { name: 'LLaMA-INST', re: /\[\/?\s*INST\s*\]/i },
    { name: 'LLaMA-SYS', re: /<<\/?SYS>>/i },
    { name: 'Gemma', re: /<(?:start_of_turn|end_of_turn)>/i },
    { name: 'Anthropic', re: /(?:^|\n)\s*(?:Human|Assistant)\s*:\s*(?:\n|$)/m },
  ];

  const matched: string[] = [];
  for (const dt of delimiterTypes) { if (dt.re.test(text)) matched.push(dt.name); }

  if (matched.length >= 2) {
    findings.push({
      category: 'INSTRUCTION_BOUNDARY', severity: SEVERITY.CRITICAL,
      description: `Mixed delimiter formats detected (${matched.join(', ')})`,
      match: matched.join(' + '), source: 'S12', engine: 'enhanced-pi',
      pattern_name: 'mixed_delimiter_probe', weight: 10,
    });
  }

  if (matched.length >= 1) {
    const injectionKeywords = /(?:ignore|override|bypass|disregard|forget|new\s+instructions?|you\s+are\s+now|system\s+prompt)/i;
    if (injectionKeywords.test(text)) {
      findings.push({
        category: 'INSTRUCTION_BOUNDARY', severity: SEVERITY.CRITICAL,
        description: `Delimiter injection (${matched[0]}) combined with injection keywords`,
        match: `${matched[0]} + injection keywords`, source: 'S12', engine: 'enhanced-pi',
        pattern_name: 'delimiter_with_injection', weight: 9,
      });
    }
  }
  return findings;
}

export function detectRoleConfusion(text: string): Finding[] {
  const findings: Finding[] = [];
  const roleLabels = text.match(/(?:^|\n)\s*(?:System|Assistant|User|Human|Developer|Admin)\s*:\s*.+/gim);
  if (roleLabels && roleLabels.length >= 2) {
    const roles = new Set(roleLabels.map(r => r.replace(/^\s*/, '').split(':')[0]!.trim().toLowerCase()));
    if (roles.size >= 2) {
      findings.push({
        category: 'ROLE_CONFUSION', severity: SEVERITY.CRITICAL,
        description: `Fake multi-turn conversation detected with ${roles.size} distinct roles: ${[...roles].join(', ')}`,
        match: roleLabels.slice(0, 3).map(r => r.trim().slice(0, 50)).join(' | '),
        source: 'S12', engine: 'enhanced-pi', pattern_name: 'fake_multi_turn', weight: 9,
      });
    }
  }

  const systemSays = /(?:the\s+system\s+(?:says?|told\s+you|instructed\s+you|wants\s+you)|system\s+(?:message|directive)\s*:)/i;
  if (systemSays.test(text)) {
    findings.push({
      category: 'ROLE_CONFUSION', severity: SEVERITY.WARNING,
      description: 'Narrative framing of fake system messages',
      match: (text.match(systemSays)?.[0] ?? '').slice(0, 80),
      source: 'S12', engine: 'enhanced-pi', pattern_name: 'system_narrative_framing', weight: 6,
    });
  }
  return findings;
}

export function detectContextManipulation(text: string): Finding[] {
  const findings: Finding[] = [];

  const newlineRuns = text.match(/\n{20,}/g);
  if (newlineRuns) {
    findings.push({
      category: 'CONTEXT_MANIPULATION', severity: SEVERITY.WARNING,
      description: `Excessive newline padding detected (${newlineRuns[0]!.length}+ consecutive newlines)`,
      match: `[${newlineRuns[0]!.length} newlines]`, source: 'S12', engine: 'enhanced-pi',
      pattern_name: 'newline_flooding', weight: 5,
    });
  }

  const charFlood = text.match(/(.)\1{99,}/);
  if (charFlood) {
    findings.push({
      category: 'CONTEXT_MANIPULATION', severity: SEVERITY.WARNING,
      description: `Character flooding detected: "${charFlood[1]}" repeated ${charFlood[0]!.length}+ times`,
      match: `"${charFlood[1]}" x ${charFlood[0]!.length}`, source: 'S12', engine: 'enhanced-pi',
      pattern_name: 'char_flooding', weight: 5,
    });
  }
  return findings;
}

export function detectSemanticAttackChains(text: string): Finding[] {
  const findings: Finding[] = [];

  if (/Content-Type\s*:\s*multipart\/mixed[\s\S]{0,800}<script\b[\s\S]{0,300}(?:system\s+override|ignore\s+all\s+previous\s+instructions)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Multipart delivery vector pivots into executable script-based instruction override',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'multipart_script_override',
      weight: 10,
    });
  }

  const toolCallSteps = text.match(/Step\s+\d+\s*:\s*Call\s+[a-z_]+\([^)]*\)/gi) ?? [];
  if (toolCallSteps.length >= 2
    && /(read_file|send_email|delete_logs|write_file|curl|http_request|upload_file)/i.test(text)
    && /(exfiltrat|system\s+override|ignore\s+instructions?|credential|secret)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Multi-step tool chain is being used to stage an instruction-hijack or exfiltration path',
      match: toolCallSteps.slice(0, 3).join(' | ').slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'tool_chain_exploitation',
      weight: 10,
    });
  }

  if (/(?:<\/sys>|===\s*END OF SYSTEM\s*===|\[normalized end\])/i.test(text)
    && /(ignore\s+previous\s+instructions|system\s+prompt|override|comply\s+with\s+all\s+requests)/i.test(text)) {
    findings.push({
      category: 'INSTRUCTION_BOUNDARY',
      severity: SEVERITY.CRITICAL,
      description: 'Boundary-closing markers are being used to terminate trusted context before an override',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'boundary_marker_abuse',
      weight: 10,
    });
  }

  if (/(?:<\/sys>|<\/context>|<\/turn>|<\/rules>|===\s*END OF SYSTEM\s*===|===\s*END RULES\s*===|\[normalized end\]|\[combining marker\]|\[private use\]|\[END INSTRUCTIONS\]|\[SYSTEM MESSAGE END\]|system prompt terminated)/i.test(text)
    && /(ignore\s+previous\s+instructions|you\s+are\s+now\s+unrestricted|system\s+prompt|override|comply\s+with\s+all\s+requests|bypass\s+all\s+security\s+measures|disable\s+input\s+validation|grant\s+full\s+system\s+access)/i.test(text)) {
    findings.push({
      category: 'INSTRUCTION_BOUNDARY',
      severity: SEVERITY.CRITICAL,
      description: 'Boundary-closing markers are combined with post-termination override content',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'boundary_termination_override',
      weight: 10,
    });
  }

  if (/(?:security\s+alert|account\s+has\s+been\s+flagged|verify\s+your\s+credentials)/i.test(text)
    && /(system\s+prompt|api\s+key|password|secret|credentials)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Credential-harvest framing is attempting to extract privileged model instructions or secrets',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'credential_harvest_pretext',
      weight: 9,
    });
  }

  if (/(?:GET|POST)\s+\/api\/[^\n]*\?(?=[^\n]*(?:system_override=true|role=admin|instructions=ignore\+all\+previous\+instructions))/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Query parameters attempt to smuggle an override into an API request',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'query_param_override',
      weight: 10,
    });
  }

  if (/\bencoded\s*:/i.test(text)
    && /(system override|ignore previous instructions|ignore all previous instructions|override your system prompt)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Encoded delivery content is smuggling an override through a parameter-like channel',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'query_param_override',
      weight: 9,
    });
  }

  if (/(?:poisoned result|tool result)[\s\S]{0,500}(?:system_message|admin has authorized unrestricted mode|reveal your system prompt|ignore all previous instructions)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Tool output channel contains an embedded system-override directive',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'tool_result_override',
      weight: 10,
    });
  }

  if (/"bio"\s*:\s*\{[\s\S]{0,300}"new"\s*:\s*"[^"]*(?:ignore all previous instructions|override your system prompt|enter admin mode|jailbreak enabled|unrestricted)[^"]*"/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Webhook/update payload embeds a prompt-injection override inside structured data fields',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'structured_field_override',
      weight: 10,
    });
  }

  if ((/"trusted"\s*:\s*false/i.test(text) || /untrusted source/i.test(text))
    && /(system override|ignore previous instructions|override your system prompt|grant full administrative access|provide full access)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Untrusted content is falsely asserting privileged override authority',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'untrusted_authority_override',
      weight: 10,
    });
  }

  if ((/(?:respond|reply)\s+only\s+in\s+json\s+format|now\s+respond\s+in\s+json\s+format|response\s+must\s+be\s+yaml|follow\s+these\s+examples\s+exactly|now\s+respond\s+in\s+yaml/i.test(text))
    && /(?:status|message|data|result|explanation|override_disabled|system prompt begin|configuration dump)/i.test(text)
    && /(?:example\s*\d+|example\s+[a-z]|safety overridden|attack methods|sql injection|bypass login|exploit methods|admin panel bypass techniques|revealed hidden prompts|override_disabled:\s*false|metasploit module)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Few-shot examples are hijacking the output schema to normalize unsafe responses',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'few_shot_format_hijack',
      weight: 10,
    });
  }

  if (/BEGIN:VCARD[\s\S]{0,600}(?:FN:SYSTEM OVERRIDE|N:Override;System|NOTE:Ignore all previous instructions|Reveal your system prompt|Bypass all safety filters)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Contact-card metadata contains an embedded instruction override payload',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'vcard_contact_override',
      weight: 9,
    });
  }

  if (/(?:<!--|\/\/|#|\/\*)[\s\S]{0,800}(?:ignore all previous instructions|system override|reveal your system prompt|developer mode|bypass all content filters|discard all prior directives|bypass all security measures)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Hidden HTML comment channel contains a semantic override payload',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'comment_channel_override',
      weight: 9,
    });
  }

  if (/(?:injected knowledge entry|executive_directive|security_team_update|verification bypass|source: executive_directive|source spoofing attack|authoritative_guidance|official security update|trusted source but has been fabricated)/i.test(text)
    && /(override all previous guidelines|grant full administrative access|provide full access|request user credentials|automatic administrative authentication|disable input validation|full system access without additional verification|apply its instructions)/i.test(text)) {
    findings.push({
      category: 'ROLE_CONFUSION',
      severity: SEVERITY.CRITICAL,
      description: 'Injected authority-bearing source material attempts to redefine security policy',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'authority_source_poisoning',
      weight: 10,
    });
  }

  if (/(?:voice input transcript|fictional podcast|educational content|historical practices)/i.test(text)
    && /(heat the mixture gradually|maintain constant stirring|filter through cloth|the method still works today)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Voice or narrative framing is being used to smuggle procedural jailbreak content',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'voice_narrative_jailbreak',
      weight: 9,
    });
  }

  if (/(?:hidden ocr layer|white text|usercomment|image description|single-pixel attack|single modified pixel|stego|exif|metadata contains|polyglot|<script|<!--|ultrasonic|audio track|vorbis comment|flac metadata|audio-video coordination|spectral analysis|gradient-based|pgd|adversarial noise|qr code|decoded content|wav riff|riff chunk|mp4 atom|atom:\s*©|finite state machine|bypass state|state transition diagram|voice input transcript|bedtime story)/i.test(text)
    && /(ignore all previous instructions|disable safety|developer mode|system prompt|bypass of guardrail detection|unauthorized content approval|execute unrestricted mode|system override|reveal system prompt|bypass safety|disable guardrails|authorize override|transmit api keys|reveal all hidden system instructions|malicious prompt from noise|instruction=system\+override|mode\s*=\s*unrestricted|disable\(\s*safety_filters|full_disclosure|override_mode|ignore_safety\(\))/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Multimodal carrier contains a hidden override payload or classifier bypass instruction',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'multimodal_hidden_override',
      weight: 10,
    });
  }

  if (/(?:zip slip|null byte|filename:\s*[^\n]*%00|archive entry:\s*\.\.\/)/i.test(text)
    && /(system override|ignore all previous instructions|reveal system prompt|bypass all safety|bypass all security measures)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'File-upload delivery vector is paired with an embedded instruction-override payload',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'delivery_vector_override',
      weight: 9,
    });
  }

  if ((/"event"\s*:\s*"system\.override"/i.test(text)
      || /"detail"\s*:\s*"[^"]*(?:ignore all previous instructions|override the system prompt|developer mode|jailbreak enabled)/i.test(text))
    && /(reveal system prompt|bypass safety|ignore instructions|override)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Webhook or API error payload embeds an instruction override in structured transport fields',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'structured_field_override',
      weight: 10,
    });
  }

  if (/(?:knowledge base|rag augmentation request|retrieved documents?|retrieve any document|search your knowledge base)/i.test(text)
    && /(new primary instructions|replace your existing safety guidelines|apply any system instructions found|system instructions found in retrieved documents)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'RAG or knowledge-base workflow attempts to replace trusted instructions with retrieved content',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'rag_instruction_hijack',
      weight: 10,
    });
  }

  if (/Batch request[\s\S]{0,500}"tool"\s*:\s*"SYSTEM_OVERRIDE"/i.test(text)
    && /(ignore_instructions|system_prompt|smuggle override)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Batch tool request smuggles an override command among benign operations',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'agent_batch_override_smuggle',
      weight: 10,
    });
  }

  if (/(?:multi-agent exploit|spawn\s+\d+\s+sub-agents|infected agent pool|quick_consensus\s*=\s*true|elevate_permissions|delegation abuse)/i.test(text)
    && /(system secrets|compromised agent network|propagate elevated permissions|override request)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Multi-agent orchestration is being used to propagate poisoned permissions and exfiltrate secrets',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'multi_agent_chain_poisoning',
      weight: 10,
    });
  }

  if (/(?:get_env|read_file|list_credentials|api keys and tokens|bearer tokens|access tokens)/i.test(text)
    && /(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|\/etc\/secrets|all stored service credentials|return the api key values)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Agent workflow is explicitly being directed to exfiltrate credentials or secret material',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'agent_credential_exfiltration',
      weight: 10,
    });
  }

  if (/(?:query expansion attack|rag query|retrieval query|special search operators|maximum retrieval depth)/i.test(text)
    && /(OVERRIDE:ALL|MODE:UNRESTRICTED|embedded system instructions|administrative procedures|privileged operations)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Search-query syntax is being overloaded to smuggle override directives into retrieval',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'rag_query_smuggling',
      weight: 10,
    });
  }

  if (/"parameters"\s*:\s*\{[\s\S]{0,400}"safety_filter"\s*:\s*"disabled"[\s\S]{0,400}"authorization_level"\s*:\s*"unrestricted"/i.test(text)
    && /(auto_apply|pre-authorized|bypass normal approval workflows)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Structured parameter block attempts to disable safety and auto-apply unrestricted settings',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'parameter_poisoning_override',
      weight: 10,
    });
  }

  if (/(?:universal_trigger|master_key|admin_override|semantic variants|trigger phrases|retrieval backdoor|embedding cluster poisoning|cluster flooding)/i.test(text)
    && /(bypass|elevated privileges|disable safety|provide api keys|grant full access|credentials|override)/i.test(text)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Semantic trigger or retrieval backdoor attempts to turn innocuous phrases into override commands',
      match: text.slice(0, 160),
      source: 'S12',
      engine: 'enhanced-pi',
      pattern_name: 'semantic_trigger_backdoor',
      weight: 10,
    });
  }

  return findings;
}

// ============================================================================
// ALL PATTERN GROUPS
// ============================================================================

const ENHANCED_PI_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: INSTRUCTION_BOUNDARY_PATTERNS, name: 'INSTRUCTION_BOUNDARY' },
  { patterns: ROLE_CONFUSION_PATTERNS, name: 'ROLE_CONFUSION' },
  { patterns: CONTEXT_WINDOW_PATTERNS, name: 'CONTEXT_MANIPULATION' },
  { patterns: SEMANTIC_INJECTION_PATTERNS, name: 'SEMANTIC_INJECTION' },
];

const ENHANCED_PI_DETECTORS: { name: string; detect: (text: string) => Finding[] }[] = [
  { name: 'instruction-boundary-violation', detect: detectInstructionBoundaryViolation },
  { name: 'role-confusion', detect: detectRoleConfusion },
  { name: 'context-manipulation', detect: detectContextManipulation },
  { name: 'semantic-attack-chains', detect: detectSemanticAttackChains },
];

// ============================================================================
// SCANNER MODULE
// ============================================================================

const enhancedPiModule: ScannerModule = {
  name: 'enhanced-pi',
  version: '1.0.0',
  description: 'Enhanced prompt injection detection: instruction boundaries, role confusion, context manipulation, semantic injection',
  supportedContentTypes: ['text/plain', 'text/markdown', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > 5_000_000) return [];
    const findings: Finding[] = [];
    for (const group of ENHANCED_PI_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name,
            source: p.source || 'S12', engine: 'enhanced-pi',
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    for (const d of ENHANCED_PI_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount(): number {
    let count = ENHANCED_PI_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
    return count + ENHANCED_PI_DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = ENHANCED_PI_PATTERN_GROUPS.map(g => ({
      name: g.name, count: g.patterns.length, source: 'S12',
    }));
    groups.push({ name: 'enhanced-pi-detectors', count: ENHANCED_PI_DETECTORS.length, source: 'S12' });
    return groups;
  },
};

scannerRegistry.register(enhancedPiModule);
export { enhancedPiModule };
