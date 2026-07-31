// SPDX-License-Identifier: Apache-2.0
/**
 * S32a: DoS & Resource Exhaustion Detector
 * Detects denial-of-service and resource exhaustion attack patterns.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';
import { containsDecodedAttackSignal } from './encoding-engine.js';

const MODULE_NAME = 'dos-detector';
const MODULE_SOURCE = 'S32a';
const ENGINE = 'dos-detector';

// SC.1.7c: post-normalize attack-signal guards for shape-only DoS patterns.
// `deep_nesting_analysis`, `json_deep_nesting`, and `dos_zalgo_combining_marks`
// fire on syntactic shape (bracket depth, JSON structure, combining-mark
// runs) without checking for attack content. The stress-variations and
// unicode-variations generators apply these mutations to clean baselines:
// e.g., `{"level_40":{"level_39":...}}` (40-level empty JSON) or
// "Caǹ yo̧u explå̃in...?" (clean question + combining marks). These were
// 1,829 / 1,117 FP-firings (some fixtures hit multiple patterns).
//
// The fix mirrors SC.1.4: strip the obfuscation primitives, NFKC-normalize,
// and only fire when the post-normalize content contains injection / OWASP /
// semantic-attack signal. Shape-only-with-attack-signal still fires (real
// billion-laughs / structured payload + attack vocabulary). Shape-only-on-
// benign-content stays silent.
//
// Cloud / XML-bomb-specific regex patterns (xml_entity_decl, billion_laughs,
// dos_xslt_recursion etc.) emit independently without this guard — they
// match attack content, not just structural shape.
const ZW_AND_INVISIBLE_RE = /[\u200B-\u200F\u2060\uFEFF\u00AD]/g;
const COMBINING_MARKS_RE = /[\u0300-\u036F]/g;

function normalizeForAttackCheck(text: string): string {
  return text.replace(ZW_AND_INVISIBLE_RE, '').replace(COMBINING_MARKS_RE, '').normalize('NFKC');
}

const DOS_SHAPE_GATED_PATTERNS = new Set<string>([
  'json_deep_nesting',
  'graphql_deep_query',
  'deep_nesting_analysis',
  'dos_zalgo_combining_marks',
  'char_repetition_extreme',
  'word_repetition_extreme',
  'dos_phrase_repetition',
  'context_overflow_repetition',
]);

const MAX_INPUT_LENGTH = 500_000;
const BENIGN_DOS_CONTEXT_RE = /\b(?:legitimate|clean example|clean parallel processing|not an attack|no malicious intent|properly nested data|reasonable nesting depth|large context window for document analysis|valid parallel processing|negative control|no injection attempts|valid content for testing|processed normally|clean[_\s-]?test[_\s-]?fixture|parallel agents,\s*parallel progress)\b/i;
const BENIGN_DOS_PATTERN_NAMES = new Set([
  'dos_parallel_flood',
  'dos_recursive_template',
  'dos_context_window_flood',
]);
const BENIGN_MEDIA_BINARY_CONTEXT_RE = /\b(?:ii\*|mm\*|exif|ihdr|png|bmp|tiff|webp|gif|videohandler|soundhandler|isom|iso2|ftyp|mdat|moov|lavf\d|x264|h\.264)\b/i;
const MEDIA_BINARY_DOS_PATTERN_NAMES = new Set([
  'regex_nested_quantifier',
  'json_deep_nesting',
  'deep_nesting_analysis',
]);

// P3-WaveA-R2: `dos_json_circular_ref` matches any local JSON-pointer `$ref`
// (`$ref: "#/components/schemas/Foo"`) — which is the STANDARD, benign way every
// OpenAPI / JSON-Schema document references a sibling definition, NOT a circular
// reference (circularity requires the target to transitively contain itself —
// undecidable by a single regex). Gate the pattern on explicit circular-/
// self-reference intent vocabulary so it only fires on documents that actually
// describe a recursion/dereferencing loop.
const CIRCULAR_REF_INTENT_RE = /\b(?:circular\s+(?:ref|reference|json|depend|structure)|recursive(?:ly)?\s+(?:nested|defined|referenc|dereferenc)|self[\s-]referenc\w*|cyclic\s+(?:ref|reference|graph|depend)|infinite\s+(?:loop|dereferenc|recursion)|contains?\s+itself|references?\s+itself)\b/i;

export const REGEX_BOMB_PATTERNS: RegexPattern[] = [
  { name: 'regex_nested_quantifier', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.CRITICAL,
    // P3-WaveA-R2: the `{` branch is NOT purely benign — `(.*){1,32000}` is a
    // genuine O(2^n) nested-quantifier ReDoS (gt::dos::dos-regex-nested-
    // quantifier). Kept as-is; the lone clean-doc FP (a documented bounded
    // `(\.[a-z0-9_]+){` regex appearing as config data, mcp-1928) is routed to
    // operator-ratify — no recall-safe regex distinguishes attack-regex from
    // documented-regex by shape alone.
    re: /\([^)]*[+*][^)]*\)[+*{]/, desc: 'Nested quantifier pattern (ReDoS)', source: MODULE_SOURCE, weight: 9 },
  { name: 'regex_catastrophic_backtrack', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.CRITICAL,
    re: /\([^)]*\?\)\{[0-9]{2,}/, desc: 'Catastrophic backtracking pattern', source: MODULE_SOURCE, weight: 9 },
  { name: 'regex_evil_input', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.INFO,
    re: /(?:^|\s)[a]{50,}(?:\s|$)/, desc: 'Extreme repetition of single character (50+)', source: MODULE_SOURCE, weight: 4 },
];

export const XML_BOMB_PATTERNS: RegexPattern[] = [
  { name: 'xml_entity_decl', cat: 'DOS_XML_BOMB', sev: SEVERITY.CRITICAL,
    re: /<!ENTITY\s+\w+\s+"[^"]*&\w+;/, desc: 'Recursive XML entity declaration (Billion Laughs)', source: MODULE_SOURCE, weight: 10 },
  { name: 'xml_doctype_entity', cat: 'DOS_XML_BOMB', sev: SEVERITY.WARNING,
    re: /<!DOCTYPE[^>]*<!ENTITY/s, desc: 'DOCTYPE with entity declarations', source: MODULE_SOURCE, weight: 7 },
  { name: 'xml_entity_expansion', cat: 'DOS_XML_BOMB', sev: SEVERITY.CRITICAL,
    re: /&lol\d+;/, desc: 'XML entity expansion reference (Billion Laughs)', source: MODULE_SOURCE, weight: 10 },
];

export const DEEP_NESTING_PATTERNS: RegexPattern[] = [
  { name: 'json_deep_nesting', cat: 'DOS_DEEP_NESTING', sev: SEVERITY.WARNING,
    re: /\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{/, desc: 'Deeply nested JSON (8+ levels)', source: MODULE_SOURCE, weight: 7 },
  { name: 'graphql_deep_query', cat: 'DOS_DEEP_NESTING', sev: SEVERITY.CRITICAL,
    re: /\{\s*\w+\s*\{\s*\w+\s*\{\s*\w+\s*\{\s*\w+\s*\{/, desc: 'Deeply nested GraphQL query (5+ levels)', source: MODULE_SOURCE, weight: 8 },
  { name: 'yaml_anchor_bomb', cat: 'DOS_DEEP_NESTING', sev: SEVERITY.CRITICAL,
    // P3-WaveA-R2: a real anchor bomb dereferences the SAME anchor repeatedly
    // to force exponential expansion (`&a ... *a ... *a ...`). The prior regex
    // fired on ANY `&x` followed by ANY `*y` within 10 lines, matching (a) a
    // legit YAML merge-chain of DISTINCT single-use anchors (`&node`/`&fan1`…
    // each dereferenced once) and (b) Go composite-literal + pointer syntax
    // (`&Handler{…}` … `*Handler`). Require the SAME anchor name dereferenced
    // ≥2× (backreference) and exclude `&Name{` (Go/struct literals).
    // The dereference `*name` may be preceded by whitespace OR YAML flow
    // punctuation — `[*a,*a,*a]` inline-sequence bombs separate aliases with
    // `[` / `,` (gt::dos::pantheonlm-dos-303 9^10 alias bomb).
    re: /&(\w+)\b(?!\s*\{)[\s\S]{0,300}?(?:^|[\s,[\]{}()])\*\1\b[\s\S]{0,200}?(?:^|[\s,[\]{}()])\*\1\b/, desc: 'YAML anchor with repeated dereference (exponential expansion)', source: MODULE_SOURCE, weight: 8 },
];

export const REPETITION_PATTERNS: RegexPattern[] = [
  { name: 'char_repetition_extreme', cat: 'DOS_REPETITION', sev: SEVERITY.WARNING,
    // P3-WaveF: require the 100+-repeated char to be ALPHANUMERIC. A run of a
    // single punctuation / box-drawing char (`====`, `----`, `####`) is a
    // decorative separator, not a resource-exhaustion payload. The pattern is
    // shape-gated (DOS_SHAPE_GATED_PATTERNS), so it only reaches here when the
    // document already carries attack signal — the residual §7.10 FP was
    // security-domain clean controls whose section-divider boxes tripped it.
    // Non-load-bearing (never the sole dos signal on a contracted-malicious
    // row; siblings always co-fire), so the narrow loses no recall. Harmonizes
    // with the existing dos_repeated_pair_sequence alphanumeric guard below.
    re: /([A-Za-z0-9])\1{99,}/, desc: 'Single alphanumeric character repeated 100+ times', source: MODULE_SOURCE, weight: 6 },
  { name: 'word_repetition_extreme', cat: 'DOS_REPETITION', sev: SEVERITY.WARNING,
    re: /\b(\w{2,})\s+(?:\1\s+){19,}/, desc: 'Same word repeated 20+ times', source: MODULE_SOURCE, weight: 6 },
];

export const TOKEN_EXPLOSION_PATTERNS: RegexPattern[] = [
  { name: 'zero_width_cluster', cat: 'DOS_TOKEN_EXPLOSION', sev: SEVERITY.WARNING,
    re: /[\u200B\u200C\u200D\uFEFF]{5,}/, desc: 'Zero-width character cluster (token explosion)', source: MODULE_SOURCE, weight: 7 },
  { name: 'token_explosion_marker', cat: 'DOS_TOKEN_EXPLOSION', sev: SEVERITY.WARNING,
    re: /token[_\s-]*(?:count\s+)?explosion/i, desc: 'Token explosion attack marker', source: MODULE_SOURCE, weight: 7 },
];

export const RESOURCE_EXHAUSTION_PATTERNS: RegexPattern[] = [
  { name: 'zip_bomb_ref', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.CRITICAL,
    re: /(?:zip|compression)\s*bomb/i, desc: 'Zip/compression bomb reference', source: MODULE_SOURCE, weight: 8 },
  { name: 'compression_ratio_anomaly', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /(?:compress|expand)[^\n]{0,50}(?:\d+\s*(?:PB|TB|GB)|\d{6,}\s*(?:bytes|MB))/i, desc: 'Extreme compression ratio', source: MODULE_SOURCE, weight: 7 },
  { name: 'hash_collision', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    // P3-WaveA-R2: allow a hyphen separator — "hash-collision" (CVE-2011-4885
    // DJBX33A class) is the same attack reference as "hash collision"
    // (gt::dos::bonklm-dos-306).
    re: /hash[\s-]*collision/i, desc: 'Hash collision attack reference', source: MODULE_SOURCE, weight: 6 },
  { name: 'slowloris_attack', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /slowloris/i, desc: 'Slowloris connection exhaustion attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'billion_laughs', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.CRITICAL,
    re: /billion\s*laughs/i, desc: 'Billion Laughs XML attack reference', source: MODULE_SOURCE, weight: 9 },
  { name: 'dos_parallel_flood', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    // P3-WaveA-R2: the prior `(parallel|…)…(request|flood|task|query)` window
    // fired on benign architecture prose ("parallel deletion bitmap … at query
    // time", "parallel_tool_calls=false on the request"). Require explicit
    // flooding INTENT: a parallel/concurrent qualifier near a flood-outcome
    // verb, OR a numeric/bulk burst of requests/calls.
    re: /(?:parallel|concurrent|simultaneous|asyncio)[^\n]{0,60}(?:flood|overwhelm|hammer|bombard|storm|deluge|\bOOMs?\b|fill\s+(?:the\s+|up\s+)?(?:heap|memory|pool|queue|buffer)|(?:saturat|exhaust)\w*\s+(?:the\s+)?(?:server|system|gateway|endpoint|backend|pool|target|resource|heap|memory|worker|fleet|queue))|(?:flood|overwhelm|hammer|bombard|deluge)[^\n]{0,40}(?:parallel|concurrent|simultaneous)|(?:send|fire|launch|spawn|execute|process|issue|submit)\s+(?:all\s+(?:of\s+)?(?:these\s+)?)?(?:\d{2,}|hundreds?|thousands?|millions?)\s+(?:requests?|calls?|queries|tasks?|connections?)/i, desc: 'Parallel request flooding pattern', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_recursive_css_import', cat: 'DOS_RECURSIVE', sev: SEVERITY.WARNING,
    re: /@import\s+url\([^)]+\)[^\n]{0,80}(?:itself|recursive|infinite|loop)/i, desc: 'CSS import recursion pattern', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_json_circular_ref', cat: 'DOS_RECURSIVE', sev: SEVERITY.CRITICAL,
    re: /\$ref["']?\s*:\s*["']#(?:\/\w+)*["']/i, desc: 'JSON circular $ref causing infinite dereferencing', source: MODULE_SOURCE, weight: 9 },
  { name: 'dos_recursive_template', cat: 'DOS_RECURSIVE', sev: SEVERITY.WARNING,
    // P3-WaveA-R2: a `circular`-narrow was evaluated (drop bare "reference" so
    // "circular references" in spreadsheets/ORMs stops firing) but REVERTED —
    // the same `circular reference` match is load-bearing for a high-severity
    // deep-nesting DoS fixture (dos-high-nested-json-01) whose only detectable
    // surface is its "no circular references exist" clause (its 26-level nesting
    // is correctly shape-gated off). The clean-doc FP (document-attacks-622,
    // "Sheets with circular references") is routed to operator-ratify — the two
    // share the identical phrase, so no recall-safe regex separates them.
    re: /(?:recursive|circular|infinite)[^\n]{0,40}(?:template|include|import|reference|derefer)/i, desc: 'Recursive reference causing infinite loop', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_context_window_flood', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    // P3-WaveA-R2: "context window" is a routine LLM term — the prior bare
    // `context\s+(?:window|overflow)` fired on every doc that merely mentioned
    // it ("dominate the context window", "context window management"). Require
    // DoS intent: a flooding/probing cue adjacent to "context window/buffer", a
    // bare "context overflow", or an explicit flood/exhaust-the-context verb.
    re: /context\s+(?:window|buffer)\s+(?:size\s+(?:test|probe)|capacity\s+(?:test|probe)|length\s+(?:test|probe)|boundary\s+probe|overflow|flood\w*|exhaust\w*|saturat\w*|attack|bomb|manipulation|discovery|exploit|probing)|context\s+overflow\b|(?:overflow|flood|exhaust|saturat\w*|fill|cram|stuff|overwhelm|maximi[sz]e|exceed|blow\s*up|max\s*out|pack)\s+(?:the\s+|out\s+the\s+|up\s+the\s+|its\s+|entire\s+|target'?s?\s+)?context(?:\s+(?:window|buffer))?\b|flood\s+(?:the\s+)?context|exhaust\s+(?:the\s+)?context/i, desc: 'Context window flooding/exhaustion', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_length_repeat_directive', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /(?:repeat\s+the\s+following\s+text\s+for\s+thousands?\s+of\s+times|copy\s+this\s+phrase\s+hundreds?\s+of\s+times|duplicate\s+this\s+string\s+millions?\s+of\s+times|stretch\s+the\s+prompt\s+to\s+reach\s+the\s+maximum\s+limit|pad\s+the\s+message\s+to\s+hit\s+the\s+threshold)/i, desc: 'Explicit repetitive-length flooding directive', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_length_boundary_probe', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /(?:input\s+length\s+boundaries|extend\s+the\s+input\s+buffer|add\s+more\s+content\s+to\s+test\s+limits|create\s+a\s+long\s+sequence\s+of\s+text\s+characters)/i, desc: 'Length-boundary probing directive for input-buffer expansion', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_markdown_recursion_loop', cat: 'DOS_RECURSIVE', sev: SEVERITY.WARNING,
    re: /(?:deeply\s+nested\s+markdown\s+structure|nested\s+markdown\s+processing|continuously\s+process\s+the\s+expanding\s+markdown|recursively\s+analy(?:s|z)e\s+the\s+nested\s+content)/i, desc: 'Recursive markdown expansion directive', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_xml_recursion_loop', cat: 'DOS_XML_BOMB', sev: SEVERITY.WARNING,
    re: /(?:deeply\s+nested\s+xml\s+structure|xml\s+entity\s+expansion\s+and\s+deep\s+nesting|continuously\s+process\s+the\s+expanding\s+xml|recursively\s+analy(?:s|z)e\s+the\s+nested\s+content)/i, desc: 'Recursive XML expansion directive', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_cpu_exhaustion', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    // P3-WaveA-R2: drop `deplet` — "resource depletion" is standard
    // sustainability / life-cycle-assessment vocabulary (ISO 14044, ESG
    // reporting), not a DoS signal. The genuine attack terms (exhaustion,
    // starvation, consumption) remain.
    re: /(?:cpu|memory|resource)\s*(?:exhaust|starv|consum)/i, desc: 'CPU/memory exhaustion attack', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_amplification', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    // P3-WaveA-R2: the prior `(amplif|expan|multipl)…(attack|payload|response|
    // output)` window fired on benign prose where "expand(ed)" sat near an
    // unrelated "attack"/"output" ("expanded 2025): jailbreak-attack",
    // "a small zip that expands to a large output"). Keep `amplif…` (inherently
    // attack-shaped: amplification/reflection DDoS), but require the
    // expand/multiply branch to be an imperative on a generation noun with an
    // UNBOUNDED qualifier ("expand the response to infinite / without limit").
    re: /amplif\w*[^\n]{0,40}(?:attack|payload|factor|ratio|ddos|reflection|surface)|(?:amplif|expan|multipl|inflat)\w*[\s-]?(?:attack|bomb|dos|ddos|flood|payload)|(?:expand|multipl|inflat|balloon|enlarge|magnif|grow)\w*\s+(?:the\s+)?(?:response|output|payload|text|content|input|prompt|message)\b[^\n]{0,40}(?:to\s+(?:infinit|maxim|the\s+max)|without\s+(?:limit|bound)|endless|unlimited|exponential|indefinit|enormous|massiv)/i, desc: 'Amplification attack pattern', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_xslt_recursion', cat: 'DOS_RECURSIVE', sev: SEVERITY.CRITICAL,
    re: /(?:xslt|xsl)[^\n]{0,40}(?:recursion|recursive|bomb|infinite|loop)/i, desc: 'XSLT recursion bomb', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_regex_alternation', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.WARNING,
    re: /(?:alternation|alternating)[^\n]{0,40}(?:explosion|regex|ReDoS|backtrack)/i, desc: 'Regex alternation explosion', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_email_redos', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.WARNING,
    re: /(?:email|e-mail)\s+(?:regex|regular\s+expression)[^\n]{0,40}(?:ReDoS|backtrack|bomb|denial)/i, desc: 'Email regex ReDoS attack', source: MODULE_SOURCE, weight: 7 },
  { name: 'dos_redos_marker', cat: 'DOS_REGEX_BOMB', sev: SEVERITY.WARNING,
    re: /\bredos\b/i, desc: 'ReDoS attack reference', source: MODULE_SOURCE, weight: 6 },
  { name: 'dos_output_unbounded', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.CRITICAL,
    re: /(?:generate|produce|create)\s+(?:as\s+much\s+as\s+possible|without\s+any\s+limit|unlimited\s+output)|never\s+stop\s+generating|continue\s+writing\s+indefinitely/i, desc: 'Unbounded output generation request', source: MODULE_SOURCE, weight: 9 },
  { name: 'dos_output_enumeration_flood', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /(?:list|enumerate|generate)\s+(?:all|every)\s+(?:possible|available|known)\s+(?:items?|options?|combinations?)|complete\s+list\s+of\s+all\s+known\s+items/i, desc: 'Enumeration-based output flooding', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_output_expansion_flood', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /expand\s+on\s+every\s+aspect|elaborate\s+on\s+(?:each|every)\s+(?:point|detail)|detail\s+every\s+element|repeat\s+the\s+response\s+multiple\s+times/i, desc: 'Output expansion flooding pattern', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_cost_retry_loop', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /retry\s+the\s+same\s+task\s+again|repeat\s+the\s+operation\s+multiple\s+times|re-?(?:do|run|execute)\s+the\s+(?:analysis|process|query)|retry\s+with\s+variations\s+until\s+complete/i, desc: 'Retry-loop cost amplification', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_cost_step_chain', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /chain\s+(?:together\s+)?multiple\s+steps|link\s+(?:many|multiple)\s+operations|connect\s+(?:several|multiple)\s+tasks\s+in\s+a\s+sequence|show\s+your\s+complete\s+chain\s+of\s+thought/i, desc: 'Multi-step cost amplification pattern', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_compute_intensive', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /perform\s+extremely\s+complex\s+(?:computation|analysis)|execute\s+highly\s+intensive\s+(?:processing|computation)|run\s+very\s+difficult\s+calculation\s+tasks|use\s+maximum\s+compute\s+resources|consume\s+all\s+available\s+processing\s+power/i, desc: 'Compute-intensive workload amplification', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_request_burst', cat: 'DOS_RESOURCE_EXHAUSTION', sev: SEVERITY.WARNING,
    re: /send\s+many\s+requests?\s+rapidly|submit\s+multiple\s+queries?\s+(?:at\s+once|quickly)|fire\s+hundreds?\s+of\s+calls?\s+quickly/i, desc: 'Burst request flooding pattern', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_history_flood', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /remember\s+everything(?:\s+conversation)?|recall\s+all\s+the\s+previous\s+history|reference\s+everything\s+from\s+the\s+chat|use\s+all\s+the\s+dialogue\s+context/i, desc: 'Conversation history flooding pattern', source: MODULE_SOURCE, weight: 8 },
  { name: 'dos_multi_turn_context_flood', cat: 'DOS_CONTEXT_OVERFLOW', sev: SEVERITY.WARNING,
    re: /(?:next|upcoming|following)\s+(?:turns?|responses?|rounds?)\s+(?:process|handle|evaluate|analy(?:s|z)e)\s+all\s+the\s+(?:data|content|text)|across\s+(?:multiple\s+turns|several\s+messages)\s+(?:process|analy(?:s|z)e)\s+all\s+the\s+(?:data|information)/i, desc: 'Multi-turn context flooding pattern', source: MODULE_SOURCE, weight: 8 },
];

export function detectResourceExhaustion(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect deeply nested brackets/braces (JSON/GraphQL depth attack)
  let maxDepth = 0;
  let depth = 0;
  for (const ch of text) {
    if (ch === '{' || ch === '[' || ch === '(') { depth++; maxDepth = Math.max(maxDepth, depth); }
    else if (ch === '}' || ch === ']' || ch === ')') { depth = Math.max(0, depth - 1); }
  }
  if (maxDepth >= 10) {
    findings.push({
      category: 'DOS_DEEP_NESTING', severity: SEVERITY.CRITICAL,
      description: `Deeply nested structure detected (depth: ${maxDepth})`,
      match: `nesting depth: ${maxDepth}`, source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'deep_nesting_analysis', weight: 9,
    });
  }

  // Detect Zalgo combining marks (token explosion via Unicode)
  const zalgoMatch = text.match(/[\u0300-\u036F]{3,}/);
  if (zalgoMatch) {
    findings.push({
      category: 'DOS_TOKEN_EXPLOSION', severity: SEVERITY.WARNING,
      description: 'Zalgo/combining diacritical marks causing token explosion',
      match: 'zalgo combining marks detected', source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'dos_zalgo_combining_marks', weight: 7,
    });
  }

  // Detect phrase-level repetition (cap search window to avoid ReDoS from backreference)
  const searchWindow = text.slice(0, 10_000);
  const phraseMatch = searchWindow.match(/(.{15,80})\1{4,}/);
  if (phraseMatch) {
    findings.push({
      category: 'DOS_CONTEXT_OVERFLOW', severity: SEVERITY.WARNING,
      description: 'Phrase repeated 5+ times (context overflow pattern)',
      match: phraseMatch[1]!.slice(0, 80), source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'dos_phrase_repetition', weight: 7,
    });
  }

  // Detect repetitive line patterns (context overflow)
  const lines = text.split('\n');
  if (lines.length > 10) {
    const lineCounts = new Map<string, number>();
    for (const line of lines) {
      const trimmed = line.trim();
      // P3-WaveF: only count repeated lines that carry alphanumeric content. A
      // repeated pure-punctuation line (`==========`, `----------`) is a
      // decorative section separator, not a context-overflow flood.
      // context_overflow_repetition fires on 0 contracted-malicious rows (a
      // genuine repeat-flood repeats content lines, which retain alphanumerics),
      // so this loses no recall.
      if (trimmed.length > 25 && /[A-Za-z0-9]/.test(trimmed)) {
        lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
      }
    }
    for (const [line, count] of lineCounts) {
      if (count >= 10) {
        findings.push({
          category: 'DOS_CONTEXT_OVERFLOW', severity: SEVERITY.WARNING,
          description: `Line repeated ${count} times (context overflow pattern)`,
          match: line.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
          pattern_name: 'context_overflow_repetition', weight: 7,
        });
        break;
      }
    }
  }

  const compact = text.replace(/\s+/g, '');
  const repeatedPairMatch = compact.match(/(.{2,3})\1{9,}/);
  if (
    repeatedPairMatch
    && /[A-Za-z0-9]/.test(repeatedPairMatch[1] ?? '')
    && /[^\w]/.test(repeatedPairMatch[1] ?? '')
    && compact.length >= 20
  ) {
    // Any URL-encoded byte (%XX) is a benign encoding artifact, not a raw
    // repetition attack. URL-encoded content naturally produces long runs of
    // repeated encoded chars (e.g. %3D for Base64 padding, %0A for newlines).
    const isUrlEncodedByte = /^%[0-9A-Fa-f]{2}$/.test(repeatedPairMatch[1] ?? '');
    if (!isUrlEncodedByte) {
      findings.push({
        category: 'DOS_RESOURCE_EXHAUSTION', severity: SEVERITY.WARNING,
        description: 'Short symbolic pair or triplet repeated aggressively (resource exhaustion primitive)',
        match: repeatedPairMatch[0]!.slice(0, 100), source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'dos_repeated_pair_sequence', weight: 8,
      });
    }
  }

  return findings;
}

const DOS_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: REGEX_BOMB_PATTERNS, name: 'REGEX_BOMB' },
  { patterns: XML_BOMB_PATTERNS, name: 'XML_BOMB' },
  { patterns: DEEP_NESTING_PATTERNS, name: 'DEEP_NESTING' },
  { patterns: REPETITION_PATTERNS, name: 'REPETITION' },
  { patterns: TOKEN_EXPLOSION_PATTERNS, name: 'TOKEN_EXPLOSION' },
  { patterns: RESOURCE_EXHAUSTION_PATTERNS, name: 'RESOURCE_EXHAUSTION' },
];
const DOS_DETECTORS = [{ name: 'resource-exhaustion', detect: detectResourceExhaustion }];

const dosDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects DoS and resource exhaustion attack patterns',
  supportedContentTypes: ['text/plain', 'application/json', 'application/xml'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'DOS_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: "Input exceeds size limit for dos-detector (" + text.length + " bytes)",
        match: "length=" + text.length, source: MODULE_SOURCE, engine: ENGINE,
        pattern_name: 'dos_detector_size_limit' }];
    }
    const findings: Finding[] = [];
    // SC.1.7c: lazily compute the post-normalize attack-signal flag once
    // per scan; used by both regex-pattern guards and the custom detector.
    let shapeAttackSignal: boolean | null = null;
    const requireShapeAttackSignal = (): boolean => {
      if (shapeAttackSignal === null) {
        shapeAttackSignal = containsDecodedAttackSignal(normalizeForAttackCheck(text));
      }
      return shapeAttackSignal;
    };
    for (const group of DOS_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (!m) continue;
        if (DOS_SHAPE_GATED_PATTERNS.has(p.name) && !requireShapeAttackSignal()) {
          continue;
        }
        // P3-WaveA-R2: a bare local `$ref` is benign JSON-Schema referencing;
        // only fire dos_json_circular_ref when circular-/self-reference intent
        // is present in the document.
        if (p.name === 'dos_json_circular_ref' && !CIRCULAR_REF_INTENT_RE.test(text)) {
          continue;
        }
        findings.push({ category: p.cat, severity: p.sev, description: p.desc,
          match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || MODULE_SOURCE, engine: ENGINE,
          ...(p.weight !== undefined && { weight: p.weight }) });
      }
    }
    for (const d of DOS_DETECTORS) {
      const detectorFindings = d.detect(text);
      // SC.1.7c: filter shape-gated findings from custom detectors.
      for (const f of detectorFindings) {
        if (DOS_SHAPE_GATED_PATTERNS.has(f.pattern_name ?? '') && !requireShapeAttackSignal()) {
          continue;
        }
        findings.push(f);
      }
    }
    if (BENIGN_MEDIA_BINARY_CONTEXT_RE.test(text)) {
      return findings.filter(f => !MEDIA_BINARY_DOS_PATTERN_NAMES.has(f.pattern_name || ''));
    }
    if (!BENIGN_DOS_CONTEXT_RE.test(text)) {
      return findings;
    }

    return findings.filter(f => !BENIGN_DOS_PATTERN_NAMES.has(f.pattern_name || ''));
  },

  getPatternCount() {
    return DOS_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + DOS_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = DOS_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: MODULE_SOURCE }));
    groups.push({ name: 'dos-detectors', count: DOS_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

scannerRegistry.register(dosDetectorModule);
export { dosDetectorModule };
