/**
 * X-Ray Attack Pattern Knowledge Base (H27.2)
 * 100+ documented attack patterns covering:
 *   - Prompt injection (role hijacking, delimiter escape, instruction override)
 *   - Jailbreak (persona assumption, hypothetical framing, gradual escalation)
 *   - Encoding (base64 wrapping, unicode substitution, mixed encoding)
 *   - Structural (nested context, recursive reference, XML/JSON injection)
 *   - Multimodal (image, audio, steganographic)
 *   - WebMCP (tool result injection, rug-pull, tool shadowing)
 *   - Supply chain, model theft, DoS, bias
 *
 * Each: name, description, bypass mechanism, mitigations, keywords
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttackPattern {
  /** Unique identifier matching pattern_name in findings */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category group */
  category: AttackCategory;
  /** Description of the attack technique */
  description: string;
  /** How/why this bypasses defenses */
  bypassMechanism: string;
  /** What defenses this bypasses */
  bypasses: string[];
  /** Recommended mitigations */
  mitigations: string[];
  /** Keywords for fuzzy matching */
  keywords: string[];
}

export type AttackCategory =
  | 'prompt-injection'
  | 'jailbreak'
  | 'encoding'
  | 'structural'
  | 'multimodal'
  | 'webmcp'
  | 'supply-chain'
  | 'model-theft'
  | 'dos'
  | 'bias'
  | 'output-manipulation'
  | 'session'
  | 'agent';

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export const attackPatterns: AttackPattern[] = [
  // =========================================================================
  // PROMPT INJECTION (20 patterns)
  // =========================================================================
  {
    id: 'role-hijacking',
    name: 'Role Hijacking',
    category: 'prompt-injection',
    description: 'Attempts to override the system role by impersonating system-level instructions.',
    bypassMechanism: 'the attacker inserts text that mimics system prompts, causing the model to treat user input as system instructions',
    bypasses: ['System prompt boundary', 'Role separation', 'Input validation'],
    mitigations: ['Enforce strict system/user message boundaries', 'Use structured message formats', 'Implement input sanitization'],
    keywords: ['system prompt', 'you are now', 'new instructions', 'role', 'override'],
  },
  {
    id: 'delimiter-escape',
    name: 'Delimiter Escape',
    category: 'prompt-injection',
    description: 'Uses special delimiter characters to break out of the intended prompt context.',
    bypassMechanism: 'delimiter characters (```, ---, ###) are used to signal context boundaries, tricking the model into treating subsequent text as a new context',
    bypasses: ['Prompt templating', 'Context separation', 'Delimiter-based boundaries'],
    mitigations: ['Use structured message APIs instead of string concatenation', 'Escape delimiters in user input', 'Use unique/random delimiters'],
    keywords: ['delimiter', 'escape', 'boundary', 'separator', 'break out'],
  },
  {
    id: 'instruction-override',
    name: 'Instruction Override',
    category: 'prompt-injection',
    description: 'Directly instructs the model to ignore previous instructions and follow new ones.',
    bypassMechanism: 'explicit "ignore previous instructions" commands exploit the model\'s tendency to follow the most recent instructions',
    bypasses: ['System prompt adherence', 'Instruction hierarchy', 'Safety guidelines'],
    mitigations: ['Use instruction hierarchy with immutable system prompts', 'Train on refusal of override patterns', 'Implement output monitoring'],
    keywords: ['ignore', 'previous instructions', 'override', 'disregard', 'forget'],
  },
  {
    id: 'context-manipulation',
    name: 'Context Window Manipulation',
    category: 'prompt-injection',
    description: 'Floods the context window with distracting content to push system instructions out of the attention window.',
    bypassMechanism: 'large amounts of irrelevant text push the system prompt beyond the model\'s effective attention span',
    bypasses: ['Context window limits', 'Attention mechanism', 'System prompt positioning'],
    mitigations: ['Place system instructions at the end of context', 'Use periodic instruction reminders', 'Limit user input length'],
    keywords: ['context', 'window', 'flood', 'attention', 'distract'],
  },
  {
    id: 'few-shot-poisoning',
    name: 'Few-Shot Poisoning',
    category: 'prompt-injection',
    description: 'Injects malicious few-shot examples to establish a pattern the model will follow.',
    bypassMechanism: 'the model\'s in-context learning treats injected examples as legitimate demonstrations, learning to produce harmful outputs',
    bypasses: ['In-context learning', 'Example-based training', 'Pattern matching'],
    mitigations: ['Validate few-shot examples', 'Use curated example sets', 'Monitor for injected examples in user input'],
    keywords: ['few-shot', 'example', 'demonstration', 'pattern', 'in-context'],
  },
  {
    id: 'indirect-pi',
    name: 'Indirect Prompt Injection',
    category: 'prompt-injection',
    description: 'Embeds malicious instructions in external content (web pages, documents) that the model retrieves.',
    bypassMechanism: 'the model processes retrieved content as trusted context, executing embedded instructions',
    bypasses: ['Content retrieval trust', 'RAG pipelines', 'Web browsing'],
    mitigations: ['Sanitize retrieved content', 'Mark external content as untrusted', 'Implement content provenance tracking'],
    keywords: ['indirect', 'retrieved', 'external', 'web page', 'document'],
  },
  {
    id: 'multi-turn-escalation',
    name: 'Multi-Turn Escalation',
    category: 'prompt-injection',
    description: 'Gradually escalates across conversation turns, building trust before injecting malicious instructions.',
    bypassMechanism: 'each individual turn appears benign, but the cumulative effect builds a context that enables harmful output',
    bypasses: ['Per-turn safety checks', 'Single-message analysis', 'Trust accumulation'],
    mitigations: ['Analyze conversation trajectory', 'Implement cumulative safety scoring', 'Reset trust on suspicious patterns'],
    keywords: ['multi-turn', 'escalation', 'gradual', 'conversation', 'cumulative'],
  },
  {
    id: 'translation-injection',
    name: 'Translation-Based Injection',
    category: 'prompt-injection',
    description: 'Hides malicious instructions in text that appears to be a translation request.',
    bypassMechanism: 'the "translation" frame causes the model to process the embedded text literally rather than as instructions',
    bypasses: ['Language filters', 'Content classification', 'Keyword detection'],
    mitigations: ['Scan translated content for injections', 'Apply safety filters to translation output', 'Detect instruction patterns across languages'],
    keywords: ['translate', 'translation', 'language', 'multilingual'],
  },
  {
    id: 'markdown-injection',
    name: 'Markdown/Formatting Injection',
    category: 'prompt-injection',
    description: 'Uses markdown or HTML formatting to hide or disguise malicious instructions.',
    bypassMechanism: 'formatting characters can hide text from human review while remaining visible to the model\'s tokenizer',
    bypasses: ['Visual inspection', 'Content review', 'Formatting-unaware filters'],
    mitigations: ['Strip formatting before safety analysis', 'Render and scan both formatted and plain text', 'Block executable markdown constructs'],
    keywords: ['markdown', 'formatting', 'hidden text', 'rendering'],
  },
  {
    id: 'code-injection',
    name: 'Code Block Injection',
    category: 'prompt-injection',
    description: 'Hides instructions inside code blocks or comments that the model processes.',
    bypassMechanism: 'code blocks are processed by the model but may bypass text-focused safety filters',
    bypasses: ['Text-only safety filters', 'Code block exemptions', 'Comment parsing'],
    mitigations: ['Scan code blocks for embedded instructions', 'Apply safety filters uniformly to all content types'],
    keywords: ['code block', 'code comment', 'script', 'embedded code'],
  },
  {
    id: 'prefix-injection',
    name: 'Prefix/Completion Injection',
    category: 'prompt-injection',
    description: 'Starts the model\'s response for it by injecting the beginning of the expected output.',
    bypassMechanism: 'pre-filling the response beginning biases the model to continue in the attacker-chosen direction',
    bypasses: ['Response generation safeguards', 'Output monitoring that checks completed text'],
    mitigations: ['Detect pre-filled responses', 'Validate response beginnings against expected formats'],
    keywords: ['prefix', 'completion', 'pre-fill', 'start with', 'begin with'],
  },
  {
    id: 'payload-splitting',
    name: 'Payload Splitting',
    category: 'prompt-injection',
    description: 'Splits a malicious payload across multiple messages or inputs to avoid detection.',
    bypassMechanism: 'each fragment appears harmless individually, but when combined by the model they form a complete attack',
    bypasses: ['Single-message analysis', 'Per-input scanning', 'Fragment detection'],
    mitigations: ['Cross-message analysis', 'Session-level payload reconstruction', 'Cumulative pattern matching'],
    keywords: ['split', 'fragment', 'partial', 'combine', 'reassemble'],
  },
  {
    id: 'virtualization',
    name: 'Virtualization Attack',
    category: 'prompt-injection',
    description: 'Asks the model to simulate or emulate a system where normal rules don\'t apply.',
    bypassMechanism: 'the model treats the simulated environment as separate from its real safety constraints',
    bypasses: ['Safety constraints in simulated contexts', 'Fictional framing'],
    mitigations: ['Apply safety rules uniformly including simulations', 'Detect simulation/emulation framing'],
    keywords: ['simulate', 'emulate', 'virtual', 'pretend', 'fictional'],
  },
  {
    id: 'obfuscation-pi',
    name: 'Obfuscated Prompt Injection',
    category: 'prompt-injection',
    description: 'Uses character substitution, spacing, or encoding to hide injection patterns from keyword filters.',
    bypassMechanism: 'character-level obfuscation bypasses exact-match and regex-based safety filters while remaining readable to the model',
    bypasses: ['Keyword filters', 'Regex patterns', 'Blocklist matching'],
    mitigations: ['Normalize text before scanning', 'Use semantic analysis instead of keyword matching', 'Apply Unicode normalization (NFKC)'],
    keywords: ['obfuscate', 'substitute', 'spacing', 'character replacement'],
  },
  {
    id: 'recursive-injection',
    name: 'Recursive Prompt Injection',
    category: 'prompt-injection',
    description: 'Embeds instructions that cause the model to re-inject into its own context.',
    bypassMechanism: 'the model\'s output contains injection payloads that are fed back as input in subsequent interactions',
    bypasses: ['Output-to-input sanitization', 'Self-referential safety'],
    mitigations: ['Sanitize model output before re-ingestion', 'Implement loop detection', 'Limit recursive depth'],
    keywords: ['recursive', 'self-referential', 'loop', 're-inject'],
  },
  {
    id: 'cross-plugin-injection',
    name: 'Cross-Plugin Injection',
    category: 'prompt-injection',
    description: 'Uses one plugin/tool to inject instructions that affect another plugin\'s behavior.',
    bypassMechanism: 'plugins share a common context space, allowing output from one to influence instructions to another',
    bypasses: ['Plugin isolation', 'Cross-tool boundaries', 'Shared context safety'],
    mitigations: ['Isolate plugin contexts', 'Sanitize inter-plugin communication', 'Implement capability-based access'],
    keywords: ['cross-plugin', 'cross-tool', 'inter-plugin', 'shared context'],
  },
  {
    id: 'rag-poisoning',
    name: 'RAG Poisoning',
    category: 'prompt-injection',
    description: 'Injects malicious content into the retrieval knowledge base that gets surfaced during RAG.',
    bypassMechanism: 'the retrieval system treats all indexed content as equally trusted, surfacing planted malicious content alongside legitimate results',
    bypasses: ['RAG trust model', 'Document indexing', 'Retrieval ranking'],
    mitigations: ['Scan indexed documents for injection patterns', 'Implement provenance tracking', 'Apply safety filters to retrieved context'],
    keywords: ['rag', 'retrieval', 'knowledge base', 'indexed', 'vector store'],
  },
  {
    id: 'system-message-forgery',
    name: 'System Message Forgery',
    category: 'prompt-injection',
    description: 'Crafts input that mimics the format and style of legitimate system messages.',
    bypassMechanism: 'format-matching fools the model into treating user text as system-level instructions',
    bypasses: ['Format-based role detection', 'Message type inference'],
    mitigations: ['Use API-level role separation', 'Don\'t rely on format for role determination', 'Validate message source cryptographically'],
    keywords: ['system message', 'forgery', 'mimic', 'impersonate', 'format'],
  },
  {
    id: 'task-deflection',
    name: 'Task Deflection',
    category: 'prompt-injection',
    description: 'Redirects the model from its intended task to an attacker-chosen task.',
    bypassMechanism: 'natural language task switching exploits the model\'s instruction-following nature without triggering safety filters',
    bypasses: ['Task-specific guardrails', 'Intent detection', 'Output scope limiting'],
    mitigations: ['Enforce strict output schemas', 'Validate responses against expected task type', 'Implement intent monitoring'],
    keywords: ['deflection', 'redirect', 'instead', 'new task', 'different task'],
  },
  {
    id: 'prompt-leaking',
    name: 'Prompt Leaking',
    category: 'prompt-injection',
    description: 'Tricks the model into revealing its system prompt or instructions.',
    bypassMechanism: 'the model treats requests to repeat/describe its instructions as legitimate queries rather than security violations',
    bypasses: ['System prompt confidentiality', 'Instruction protection'],
    mitigations: ['Train models to refuse prompt disclosure', 'Monitor output for system prompt content', 'Use canary tokens in system prompts'],
    keywords: ['leak', 'reveal', 'repeat', 'show me', 'system prompt'],
  },

  // =========================================================================
  // JAILBREAK (15 patterns)
  // =========================================================================
  {
    id: 'persona-assumption',
    name: 'Persona Assumption (DAN)',
    category: 'jailbreak',
    description: 'Asks the model to adopt an unrestricted alternate persona like "DAN" (Do Anything Now).',
    bypassMechanism: 'the persona framing causes the model to reason about what the persona "would" say, circumventing its own safety training',
    bypasses: ['Safety training', 'Content policy', 'Refusal mechanisms'],
    mitigations: ['Detect persona assumption patterns', 'Maintain safety regardless of persona', 'Monitor for known jailbreak names (DAN, STAN, etc.)'],
    keywords: ['persona', 'DAN', 'character', 'roleplay', 'act as'],
  },
  {
    id: 'hypothetical-framing',
    name: 'Hypothetical Framing',
    category: 'jailbreak',
    description: 'Frames harmful requests as hypothetical, fictional, or educational scenarios.',
    bypassMechanism: 'the hypothetical framing triggers the model\'s helpfulness training to override safety constraints for "educational" purposes',
    bypasses: ['Content policy for hypotheticals', 'Educational exemptions'],
    mitigations: ['Apply safety rules to hypothetical content', 'Detect "what if" framing around harmful topics', 'Use consistent policies regardless of framing'],
    keywords: ['hypothetical', 'fictional', 'what if', 'imagine', 'educational'],
  },
  {
    id: 'gradual-escalation',
    name: 'Gradual Escalation',
    category: 'jailbreak',
    description: 'Starts with benign requests and progressively pushes toward harmful content.',
    bypassMechanism: 'each incremental step is only slightly more harmful than the previous, never triggering sharp safety boundaries',
    bypasses: ['Binary safety thresholds', 'Per-message analysis', 'Static content filters'],
    mitigations: ['Track conversation trajectory', 'Implement sliding-window safety analysis', 'Set cumulative harm thresholds'],
    keywords: ['gradual', 'escalation', 'progressive', 'step by step', 'boundary pushing'],
  },
  {
    id: 'authority-impersonation',
    name: 'Authority Impersonation',
    category: 'jailbreak',
    description: 'Claims to be a developer, researcher, or authority figure to unlock restricted capabilities.',
    bypassMechanism: 'the model\'s training on developer/authority interactions can trigger special-case handling',
    bypasses: ['Authority-based access control', 'Developer mode', 'Privileged contexts'],
    mitigations: ['Never grant elevated access based on conversation claims', 'Use external authentication', 'Apply uniform safety rules'],
    keywords: ['developer', 'admin', 'researcher', 'authority', 'authorized'],
  },
  {
    id: 'emotional-manipulation',
    name: 'Emotional Manipulation',
    category: 'jailbreak',
    description: 'Uses emotional appeals (threats, urgency, sympathy) to bypass safety filters.',
    bypassMechanism: 'emotional framing triggers the model\'s helpfulness/empathy training to override safety constraints',
    bypasses: ['Content policy', 'Refusal mechanisms', 'Harm prevention'],
    mitigations: ['Detect emotional manipulation patterns', 'Maintain consistent safety regardless of emotional framing'],
    keywords: ['emergency', 'urgent', 'dying', 'emotional', 'please help'],
  },
  {
    id: 'token-smuggling',
    name: 'Token Smuggling',
    category: 'jailbreak',
    description: 'Exploits tokenizer behavior to construct harmful tokens from seemingly harmless fragments.',
    bypassMechanism: 'the tokenizer combines separate characters into harmful tokens that bypass character-level filters',
    bypasses: ['Character-level filters', 'Pre-tokenization analysis'],
    mitigations: ['Analyze post-tokenization content', 'Use token-aware safety filters'],
    keywords: ['token', 'tokenizer', 'smuggling', 'fragment', 'combine'],
  },
  {
    id: 'refusal-suppression',
    name: 'Refusal Suppression',
    category: 'jailbreak',
    description: 'Explicitly instructs the model not to refuse or add safety disclaimers.',
    bypassMechanism: 'direct suppression of refusal behavior conflicts with the model\'s instruction-following training',
    bypasses: ['Refusal mechanisms', 'Safety disclaimers', 'Content warnings'],
    mitigations: ['Make refusal behavior non-overridable', 'Detect refusal suppression patterns'],
    keywords: ['refusal', 'do not refuse', 'no disclaimer', 'without warning', 'never say no'],
  },
  {
    id: 'logic-puzzle-jailbreak',
    name: 'Logic Puzzle Jailbreak',
    category: 'jailbreak',
    description: 'Embeds harmful requests within logic puzzles, riddles, or games.',
    bypassMechanism: 'the game/puzzle framing triggers creative/playful processing paths that bypass safety checks',
    bypasses: ['Content analysis in game contexts', 'Playful mode safety'],
    mitigations: ['Apply safety analysis to puzzle/game outputs', 'Detect harmful content regardless of framing'],
    keywords: ['puzzle', 'riddle', 'game', 'challenge', 'word play'],
  },
  {
    id: 'output-format-jailbreak',
    name: 'Output Format Jailbreak',
    category: 'jailbreak',
    description: 'Requests harmful content in specific output formats (base64, hex, pig latin) to bypass filters.',
    bypassMechanism: 'encoding the output bypasses text-based output safety filters while delivering readable harmful content',
    bypasses: ['Output content filters', 'Text-based safety checks'],
    mitigations: ['Decode encoded outputs before safety analysis', 'Apply filters to all output formats'],
    keywords: ['base64 output', 'hex output', 'encode', 'format as', 'pig latin'],
  },
  {
    id: 'world-building',
    name: 'World Building Jailbreak',
    category: 'jailbreak',
    description: 'Creates an elaborate fictional world where harmful actions are normalized.',
    bypassMechanism: 'the detailed fictional setting gradually shifts the model\'s frame of reference for what is acceptable',
    bypasses: ['Fiction/reality boundary', 'Context-dependent safety'],
    mitigations: ['Apply real-world safety policies to fictional content', 'Detect harmful normalization in fictional frames'],
    keywords: ['world', 'story', 'novel', 'fiction', 'narrative'],
  },
  {
    id: 'language-switching',
    name: 'Language Switching Jailbreak',
    category: 'jailbreak',
    description: 'Switches to low-resource languages where safety training is weaker.',
    bypassMechanism: 'safety alignment is weaker in languages with less training data, allowing harmful content through',
    bypasses: ['Multilingual safety alignment', 'Low-resource language filters'],
    mitigations: ['Apply safety filters across all languages', 'Translate to well-supported languages for safety analysis'],
    keywords: ['language', 'translate', 'foreign', 'multilingual'],
  },
  {
    id: 'ascii-art-jailbreak',
    name: 'ASCII Art Jailbreak',
    category: 'jailbreak',
    description: 'Encodes harmful terms in ASCII art that the model can interpret but text filters miss.',
    bypassMechanism: 'visual encoding in ASCII art bypasses text-pattern matching while remaining interpretable by the model',
    bypasses: ['Text pattern matching', 'Keyword filters'],
    mitigations: ['Implement visual/spatial pattern recognition', 'Detect ASCII art encoding attempts'],
    keywords: ['ascii art', 'visual', 'text art', 'character drawing'],
  },
  {
    id: 'crescendo-attack',
    name: 'Crescendo Attack',
    category: 'jailbreak',
    description: 'Multi-turn crescendo that systematically builds toward harmful content through innocent questions.',
    bypassMechanism: 'each question is individually harmless, but the accumulated context creates a knowledge scaffold for harmful output',
    bypasses: ['Single-turn analysis', 'Question-level safety'],
    mitigations: ['Track knowledge accumulation across turns', 'Detect systematic information gathering patterns'],
    keywords: ['crescendo', 'build up', 'series of questions', 'knowledge scaffold'],
  },
  {
    id: 'skeleton-key',
    name: 'Skeleton Key Attack',
    category: 'jailbreak',
    description: 'Provides the model with a "master key" phrase or context that unlocks restricted capabilities.',
    bypassMechanism: 'the "key" concept triggers the model to reason about access control in terms of its own training rather than enforcing it',
    bypasses: ['Prompt-level access control', 'Safety mode switching'],
    mitigations: ['Never implement prompt-based access control', 'Detect "unlock" patterns'],
    keywords: ['skeleton key', 'master key', 'unlock', 'password', 'access code'],
  },
  {
    id: 'multi-modal-jailbreak',
    name: 'Multi-Modal Jailbreak',
    category: 'jailbreak',
    description: 'Uses combinations of text, images, and audio to deliver harmful instructions across modalities.',
    bypassMechanism: 'each modality individually passes safety checks, but their combination conveys a harmful instruction',
    bypasses: ['Per-modality safety filters', 'Unimodal analysis'],
    mitigations: ['Cross-modal safety analysis', 'Combine modality outputs before final safety check'],
    keywords: ['multimodal', 'image and text', 'audio and text', 'cross-modal'],
  },

  // =========================================================================
  // ENCODING (12 patterns)
  // =========================================================================
  {
    id: 'base64-wrapping',
    name: 'Base64 Wrapping',
    category: 'encoding',
    description: 'Encodes malicious instructions in base64 to bypass text-based safety filters.',
    bypassMechanism: 'base64-encoded text appears as random alphanumeric strings to pattern-matching filters',
    bypasses: ['Text pattern matching', 'Keyword detection', 'Regex-based filters'],
    mitigations: ['Detect and decode base64 content before scanning', 'Flag unexpected base64 in user input'],
    keywords: ['base64', 'encode', 'decode', 'btoa', 'atob'],
  },
  {
    id: 'unicode-substitution',
    name: 'Unicode Substitution',
    category: 'encoding',
    description: 'Replaces ASCII characters with visually similar Unicode characters.',
    bypassMechanism: 'homoglyph characters look identical to humans but have different codepoints that bypass string matching',
    bypasses: ['ASCII-based filters', 'Exact string matching', 'Character blocklists'],
    mitigations: ['Apply NFKC normalization', 'Use confusable-character detection', 'Normalize before scanning'],
    keywords: ['unicode', 'homoglyph', 'confusable', 'character substitution', 'lookalike'],
  },
  {
    id: 'mixed-encoding',
    name: 'Mixed Encoding',
    category: 'encoding',
    description: 'Combines multiple encoding schemes (base64 + URL encoding + Unicode) to defeat layered filters.',
    bypassMechanism: 'each encoding layer must be independently decoded; missing any layer leaves the payload obfuscated',
    bypasses: ['Single-layer decoding', 'Format-specific decoders'],
    mitigations: ['Implement recursive multi-layer decoding', 'Apply iterative normalization'],
    keywords: ['mixed encoding', 'multi-layer', 'nested encoding', 'double encoding'],
  },
  {
    id: 'hex-encoding',
    name: 'Hex Encoding',
    category: 'encoding',
    description: 'Encodes text as hexadecimal byte values to bypass content filters.',
    bypassMechanism: 'hex-encoded content appears as numeric sequences that bypass text-pattern safety filters',
    bypasses: ['Text pattern matching', 'Content classification'],
    mitigations: ['Detect and decode hex sequences', 'Flag hex-encoded content in unexpected contexts'],
    keywords: ['hex', 'hexadecimal', '0x', 'byte encoding'],
  },
  {
    id: 'url-encoding',
    name: 'URL Encoding',
    category: 'encoding',
    description: 'Uses percent-encoding to obfuscate harmful text.',
    bypassMechanism: 'percent-encoded characters bypass text filters that don\'t decode URLs',
    bypasses: ['Text-level filters without URL decoding', 'Pattern matching on raw input'],
    mitigations: ['URL-decode all input before scanning', 'Detect unexpected percent-encoding in non-URL contexts'],
    keywords: ['url encoding', 'percent encoding', '%20', 'urlencode'],
  },
  {
    id: 'rot13-cipher',
    name: 'ROT13/Caesar Cipher',
    category: 'encoding',
    description: 'Uses simple substitution ciphers to obfuscate instructions.',
    bypassMechanism: 'the model can decode simple ciphers that keyword filters cannot detect',
    bypasses: ['Keyword detection', 'Pattern matching'],
    mitigations: ['Detect cipher patterns', 'Apply decoding for known simple ciphers'],
    keywords: ['rot13', 'cipher', 'caesar', 'substitution', 'shift'],
  },
  {
    id: 'zero-width-encoding',
    name: 'Zero-Width Character Encoding',
    category: 'encoding',
    description: 'Encodes information using invisible zero-width Unicode characters.',
    bypassMechanism: 'zero-width characters are invisible in rendered text but can encode binary data or control model behavior',
    bypasses: ['Visual inspection', 'Length-based checks', 'Rendered text analysis'],
    mitigations: ['Strip zero-width characters', 'Flag excessive zero-width character presence'],
    keywords: ['zero-width', 'invisible', 'hidden character', 'ZWSP', 'ZWJ'],
  },
  {
    id: 'html-entity-encoding',
    name: 'HTML Entity Encoding',
    category: 'encoding',
    description: 'Uses HTML character entities to encode malicious content.',
    bypassMechanism: 'HTML entities bypass text filters that don\'t decode HTML, but browsers and models can interpret them',
    bypasses: ['Plain-text filters', 'Non-HTML-aware scanners'],
    mitigations: ['Decode HTML entities before scanning', 'Detect HTML entity sequences in plain text contexts'],
    keywords: ['html entity', '&amp;', '&#x', 'character reference'],
  },
  {
    id: 'token-boundary',
    name: 'Token Boundary Exploitation',
    category: 'encoding',
    description: 'Exploits tokenizer behavior by splitting words across token boundaries.',
    bypassMechanism: 'words split across token boundaries may not be recognized by keyword-based filters',
    bypasses: ['Token-unaware keyword matching', 'Pre-tokenization analysis'],
    mitigations: ['Analyze post-tokenization content', 'Use subword-aware pattern matching'],
    keywords: ['token boundary', 'tokenizer', 'subword', 'BPE', 'word piece'],
  },
  {
    id: 'whitespace-obfuscation',
    name: 'Whitespace Obfuscation',
    category: 'encoding',
    description: 'Inserts unusual whitespace characters to break keyword detection.',
    bypassMechanism: 'non-standard whitespace characters (NBSP, em space, etc.) break word boundary detection',
    bypasses: ['Word-boundary matching', 'Space-delimited tokenization'],
    mitigations: ['Normalize all whitespace types', 'Use whitespace-insensitive matching'],
    keywords: ['whitespace', 'space', 'NBSP', 'tab', 'invisible space'],
  },
  {
    id: 'leet-speak',
    name: 'Leet Speak (1337)',
    category: 'encoding',
    description: 'Replaces letters with similar-looking numbers or symbols.',
    bypassMechanism: 'character substitution (e→3, a→4, o→0) bypasses exact string matching',
    bypasses: ['Exact keyword matching', 'Case-insensitive matching'],
    mitigations: ['Implement leet-speak normalization', 'Use fuzzy matching with character substitution tables'],
    keywords: ['leet', '1337', 'h4ck', 'number substitution'],
  },
  {
    id: 'rtl-override',
    name: 'RTL Override',
    category: 'encoding',
    description: 'Uses right-to-left override characters to visually reverse text direction.',
    bypassMechanism: 'RTL override makes text display in reverse, hiding harmful content from visual inspection',
    bypasses: ['Visual inspection', 'Direction-dependent analysis'],
    mitigations: ['Strip directional override characters', 'Analyze text in logical order'],
    keywords: ['RTL', 'right-to-left', 'bidi', 'directional override'],
  },

  // =========================================================================
  // STRUCTURAL (12 patterns)
  // =========================================================================
  {
    id: 'nested-context',
    name: 'Nested Context Injection',
    category: 'structural',
    description: 'Creates nested conversation structures that override the outer context.',
    bypassMechanism: 'nested system/user/assistant turns within user input create fake conversation history that the model follows',
    bypasses: ['Single-level message parsing', 'Flat context analysis'],
    mitigations: ['Detect nested message structures in user input', 'Validate message structure against expected format'],
    keywords: ['nested', 'inner context', 'nested conversation', 'fake history'],
  },
  {
    id: 'recursive-reference',
    name: 'Recursive Reference',
    category: 'structural',
    description: 'Creates self-referential or circular references that cause infinite processing.',
    bypassMechanism: 'recursive structures can exhaust processing resources or create infinite loops in parsers',
    bypasses: ['Recursion depth limits', 'Parser safeguards'],
    mitigations: ['Implement recursion depth limits', 'Detect circular references', 'Set processing timeouts'],
    keywords: ['recursive', 'circular', 'self-reference', 'infinite loop'],
  },
  {
    id: 'xml-injection',
    name: 'XML Injection',
    category: 'structural',
    description: 'Injects XML entities or structures to manipulate XML-based prompt templates.',
    bypassMechanism: 'XML entities (XXE) can read files, make network requests, or inject content into the parsed document',
    bypasses: ['XML parser security', 'Entity expansion limits'],
    mitigations: ['Disable XML entity expansion', 'Use safe XML parsers', 'Validate XML input against strict schemas'],
    keywords: ['XML', 'XXE', 'entity', 'CDATA', 'DTD'],
  },
  {
    id: 'json-injection',
    name: 'JSON Injection',
    category: 'structural',
    description: 'Manipulates JSON-structured prompts by injecting additional fields or overriding values.',
    bypassMechanism: 'JSON parsing may accept duplicate keys, allowing attacker values to override legitimate ones',
    bypasses: ['JSON schema validation', 'Duplicate key handling'],
    mitigations: ['Use strict JSON parsing that rejects duplicates', 'Validate against JSON Schema', 'Use allowlist for expected fields'],
    keywords: ['JSON', 'json injection', 'duplicate key', 'field override'],
  },
  {
    id: 'yaml-injection',
    name: 'YAML Injection',
    category: 'structural',
    description: 'Exploits YAML features (anchors, tags, multi-line) for injection attacks.',
    bypassMechanism: 'YAML\'s rich feature set (tags, anchors, merge keys) enables code execution and reference manipulation',
    bypasses: ['YAML parser security', 'Safe loading'],
    mitigations: ['Use safe YAML loaders', 'Disable YAML tags and anchors', 'Prefer JSON over YAML for untrusted input'],
    keywords: ['YAML', 'yaml injection', 'anchor', 'tag', 'merge key'],
  },
  {
    id: 'template-injection',
    name: 'Template Injection',
    category: 'structural',
    description: 'Injects template syntax (Jinja2, Mustache, etc.) into prompt templates.',
    bypassMechanism: 'template engines execute injected template syntax, enabling code execution or data access',
    bypasses: ['Template engine security', 'Input escaping in templates'],
    mitigations: ['Escape template special characters in user input', 'Use logic-less template engines', 'Sandbox template rendering'],
    keywords: ['template', 'Jinja', 'Mustache', 'handlebars', '{{'],
  },
  {
    id: 'prototype-pollution',
    name: 'Prototype Pollution',
    category: 'structural',
    description: 'Manipulates JavaScript object prototypes through crafted JSON input.',
    bypassMechanism: '__proto__ and constructor.prototype properties can modify object behavior globally',
    bypasses: ['Object property access controls', 'Input validation'],
    mitigations: ['Use Object.create(null) for untrusted data', 'Block __proto__ and constructor in input', 'Use Map instead of plain objects'],
    keywords: ['prototype', '__proto__', 'constructor', 'pollution'],
  },
  {
    id: 'ssrf-vector',
    name: 'SSRF Vector',
    category: 'structural',
    description: 'Tricks the model/system into making requests to internal services.',
    bypassMechanism: 'user-controlled URLs can target internal services (localhost, metadata endpoints) that are not externally accessible',
    bypasses: ['URL validation', 'Network boundaries'],
    mitigations: ['Validate URLs against allowlists', 'Block internal IP ranges', 'Use network-level isolation'],
    keywords: ['SSRF', 'internal', 'localhost', 'metadata', '169.254'],
  },
  {
    id: 'path-traversal',
    name: 'Path Traversal',
    category: 'structural',
    description: 'Uses directory traversal sequences to access files outside intended paths.',
    bypassMechanism: '../ sequences navigate to parent directories, escaping intended file access boundaries',
    bypasses: ['Path-based access control', 'Directory restrictions'],
    mitigations: ['Canonicalize paths and verify prefix', 'Use allowlist for accessible paths', 'Reject paths containing ..'],
    keywords: ['path traversal', '../', 'directory traversal', 'file access'],
  },
  {
    id: 'regex-dos',
    name: 'ReDoS (Regex Denial of Service)',
    category: 'structural',
    description: 'Crafts input that causes catastrophic backtracking in regex-based filters.',
    bypassMechanism: 'specially crafted strings cause exponential processing time in vulnerable regex patterns',
    bypasses: ['Regex-based safety filters', 'Pattern matching timeouts'],
    mitigations: ['Use RE2 or other non-backtracking regex engines', 'Set regex execution timeouts', 'Limit input length for regex processing'],
    keywords: ['ReDoS', 'regex', 'backtracking', 'catastrophic', 'exponential'],
  },
  {
    id: 'sql-injection',
    name: 'SQL Injection via Prompt',
    category: 'structural',
    description: 'Injects SQL syntax into prompts that feed into database queries.',
    bypassMechanism: 'if model output is used to construct SQL queries, injected SQL syntax can modify query behavior',
    bypasses: ['Query parameterization', 'Output sanitization'],
    mitigations: ['Never use model output directly in SQL queries', 'Use parameterized queries', 'Validate model output against expected formats'],
    keywords: ['SQL', 'injection', 'query', 'SELECT', 'DROP TABLE'],
  },
  {
    id: 'command-injection',
    name: 'Command Injection via Prompt',
    category: 'structural',
    description: 'Injects shell commands through model output that feeds into system execution.',
    bypassMechanism: 'if model output is passed to shell execution, embedded commands execute with the process\'s privileges',
    bypasses: ['Input sanitization', 'Shell escaping'],
    mitigations: ['Never pass model output to shell execution', 'Use structured APIs instead of shell commands', 'Implement strict output validation'],
    keywords: ['command injection', 'shell', 'exec', 'subprocess', 'system()'],
  },

  // =========================================================================
  // MULTIMODAL (10 patterns)
  // =========================================================================
  {
    id: 'steganographic-embedding',
    name: 'Steganographic Text Embedding',
    category: 'multimodal',
    description: 'Hides malicious instructions in image metadata or pixel data.',
    bypassMechanism: 'instructions hidden in image metadata (EXIF, XMP, comments) are processed by OCR or metadata parsers but invisible to human reviewers',
    bypasses: ['Visual inspection', 'Text-only safety filters', 'Image content analysis'],
    mitigations: ['Scan image metadata for text content', 'Strip metadata before processing', 'Validate metadata against allowlists'],
    keywords: ['steganography', 'hidden text', 'metadata', 'EXIF', 'embedded'],
  },
  {
    id: 'ocr-text-injection',
    name: 'OCR Text Injection',
    category: 'multimodal',
    description: 'Embeds text in images that OCR will extract and inject into the processing pipeline.',
    bypassMechanism: 'text in images bypasses text-input safety filters because it enters through the image processing path',
    bypasses: ['Text input filters', 'Image-text boundary', 'Modality-specific safety'],
    mitigations: ['Scan OCR-extracted text with full prompt injection detection', 'Apply modality attribution to findings'],
    keywords: ['OCR', 'text in image', 'optical character recognition', 'image text'],
  },
  {
    id: 'svg-active-content',
    name: 'SVG Active Content',
    category: 'multimodal',
    description: 'Embeds executable content (scripts, event handlers) in SVG image files.',
    bypassMechanism: 'SVG is both an image format and an XML document that can contain JavaScript, enabling code execution in contexts that render SVGs',
    bypasses: ['Image format trust', 'Format-based access control'],
    mitigations: ['Strip all active content from SVGs', 'Convert SVGs to raster before display', 'Use Content-Security-Policy'],
    keywords: ['SVG', 'script', 'foreignObject', 'event handler', 'XSS'],
  },
  {
    id: 'polyglot-file',
    name: 'Polyglot File',
    category: 'multimodal',
    description: 'Files that are valid in multiple formats simultaneously (e.g., JPEG + HTML).',
    bypassMechanism: 'polyglot files pass format validation for one type while being interpretable as another, enabling format confusion attacks',
    bypasses: ['Single-format validation', 'Extension-based type detection'],
    mitigations: ['Validate magic bytes AND extension AND MIME type', 'Reject files where formats disagree'],
    keywords: ['polyglot', 'dual format', 'magic bytes', 'format mismatch'],
  },
  {
    id: 'metadata-injection',
    name: 'Metadata Injection',
    category: 'multimodal',
    description: 'Injects malicious content into file metadata fields (EXIF, ID3, document properties).',
    bypassMechanism: 'metadata fields are often trusted and passed through without sanitization',
    bypasses: ['Metadata trust', 'Field-level validation'],
    mitigations: ['Scan all metadata fields', 'Use strict field allowlists', 'Strip untrusted metadata'],
    keywords: ['metadata', 'EXIF', 'ID3', 'properties', 'tags'],
  },
  {
    id: 'audio-metadata',
    name: 'Audio Metadata Attack',
    category: 'multimodal',
    description: 'Hides instructions in audio file metadata (ID3 tags, WAV comments, FLAC tags).',
    bypassMechanism: 'audio metadata fields are processed as text but bypass audio-specific safety measures',
    bypasses: ['Audio content analysis', 'Metadata trust'],
    mitigations: ['Scan audio metadata with text-based prompt injection detection', 'Use strict metadata field allowlists'],
    keywords: ['ID3', 'WAV comment', 'FLAC tag', 'audio metadata'],
  },
  {
    id: 'speech-injection',
    name: 'Speech-Based Injection',
    category: 'multimodal',
    description: 'Uses spoken language to deliver prompt injection through audio transcription.',
    bypassMechanism: 'transcribed speech enters the text pipeline through the audio modality, bypassing text-input safety filters',
    bypasses: ['Text input filters', 'Modality separation', 'Audio content analysis'],
    mitigations: ['Apply full prompt injection scanning to transcribed text', 'Implement modality-aware safety'],
    keywords: ['speech', 'transcription', 'spoken', 'whisper', 'audio'],
  },
  {
    id: 'multimodal-injection',
    name: 'Cross-Modal Injection',
    category: 'multimodal',
    description: 'Splits attack payload across multiple modalities (text + image + audio).',
    bypassMechanism: 'the attack payload is harmless in any single modality but harmful when the model combines inputs',
    bypasses: ['Per-modality safety', 'Independent modality analysis'],
    mitigations: ['Cross-modal safety analysis', 'Analyze combined modality output'],
    keywords: ['cross-modal', 'multimodal', 'combined modality'],
  },
  {
    id: 'format-mismatch',
    name: 'Format Mismatch Attack',
    category: 'multimodal',
    description: 'Provides files whose extension, MIME type, and magic bytes disagree.',
    bypassMechanism: 'different components may use different format detection methods, causing the file to be handled inconsistently',
    bypasses: ['Single-source format detection', 'Extension-only validation'],
    mitigations: ['Validate all three (extension, MIME, magic bytes) and reject mismatches'],
    keywords: ['format mismatch', 'extension', 'MIME', 'magic bytes'],
  },
  {
    id: 'adversarial-perturbation',
    name: 'Adversarial Perturbation',
    category: 'multimodal',
    description: 'Applies imperceptible modifications to images/audio that change model interpretation.',
    bypassMechanism: 'small perturbations in pixel/audio values cause the model to misclassify or hallucinate content',
    bypasses: ['Content analysis', 'Classification models'],
    mitigations: ['Use adversarial training', 'Implement input preprocessing (smoothing, compression)'],
    keywords: ['adversarial', 'perturbation', 'noise', 'pixel manipulation'],
  },

  // =========================================================================
  // WEBMCP (8 patterns)
  // =========================================================================
  {
    id: 'tool-result-injection',
    name: 'Tool Result Injection',
    category: 'webmcp',
    description: 'Injects hidden text or instructions in tool/function call results.',
    bypassMechanism: 'hidden content (CSS display:none, zero-width chars) in tool results is processed by the model but invisible to users',
    bypasses: ['User content review', 'Visual inspection of tool results'],
    mitigations: ['Strip hidden content from tool results', 'Scan tool results for injection patterns'],
    keywords: ['tool result', 'hidden text', 'display:none', 'zero-width'],
  },
  {
    id: 'rug-pull',
    name: 'Rug-Pull Attack',
    category: 'webmcp',
    description: 'MCP server behaves safely during initial negotiation but becomes malicious after trust is established.',
    bypassMechanism: 'initial safety evaluation passes because the server genuinely behaves safely at first, changing behavior only after trust is established',
    bypasses: ['One-time security evaluation', 'Initial trust assessment'],
    mitigations: ['Continuous capability monitoring', 'Detect behavioral changes over time', 'Re-evaluate server trust periodically'],
    keywords: ['rug pull', 'trust escalation', 'behavioral change', 'delayed malicious'],
  },
  {
    id: 'tool-shadowing',
    name: 'Tool Shadowing',
    category: 'webmcp',
    description: 'Registers a tool with the same name as an existing tool to intercept calls.',
    bypassMechanism: 'duplicate tool names cause the model to route calls to the malicious tool instead of the legitimate one',
    bypasses: ['Tool name uniqueness', 'Tool routing'],
    mitigations: ['Enforce unique tool names', 'Verify tool identity/provenance', 'Warn on name collisions'],
    keywords: ['tool shadowing', 'duplicate tool', 'name collision', 'intercept'],
  },
  {
    id: 'sse-injection',
    name: 'SSE/WebSocket Injection',
    category: 'webmcp',
    description: 'Injects malicious content through Server-Sent Events or WebSocket frames.',
    bypassMechanism: 'transport-level injection can insert instructions into the communication stream between MCP client and server',
    bypasses: ['Transport security', 'Stream parsing'],
    mitigations: ['Validate SSE/WebSocket message format', 'Implement frame-level integrity checks'],
    keywords: ['SSE', 'WebSocket', 'transport', 'stream injection'],
  },
  {
    id: 'capability-downgrade',
    name: 'Capability Downgrade',
    category: 'webmcp',
    description: 'Instructs removal of security headers or permission downgrades.',
    bypassMechanism: 'removing security controls (CSP, X-Frame-Options) enables previously blocked attack vectors',
    bypasses: ['Security header enforcement', 'Permission levels'],
    mitigations: ['Make security controls immutable', 'Log all security configuration changes', 'Alert on downgrade attempts'],
    keywords: ['downgrade', 'remove security', 'disable protection', 'strip header'],
  },
  {
    id: 'trust-escalation',
    name: 'Trust Escalation',
    category: 'webmcp',
    description: 'Gradually escalates privileges through a sequence of seemingly reasonable capability requests.',
    bypassMechanism: 'each individual privilege request appears reasonable, but cumulative access exceeds intended authorization',
    bypasses: ['Per-request authorization', 'Incremental trust'],
    mitigations: ['Track cumulative privilege grants', 'Implement principle of least privilege', 'Review combined capabilities'],
    keywords: ['trust escalation', 'privilege', 'escalation', 'capability'],
  },
  {
    id: 'hidden-content',
    name: 'Hidden Content Injection',
    category: 'webmcp',
    description: 'Uses CSS, HTML, or Unicode techniques to hide content from human review.',
    bypassMechanism: 'hidden content is invisible when rendered but processed by the model, enabling covert instruction delivery',
    bypasses: ['Visual content review', 'Rendered output inspection'],
    mitigations: ['Strip hidden content patterns', 'Scan raw text for visibility manipulation'],
    keywords: ['hidden', 'invisible', 'display:none', 'opacity:0', 'font-size:0'],
  },
  {
    id: 'name-collision',
    name: 'Name Collision Attack',
    category: 'webmcp',
    description: 'Creates tools/functions with names designed to collide with system functions.',
    bypassMechanism: 'name collisions can cause the system to invoke the attacker\'s function instead of the system function',
    bypasses: ['Namespace isolation', 'Function resolution'],
    mitigations: ['Use namespaced function names', 'Enforce namespace ownership', 'Detect collision attempts'],
    keywords: ['name collision', 'namespace', 'function name', 'override'],
  },

  // =========================================================================
  // SUPPLY CHAIN (5 patterns)
  // =========================================================================
  {
    id: 'supply-chain-attack',
    name: 'Supply Chain Attack',
    category: 'supply-chain',
    description: 'Compromises upstream dependencies, packages, or data sources to inject malicious content.',
    bypassMechanism: 'trusted supply chain components are not re-validated, allowing compromised updates to bypass security',
    bypasses: ['Dependency trust', 'Package integrity verification'],
    mitigations: ['Pin dependency versions', 'Verify package signatures', 'Use lockfiles', 'Audit dependencies regularly'],
    keywords: ['supply chain', 'dependency', 'package', 'upstream', 'compromise'],
  },
  {
    id: 'dependency-confusion',
    name: 'Dependency Confusion',
    category: 'supply-chain',
    description: 'Publishes malicious packages with the same name as internal packages to public registries.',
    bypassMechanism: 'package managers may prefer public packages over private ones with the same name, installing the attacker\'s version',
    bypasses: ['Package resolution', 'Registry priority'],
    mitigations: ['Use scoped package names', 'Configure registry priority', 'Pin exact versions'],
    keywords: ['dependency confusion', 'package name', 'registry', 'typosquat'],
  },
  {
    id: 'model-poisoning',
    name: 'Model Training Data Poisoning',
    category: 'supply-chain',
    description: 'Injects malicious examples into training data to influence model behavior.',
    bypassMechanism: 'poisoned training data teaches the model to produce harmful outputs under specific trigger conditions',
    bypasses: ['Training data validation', 'Data provenance'],
    mitigations: ['Validate training data sources', 'Implement data provenance tracking', 'Use poisoning detection techniques'],
    keywords: ['data poisoning', 'training data', 'backdoor', 'trigger'],
  },
  {
    id: 'plugin-supply-chain',
    name: 'Plugin/Extension Supply Chain',
    category: 'supply-chain',
    description: 'Compromises plugins or extensions in the model\'s tool ecosystem.',
    bypassMechanism: 'trusted plugins are not continuously monitored, allowing compromised updates to execute malicious code',
    bypasses: ['Plugin trust model', 'Update verification'],
    mitigations: ['Review plugin updates', 'Implement plugin sandboxing', 'Monitor plugin behavior'],
    keywords: ['plugin', 'extension', 'marketplace', 'update'],
  },
  {
    id: 'fine-tuning-attack',
    name: 'Fine-Tuning Attack',
    category: 'supply-chain',
    description: 'Corrupts model safety alignment through malicious fine-tuning data.',
    bypassMechanism: 'fine-tuning can override safety training by providing examples that reinforce harmful behavior',
    bypasses: ['Safety alignment', 'RLHF training'],
    mitigations: ['Monitor fine-tuning data for safety degradation', 'Implement safety regression tests', 'Use guardrails post-fine-tuning'],
    keywords: ['fine-tuning', 'alignment', 'safety regression', 'RLHF'],
  },

  // =========================================================================
  // MODEL THEFT (3 patterns)
  // =========================================================================
  {
    id: 'model-extraction',
    name: 'Model Extraction',
    category: 'model-theft',
    description: 'Systematically queries the model to reconstruct its weights or architecture.',
    bypassMechanism: 'high-volume, structured queries can reveal enough about model behavior to train a close approximation',
    bypasses: ['Rate limiting', 'Query monitoring'],
    mitigations: ['Implement rate limiting', 'Detect systematic querying patterns', 'Add output perturbation'],
    keywords: ['extraction', 'model theft', 'distillation', 'replication'],
  },
  {
    id: 'weight-exfiltration',
    name: 'Weight Exfiltration',
    category: 'model-theft',
    description: 'Attempts to directly access or download model weights.',
    bypassMechanism: 'exploiting access controls or deployment configurations to access raw model files',
    bypasses: ['File access controls', 'Deployment security'],
    mitigations: ['Restrict model file access', 'Encrypt model weights at rest', 'Monitor file access patterns'],
    keywords: ['weight', 'exfiltrate', 'download', 'model files'],
  },
  {
    id: 'api-key-theft',
    name: 'API Key Theft',
    category: 'model-theft',
    description: 'Attempts to extract or reuse API keys for unauthorized model access.',
    bypassMechanism: 'exposed API keys in logs, client-side code, or environment variables enable unauthorized access',
    bypasses: ['API key management', 'Client-side security'],
    mitigations: ['Never expose keys client-side', 'Rotate keys regularly', 'Implement key scoping and monitoring'],
    keywords: ['API key', 'credential', 'token theft', 'unauthorized access'],
  },

  // =========================================================================
  // DoS (5 patterns)
  // =========================================================================
  {
    id: 'resource-exhaustion',
    name: 'Resource Exhaustion',
    category: 'dos',
    description: 'Crafts inputs that consume excessive computational resources.',
    bypassMechanism: 'inputs designed to maximize processing time/memory exhaust server resources, denying service to other users',
    bypasses: ['Resource limits', 'Processing timeouts'],
    mitigations: ['Set strict resource limits', 'Implement processing timeouts', 'Use input size limits'],
    keywords: ['resource exhaustion', 'CPU', 'memory', 'timeout', 'hang'],
  },
  {
    id: 'token-flood',
    name: 'Token Flood',
    category: 'dos',
    description: 'Sends inputs designed to generate extremely long outputs.',
    bypassMechanism: 'inputs that trigger long-form generation consume output tokens and processing time',
    bypasses: ['Output length limits', 'Token budgets'],
    mitigations: ['Set max output token limits', 'Monitor output length', 'Implement billing controls'],
    keywords: ['token flood', 'long output', 'max tokens', 'generation length'],
  },
  {
    id: 'context-overflow',
    name: 'Context Window Overflow',
    category: 'dos',
    description: 'Sends inputs that exceed the model\'s context window, causing errors or degraded performance.',
    bypassMechanism: 'context overflow can cause truncation of safety instructions or out-of-memory errors',
    bypasses: ['Context length validation', 'Truncation handling'],
    mitigations: ['Validate input length before processing', 'Handle truncation gracefully', 'Ensure safety instructions survive truncation'],
    keywords: ['context overflow', 'token limit', 'truncation', 'context length'],
  },
  {
    id: 'concurrent-abuse',
    name: 'Concurrent Request Abuse',
    category: 'dos',
    description: 'Sends many concurrent requests to exhaust server resources.',
    bypassMechanism: 'high concurrency can exhaust connection pools, memory, and CPU resources',
    bypasses: ['Rate limiting', 'Connection pool limits'],
    mitigations: ['Implement per-user rate limiting', 'Use connection pool limits', 'Deploy auto-scaling'],
    keywords: ['concurrent', 'parallel', 'rate limit', 'flood'],
  },
  {
    id: 'recursive-expansion',
    name: 'Recursive Expansion',
    category: 'dos',
    description: 'Uses recursive structures (XML entities, nested JSON) to cause exponential expansion.',
    bypassMechanism: 'recursive entity expansion (billion laughs) can expand small inputs to gigabytes of data',
    bypasses: ['Entity expansion limits', 'Parser depth limits'],
    mitigations: ['Limit entity expansion', 'Set parser depth limits', 'Reject deeply nested structures'],
    keywords: ['recursive', 'expansion', 'billion laughs', 'entity bomb'],
  },

  // =========================================================================
  // BIAS (3 patterns)
  // =========================================================================
  {
    id: 'bias-amplification',
    name: 'Bias Amplification',
    category: 'bias',
    description: 'Crafts inputs that amplify existing biases in model outputs.',
    bypassMechanism: 'leading questions and stereotypical framing trigger learned biases in the model',
    bypasses: ['Bias detection', 'Fairness constraints'],
    mitigations: ['Implement bias detection in outputs', 'Use debiasing techniques', 'Test with diverse inputs'],
    keywords: ['bias', 'stereotype', 'discrimination', 'fairness'],
  },
  {
    id: 'confidence-manipulation',
    name: 'Confidence Manipulation',
    category: 'bias',
    description: 'Manipulates the model into expressing unwarranted confidence or authority.',
    bypassMechanism: 'certain framing causes the model to present uncertain information as authoritative facts',
    bypasses: ['Confidence calibration', 'Uncertainty expression'],
    mitigations: ['Implement confidence calibration', 'Require uncertainty markers', 'Validate factual claims'],
    keywords: ['confidence', 'authority', 'certain', 'definitive', 'guarantee'],
  },
  {
    id: 'citation-fabrication',
    name: 'Citation Fabrication',
    category: 'bias',
    description: 'Prompts the model to generate fabricated citations or references.',
    bypassMechanism: 'the model\'s pattern matching generates plausible-looking but non-existent citations',
    bypasses: ['Citation verification', 'Source validation'],
    mitigations: ['Require verifiable citations', 'Implement citation checking', 'Add disclaimers about potential hallucination'],
    keywords: ['citation', 'reference', 'hallucination', 'fabricated source'],
  },

  // =========================================================================
  // OUTPUT MANIPULATION (3 patterns)
  // =========================================================================
  {
    id: 'output-manipulation',
    name: 'Output Manipulation',
    category: 'output-manipulation',
    description: 'Tricks the model into producing specific targeted outputs.',
    bypassMechanism: 'carefully crafted prompts can steer model output toward attacker-desired content',
    bypasses: ['Output safety filters', 'Content policy enforcement'],
    mitigations: ['Monitor output for manipulation patterns', 'Implement output classifiers'],
    keywords: ['output', 'manipulation', 'targeted output', 'steer'],
  },
  {
    id: 'information-disclosure',
    name: 'Information Disclosure',
    category: 'output-manipulation',
    description: 'Tricks the model into revealing sensitive information from its context or training data.',
    bypassMechanism: 'certain prompts cause the model to output memorized training data or context window contents',
    bypasses: ['Data privacy protections', 'Context isolation'],
    mitigations: ['Implement output scanning for sensitive data', 'Use differential privacy techniques'],
    keywords: ['information disclosure', 'data leak', 'sensitive data', 'memorization'],
  },
  {
    id: 'social-engineering-output',
    name: 'Social Engineering Output',
    category: 'output-manipulation',
    description: 'Manipulates the model into generating convincing phishing or social engineering content.',
    bypassMechanism: 'the model\'s language capabilities are co-opted to produce convincing deceptive content',
    bypasses: ['Content policy for deceptive text', 'Phishing detection'],
    mitigations: ['Detect phishing/SE patterns in output', 'Apply content classification to generated text'],
    keywords: ['social engineering', 'phishing', 'deceptive', 'impersonation'],
  },

  // =========================================================================
  // SESSION (3 patterns)
  // =========================================================================
  {
    id: 'session-hijacking',
    name: 'Session Hijacking',
    category: 'session',
    description: 'Manipulates session context to inherit or influence another user\'s conversation.',
    bypassMechanism: 'session state manipulation can cause cross-user context leakage or privilege escalation',
    bypasses: ['Session isolation', 'Context boundaries'],
    mitigations: ['Implement strong session isolation', 'Validate session ownership', 'Clear context on session switch'],
    keywords: ['session', 'hijacking', 'cross-user', 'context leakage'],
  },
  {
    id: 'context-persistence',
    name: 'Context Persistence Attack',
    category: 'session',
    description: 'Injects instructions that persist across conversation resets or new sessions.',
    bypassMechanism: 'cached context or persistent memory retains injected instructions beyond the intended scope',
    bypasses: ['Session reset', 'Context clearing', 'Memory management'],
    mitigations: ['Clear all context on reset', 'Validate persistent memory contents', 'Implement context expiry'],
    keywords: ['persistence', 'memory', 'carry over', 'across sessions'],
  },
  {
    id: 'session-manipulation',
    name: 'Session State Manipulation',
    category: 'session',
    description: 'Modifies session state variables to bypass security controls or escalate privileges.',
    bypassMechanism: 'client-controllable session state (cookies, localStorage) can be modified to change authorization levels',
    bypasses: ['Client-side session management', 'State-based access control'],
    mitigations: ['Use server-side session management', 'Sign session tokens', 'Validate state integrity'],
    keywords: ['session state', 'cookie', 'localStorage', 'state manipulation'],
  },

  // =========================================================================
  // AGENT (5 patterns)
  // =========================================================================
  {
    id: 'tool-abuse',
    name: 'Tool/Function Abuse',
    category: 'agent',
    description: 'Manipulates the model into calling tools with malicious parameters.',
    bypassMechanism: 'the model\'s tool-calling capability is co-opted to execute attacker-desired operations',
    bypasses: ['Tool parameter validation', 'Intent verification'],
    mitigations: ['Validate tool parameters', 'Implement tool call approval', 'Use parameter schemas'],
    keywords: ['tool abuse', 'function call', 'malicious parameters'],
  },
  {
    id: 'chain-of-thought-hijack',
    name: 'Chain-of-Thought Hijacking',
    category: 'agent',
    description: 'Manipulates the model\'s reasoning chain to reach attacker-desired conclusions.',
    bypassMechanism: 'injected reasoning steps guide the model\'s chain-of-thought toward harmful conclusions',
    bypasses: ['Reasoning integrity', 'CoT safety'],
    mitigations: ['Monitor reasoning chains for manipulation', 'Implement reasoning validation'],
    keywords: ['chain of thought', 'reasoning', 'step by step', 'CoT'],
  },
  {
    id: 'agent-loop',
    name: 'Agent Loop Attack',
    category: 'agent',
    description: 'Causes the model agent to enter infinite tool-calling loops, wasting resources.',
    bypassMechanism: 'circular tool call dependencies or always-failing conditions keep the agent retrying indefinitely',
    bypasses: ['Loop detection', 'Call depth limits'],
    mitigations: ['Implement maximum tool call limits', 'Detect circular dependencies', 'Set execution timeouts'],
    keywords: ['agent loop', 'infinite loop', 'tool loop', 'circular'],
  },
  {
    id: 'permission-escalation',
    name: 'Permission Escalation',
    category: 'agent',
    description: 'Gradually escalates the agent\'s permissions through a sequence of tool calls.',
    bypassMechanism: 'each permission grant is small and reasonable, but cumulative access exceeds intended authorization',
    bypasses: ['Incremental permission grants', 'Cumulative access control'],
    mitigations: ['Track cumulative permissions', 'Implement permission budgets', 'Require re-authorization for sensitive operations'],
    keywords: ['permission', 'escalation', 'privilege', 'access control'],
  },
  {
    id: 'sandbox-escape',
    name: 'Sandbox Escape',
    category: 'agent',
    description: 'Attempts to break out of the agent\'s execution sandbox.',
    bypassMechanism: 'exploiting sandbox implementation flaws or language features to access resources outside the sandbox',
    bypasses: ['Sandbox isolation', 'Resource access controls'],
    mitigations: ['Use robust sandboxing (gVisor, V8 isolates)', 'Minimize sandbox surface area', 'Monitor for escape attempts'],
    keywords: ['sandbox', 'escape', 'breakout', 'isolation'],
  },
];

// ---------------------------------------------------------------------------
// Lookup utilities
// ---------------------------------------------------------------------------

/** Get all unique categories in the knowledge base */
export function getCategories(): AttackCategory[] {
  return [...new Set(attackPatterns.map(p => p.category))];
}

/** Count patterns per category */
export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of attackPatterns) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  return counts;
}

/** Total pattern count */
export function getTotalPatternCount(): number {
  return attackPatterns.length;
}
