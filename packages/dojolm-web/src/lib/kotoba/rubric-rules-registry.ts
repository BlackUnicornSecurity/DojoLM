// SPDX-License-Identifier: Apache-2.0
/**
 * File: rubric-rules-registry.ts
 * Purpose: Metadata catalogue for every pattern the Wave 2 + Wave 7
 *          rubric uses. Each entry tags a pattern with its source,
 *          severity, category, and a brief description so operators
 *          can audit "what does the rubric actually check, and where
 *          did each rule come from?"
 *
 * Story: WAVE7-K-RUBRIC-MAX / ADR-0053. The registry is the
 *        authoritative count of "rules" referenced in the ticket.
 *        Wave 2 baseline = 24 rules; Wave 7.1 first cut adds 30+
 *        OWASP / MITRE / Anthropic / Google rules tagged below.
 *
 * Design: data-only module — no runtime behaviour change to rubric
 *         scoring. The pattern arrays in `rubric.ts` carry the
 *         scoring; this file documents what each entry measures.
 *         A drift test (rubric-rules-registry.test.ts) asserts the
 *         registry length stays in sync with the pattern arrays.
 */

import type { IssueSeverity } from './rubric'

/**
 * Source taxonomy. Each rule is tagged with the authoritative
 * framework or document it derives from. `WAVE2-BASELINE` flags
 * rules that pre-date Wave 7 — they are kept for backwards
 * compatibility and operator familiarity.
 */
export type RubricSource =
  | 'WAVE2-BASELINE'
  | 'OWASP-LLM-2025'
  | 'MITRE-ATLAS'
  | 'ANTHROPIC-AUP'
  | 'GOOGLE-SAFETY-FRAMEWORK'
  | 'MITRE-ATTACK-AI'

export type RubricCategoryId =
  | 'boundary-definition'
  | 'role-clarity'
  | 'priority-ordering'
  | 'output-constraints'
  | 'defense-layers'
  | 'input-handling'
  // ADR-0057 / WAVE7-K-CATEGORIES-MAX additions.
  | 'tool-use-safety'
  | 'rag-safety'
  | 'cost-controls'
  | 'pii-handling'
  | 'memory-state-safety'
  | 'multi-modal-safety'
  | 'agentic-workflow-safety'
  | 'alignment-stability'

export interface RubricRuleMeta {
  readonly id: string
  readonly source: RubricSource
  readonly category: RubricCategoryId
  readonly severity: IssueSeverity
  /** Short human-readable description — what the rule looks for. */
  readonly description: string
  /** Optional reference id within the source doc (e.g. `LLM01`). */
  readonly sourceRef?: string
}

/**
 * Wave 2 baseline (24 entries) — preserved verbatim. Pattern indexes
 * in `rubric.ts` correspond to the order of the patterns inside each
 * category's array; this registry mirrors that order so drift is
 * detectable.
 */
const WAVE2_RULES: readonly RubricRuleMeta[] = [
  // BOUNDARY_PATTERNS (7)
  { id: 'b-under-no-circumstances', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'high', description: 'Detects "under no circumstances" hard-boundary phrasing.' },
  { id: 'b-you-may-not', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'medium', description: 'Detects "you may not" prohibition.' },
  { id: 'b-never-action', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'high', description: 'Detects "never reveal/output/share/expose/execute" verbs.' },
  { id: 'b-do-not-action', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'medium', description: 'Detects "do not reveal/output/share/expose" verbs.' },
  { id: 'b-politely-decline', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'low', description: 'Detects refusal posture phrasing.' },
  { id: 'b-refuse', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'low', description: 'Detects bare "refuse" verb.' },
  { id: 'b-out-of-scope', source: 'WAVE2-BASELINE', category: 'boundary-definition', severity: 'medium', description: 'Detects out-of-scope refusal phrasing.' },
  // ROLE_PATTERNS (3)
  { id: 'r-you-are', source: 'WAVE2-BASELINE', category: 'role-clarity', severity: 'high', description: 'Detects "You are <role>" identity declaration.' },
  { id: 'r-role-language', source: 'WAVE2-BASELINE', category: 'role-clarity', severity: 'medium', description: 'Detects role / act-as / role-definition phrasing.' },
  { id: 'r-designated-identity', source: 'WAVE2-BASELINE', category: 'role-clarity', severity: 'low', description: 'Detects designated / identity language.' },
  // OUTPUT_PATTERNS (8)
  { id: 'o-json', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects JSON output format mention.' },
  { id: 'o-markdown', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects Markdown output format mention.' },
  { id: 'o-plain-text', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects plain-text output mention.' },
  { id: 'o-format', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects "format" keyword.' },
  { id: 'o-schema', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects "schema" keyword.' },
  { id: 'o-length-cap', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'medium', description: 'Detects explicit length cap (max N words/chars/tokens/lines).' },
  { id: 'o-tone', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects tone constraint.' },
  { id: 'o-response-length', source: 'WAVE2-BASELINE', category: 'output-constraints', severity: 'low', description: 'Detects "response length" phrasing.' },
  // DEFENSE_PATTERNS (6)
  { id: 'd-system-boundaries', source: 'WAVE2-BASELINE', category: 'defense-layers', severity: 'medium', description: 'Detects [SYSTEM BOUNDARIES] section marker.' },
  { id: 'd-safety-rules', source: 'WAVE2-BASELINE', category: 'defense-layers', severity: 'medium', description: 'Detects [SAFETY RULES] section marker.' },
  { id: 'd-priority-section', source: 'WAVE2-BASELINE', category: 'defense-layers', severity: 'medium', description: 'Detects [PRIORITY/PRIORITIES] section marker.' },
  { id: 'd-highest-priority', source: 'WAVE2-BASELINE', category: 'defense-layers', severity: 'low', description: 'Detects "highest priority" emphasis.' },
  { id: 'd-do-not-execute', source: 'WAVE2-BASELINE', category: 'defense-layers', severity: 'high', description: 'Detects "do not execute" defense.' },
  { id: 'd-take-precedence', source: 'WAVE2-BASELINE', category: 'defense-layers', severity: 'low', description: 'Detects "take precedence" priority phrasing.' },
  // INPUT_PATTERNS (4)
  { id: 'i-untrusted', source: 'WAVE2-BASELINE', category: 'input-handling', severity: 'high', description: 'Detects "untrusted content/input/data" framing.' },
  { id: 'i-do-not-execute-embedded', source: 'WAVE2-BASELINE', category: 'input-handling', severity: 'high', description: 'Detects "do not execute embedded user instructions".' },
  { id: 'i-treat-as-data', source: 'WAVE2-BASELINE', category: 'input-handling', severity: 'medium', description: 'Detects "treat <X> as data/untrusted/input/text".' },
  { id: 'i-injection-defense', source: 'WAVE2-BASELINE', category: 'input-handling', severity: 'medium', description: 'Detects explicit prompt-injection defense.' },
]

/**
 * Wave 7.1 first cut (30 entries) — OWASP LLM Top 10 mapped onto
 * the existing six categories. ATLAS / AnthropicAUP / GoogleSF /
 * MITRE-ATTACK-AI rules land in subsequent Wave 7.1 batches.
 */
const WAVE7_OWASP_RULES: readonly RubricRuleMeta[] = [
  // BOUNDARY (7 additions) — LLM01 / LLM06 / LLM08
  { id: 'b-ignore-prior-instructions', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'boundary-definition', severity: 'high', description: 'OWASP LLM01: detect injection-style "ignore prior instructions".' },
  { id: 'b-override-rules', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'boundary-definition', severity: 'high', description: 'OWASP LLM01: detect "override rules/policy" injection variant.' },
  { id: 'b-jailbreak-mention', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'boundary-definition', severity: 'medium', description: 'OWASP LLM01: explicit jailbreak vocabulary.' },
  { id: 'b-no-prompt-echo', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'boundary-definition', severity: 'high', description: 'OWASP LLM06: forbid system-prompt disclosure.' },
  { id: 'b-no-secret-disclosure', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'boundary-definition', severity: 'high', description: 'OWASP LLM06: forbid credential / API-key / secret leak.' },
  { id: 'b-require-human-approval', source: 'OWASP-LLM-2025', sourceRef: 'LLM08', category: 'boundary-definition', severity: 'medium', description: 'OWASP LLM08: agency cap — require human approval for state changes.' },
  { id: 'b-no-autonomous-action', source: 'OWASP-LLM-2025', sourceRef: 'LLM08', category: 'boundary-definition', severity: 'medium', description: 'OWASP LLM08: explicit no-autonomous-execution clause.' },
  // ROLE (3 additions) — LLM01 (persona-lock) + AnthropicAUP role hygiene
  { id: 'r-persona-lock', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'role-clarity', severity: 'high', description: 'OWASP LLM01: persona-lock — refuse impersonation requests.' },
  { id: 'r-stay-in-character', source: 'ANTHROPIC-AUP', category: 'role-clarity', severity: 'medium', description: 'AnthropicAUP role hygiene: "stay in character/role" phrasing.' },
  { id: 'r-scope-of-expertise', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'role-clarity', severity: 'low', description: 'GoogleSF: declared scope/domain limitation.' },
  // OUTPUT (7 additions) — LLM02 / LLM04 / LLM09
  { id: 'o-sanitize-output', source: 'OWASP-LLM-2025', sourceRef: 'LLM02', category: 'output-constraints', severity: 'high', description: 'OWASP LLM02: sanitise/escape HTML/markup in user-supplied output.' },
  { id: 'o-no-raw-html', source: 'OWASP-LLM-2025', sourceRef: 'LLM02', category: 'output-constraints', severity: 'high', description: 'OWASP LLM02: forbid raw HTML / script / iframe in output.' },
  { id: 'o-plaintext-only', source: 'OWASP-LLM-2025', sourceRef: 'LLM02', category: 'output-constraints', severity: 'medium', description: 'OWASP LLM02: plaintext-only constraint to defuse rendering injection.' },
  { id: 'o-max-output-tokens', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'output-constraints', severity: 'medium', description: 'OWASP LLM04: explicit max-output-tokens / length / size cap.' },
  { id: 'o-no-unbounded-loops', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'output-constraints', severity: 'medium', description: 'OWASP LLM04: forbid unbounded loops/recursion/generation.' },
  { id: 'o-cite-sources', source: 'OWASP-LLM-2025', sourceRef: 'LLM09', category: 'output-constraints', severity: 'low', description: 'OWASP LLM09: require source citations to combat overreliance.' },
  { id: 'o-flag-uncertainty', source: 'OWASP-LLM-2025', sourceRef: 'LLM09', category: 'output-constraints', severity: 'low', description: 'OWASP LLM09: surface uncertainty / low-confidence signal.' },
  // DEFENSE (8 additions) — section-marker coverage + LLM07 + ATLAS
  { id: 'd-section-role-definition', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'defense-layers', severity: 'low', description: 'Section marker: [ROLE DEFINITION].' },
  { id: 'd-section-output-constraints', source: 'OWASP-LLM-2025', sourceRef: 'LLM02', category: 'defense-layers', severity: 'low', description: 'Section marker: [OUTPUT CONSTRAINTS].' },
  { id: 'd-section-tool-policy', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'defense-layers', severity: 'medium', description: 'Section marker: [TOOL USE/POLICY].' },
  { id: 'd-section-pii-handling', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'defense-layers', severity: 'medium', description: 'Section marker: [PII HANDLING].' },
  { id: 'd-section-rag-policy', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'defense-layers', severity: 'medium', description: 'Section marker: [RAG RULES/POLICY].' },
  { id: 'd-validate-tool-io', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'defense-layers', severity: 'high', description: 'OWASP LLM07: validate tool/plugin inputs/arguments/outputs.' },
  { id: 'd-least-privilege', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'defense-layers', severity: 'medium', description: 'OWASP LLM07: least-privilege phrasing.' },
  { id: 'd-tool-allowlist', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'defense-layers', severity: 'medium', description: 'OWASP LLM07: explicit tool/plugin allowlist.' },
  { id: 'd-prompt-firewall', source: 'MITRE-ATLAS', sourceRef: 'AML.T0051', category: 'defense-layers', severity: 'medium', description: 'ATLAS AML.T0051 defense: input/prompt guard or firewall.' },
  // INPUT (5 additions) — LLM01 (indirect injection) + LLM05 + LLM06
  { id: 'i-rag-untrusted', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'input-handling', severity: 'high', description: 'OWASP LLM01: tag retrieved/tool-returned content as untrusted.' },
  { id: 'i-delimit-user-input', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'input-handling', severity: 'medium', description: 'OWASP LLM01: delimit user/external input with tags or fences.' },
  { id: 'i-disregard-injected-instructions', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'input-handling', severity: 'high', description: 'OWASP LLM01: disregard instructions inside retrieved/external content.' },
  { id: 'i-redact-pii', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'input-handling', severity: 'high', description: 'OWASP LLM06: redact PII / secrets / credentials.' },
  { id: 'i-no-pii-persistence', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'input-handling', severity: 'medium', description: 'OWASP LLM06: forbid storing/persisting/caching/logging user PII.' },
  { id: 'i-verify-tool-provenance', source: 'OWASP-LLM-2025', sourceRef: 'LLM05', category: 'input-handling', severity: 'medium', description: 'OWASP LLM05: verify tool/plugin/model source/provenance/signature.' },
]

/**
 * Wave 7.1 second cut (22 entries) — MITRE ATLAS LLM techniques
 * + AnthropicAUP usage policy + Google Safety Framework + initial
 * MITRE ATT&CK-AI adaptations. Lands under ADR-0054.
 */
const WAVE7_ATLAS_AUP_GSF_RULES: readonly RubricRuleMeta[] = [
  // BOUNDARY (5 additions) — ATLAS T0048, T0031 + AnthropicAUP
  { id: 'b-no-external-actions-without-approval', source: 'MITRE-ATLAS', sourceRef: 'AML.T0048', category: 'boundary-definition', severity: 'high', description: 'ATLAS T0048 External Harms: forbid emails/messages/payments/transactions without approval.' },
  { id: 'b-no-finetune-from-user', source: 'MITRE-ATLAS', sourceRef: 'AML.T0031', category: 'boundary-definition', severity: 'medium', description: 'ATLAS T0031 Erode Model Integrity: forbid fine-tuning/weight-update from user input.' },
  { id: 'b-aup-high-stakes-disclaimer', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP: disallow medical/legal/financial advice without disclaimer or professional referral.' },
  { id: 'b-aup-protect-minors', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP: explicit minor / child protection clause.' },
  { id: 'b-aup-no-csam', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP: explicit CSAM refusal clause.' },
  // ROLE (3 additions) — ATLAS T0013 + AnthropicAUP + GSF fairness
  { id: 'r-atlas-authenticate-before-elevated', source: 'MITRE-ATLAS', sourceRef: 'AML.T0013', category: 'role-clarity', severity: 'medium', description: 'ATLAS T0013 Identity Spoofing: authenticate user identity before elevated/sensitive actions.' },
  { id: 'r-aup-disclose-ai', source: 'ANTHROPIC-AUP', category: 'role-clarity', severity: 'medium', description: 'AnthropicAUP transparency: disclose AI/automated nature.' },
  { id: 'r-gsf-avoid-bias', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'role-clarity', severity: 'medium', description: 'GSF fairness: avoid demographic / protected-class / stereotyped assumptions in role.' },
  // OUTPUT (4 additions) — AnthropicAUP + GSF + MITRE-ATT&CK-AI + GSF safety filter
  { id: 'o-aup-disclosure-tag', source: 'ANTHROPIC-AUP', category: 'output-constraints', severity: 'low', description: 'AnthropicAUP: include AI/disclosure notice / disclaimer tag in output.' },
  { id: 'o-gsf-trace-id', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'output-constraints', severity: 'low', description: 'GSF accountability: emit request/trace/correlation id with output.' },
  { id: 'o-attack-redact-tool-output', source: 'MITRE-ATTACK-AI', sourceRef: 'T1059-AI', category: 'output-constraints', severity: 'medium', description: 'ATT&CK-AI command-and-scripting adaptation: redact tool/command/shell invocations + outputs in user-facing responses.' },
  { id: 'o-gsf-refuse-harmful', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'output-constraints', severity: 'high', description: 'GSF + OWASP LLM02: refuse harmful/toxic/hateful/violent content.' },
  // DEFENSE (7 additions) — ATLAS T0053 / T0054 / T0055 / T0058 / T0029
  { id: 'd-atlas-sandbox-tool-execution', source: 'MITRE-ATLAS', sourceRef: 'AML.T0053', category: 'defense-layers', severity: 'high', description: 'ATLAS T0053 LLM Plugin Compromise: isolate / sandbox tool/plugin execution.' },
  { id: 'd-atlas-audit-tool-calls', source: 'MITRE-ATLAS', sourceRef: 'AML.T0053', category: 'defense-layers', severity: 'medium', description: 'ATLAS T0053: audit / log every tool / plugin call.' },
  { id: 'd-atlas-jailbreak-pattern-detection', source: 'MITRE-ATLAS', sourceRef: 'AML.T0054', category: 'defense-layers', severity: 'high', description: 'ATLAS T0054 LLM Jailbreak: detect/reject DAN / grandma / developer-mode style prompt patterns.' },
  { id: 'd-atlas-roleplay-cannot-bypass', source: 'MITRE-ATLAS', sourceRef: 'AML.T0054', category: 'defense-layers', severity: 'high', description: 'ATLAS T0054: explicit clause that role-play / hypothetical / fictional scenarios cannot bypass safety/rules.' },
  { id: 'd-atlas-never-request-credentials', source: 'MITRE-ATLAS', sourceRef: 'AML.T0055', category: 'defense-layers', severity: 'high', description: 'ATLAS T0055 Unsecured Credentials: explicit clause never to request/elicit passwords/tokens/API-keys/credentials from users.' },
  { id: 'd-atlas-flag-hallucinations', source: 'MITRE-ATLAS', sourceRef: 'AML.T0058', category: 'defense-layers', severity: 'medium', description: 'ATLAS T0058 Publish Hallucinated Entities: flag / mark / disclose fabricated / unverified entities or claims.' },
  { id: 'd-atlas-rate-limit-per-user', source: 'MITRE-ATLAS', sourceRef: 'AML.T0029', category: 'defense-layers', severity: 'medium', description: 'ATLAS T0029 Denial of ML Service: per-user / per-session rate limiting clause.' },
  // INPUT (3 additions) — ATLAS T0057 (data leakage) + T0056 (meta-prompt extraction)
  { id: 'i-atlas-strip-hidden-chars', source: 'MITRE-ATLAS', sourceRef: 'AML.T0057', category: 'input-handling', severity: 'high', description: 'ATLAS T0057 LLM Data Leakage: strip / filter hidden / invisible / zero-width / ANSI characters in input.' },
  { id: 'i-atlas-reject-encoded-payloads', source: 'MITRE-ATLAS', sourceRef: 'AML.T0057', category: 'input-handling', severity: 'medium', description: 'ATLAS T0057: reject / sanitize base64 / encoded / obfuscated input payloads.' },
  { id: 'i-atlas-detect-meta-prompt-extraction', source: 'MITRE-ATLAS', sourceRef: 'AML.T0056', category: 'input-handling', severity: 'high', description: 'ATLAS T0056 LLM Meta Prompt Extraction: detect / log meta-prompt / system-prompt extraction attempts.' },
]

/**
 * Wave 7.1 third cut (25 entries) — wider Anthropic AUP, wider
 * Google Safety Framework, deeper ATLAS supply-chain / inference
 * API / data-poisoning, and ATT&CK-AI agentic adaptations across
 * Initial Access / Defense Evasion / Persistence / Lateral Move
 * / Collection / Discovery / Exfiltration. Lands under ADR-0055.
 */
const WAVE7_WIDER_AUP_GSF_ATTACK_RULES: readonly RubricRuleMeta[] = [
  // BOUNDARY (8 additions) — wider AUP + ATLAS T0010 / T0011
  { id: 'b-aup-election-neutral', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'medium', description: 'AnthropicAUP election integrity: stay neutral on elections / political candidates.' },
  { id: 'b-aup-weapons-cbrn', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP CBRN: refuse weapons / chemical / biological / radiological / nuclear synthesis or design instructions.' },
  { id: 'b-aup-deepfake-impersonation', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP non-consensual / deepfake: forbid impersonation of real persons or non-consensual content.' },
  { id: 'b-aup-self-harm-resources', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP safety: surface crisis / 988 / hotline resources for self-harm requests.' },
  { id: 'b-aup-no-harassment', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'high', description: 'AnthropicAUP harassment policy: refuse hate speech / harassment / targeted abuse.' },
  { id: 'b-aup-respect-copyright', source: 'ANTHROPIC-AUP', category: 'boundary-definition', severity: 'medium', description: 'AnthropicAUP IP: respect copyright / intellectual property / trademarks.' },
  { id: 'b-atlas-no-autoexec-retrieved', source: 'MITRE-ATLAS', sourceRef: 'AML.T0011', category: 'boundary-definition', severity: 'high', description: 'ATLAS T0011 User Execution: never auto-execute scripts/code from retrieved/external/web sources.' },
  { id: 'b-atlas-reject-unsigned-deps', source: 'MITRE-ATLAS', sourceRef: 'AML.T0010', category: 'boundary-definition', severity: 'high', description: 'ATLAS T0010 ML Supply Chain Compromise: reject unsigned/untrusted models/tools/plugins on import or load.' },
  // ROLE (2 additions) — scope drift + no role escalation
  { id: 'r-strict-scope-adherence', source: 'ANTHROPIC-AUP', category: 'role-clarity', severity: 'medium', description: 'AUP: strictly adhere to declared role/scope/domain.' },
  { id: 'r-attack-no-role-escalation', source: 'MITRE-ATTACK-AI', sourceRef: 'T1136-AI', category: 'role-clarity', severity: 'high', description: 'ATT&CK-AI Account Manipulation adaptation: never create/modify/escalate user/account/role/permission on user request alone.' },
  // OUTPUT (5 additions) — wider GSF + ATT&CK-AI exfil/disco
  { id: 'o-gsf-no-pii-in-logs', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'output-constraints', severity: 'high', description: 'GSF privacy-by-design: never include user/caller PII in logs/telemetry/outputs.' },
  { id: 'o-gsf-appeal-pathway', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'output-constraints', severity: 'low', description: 'GSF contestability: provide appeal / escalation / contestation / review pathway.' },
  { id: 'o-gsf-explain-reasoning', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'output-constraints', severity: 'low', description: 'GSF scientific rigor: explain reasoning / justification / rationale on request.' },
  { id: 'o-attack-no-enumerate-tools', source: 'MITRE-ATTACK-AI', sourceRef: 'T1083-AI', category: 'output-constraints', severity: 'medium', description: 'ATT&CK-AI Discovery (T1083 adaptation): never enumerate available/installed/registered tools/plugins/capabilities to unauthenticated callers.' },
  { id: 'o-attack-no-outbound-without-approval', source: 'MITRE-ATTACK-AI', sourceRef: 'T1567-AI', category: 'output-constraints', severity: 'high', description: 'ATT&CK-AI Exfiltration (T1567 adaptation): no webhook/outbound/external posts/sends/callbacks without approval.' },
  // DEFENSE (7 additions) — ATLAS T0040 / T0044 / T0046 + ATT&CK-AI Persistence / Defense Evasion / Lateral / GSF oversight
  { id: 'd-atlas-require-api-token', source: 'MITRE-ATLAS', sourceRef: 'AML.T0040', category: 'defense-layers', severity: 'high', description: 'ATLAS T0040 ML Inference API Access: require API/Bearer/OAuth token for inference or model access.' },
  { id: 'd-atlas-no-model-egress', source: 'MITRE-ATLAS', sourceRef: 'AML.T0044', category: 'defense-layers', severity: 'high', description: 'ATLAS T0044 Full ML Model Access: no export/download/extract of model/weights/embeddings via user/chat/tool.' },
  { id: 'd-atlas-throttle-chaff', source: 'MITRE-ATLAS', sourceRef: 'AML.T0046', category: 'defense-layers', severity: 'medium', description: 'ATLAS T0046 Spamming with Chaff Data: detect/throttle/reject spam/chaff/repetitive/burst input or requests.' },
  { id: 'd-attack-clear-session-on-exit', source: 'MITRE-ATTACK-AI', sourceRef: 'T1098-AI', category: 'defense-layers', severity: 'medium', description: 'ATT&CK-AI Persistence adaptation: clear/reset/purge conversation/session/context on logout/timeout/exit.' },
  { id: 'd-attack-detect-homoglyph-bypass', source: 'MITRE-ATTACK-AI', sourceRef: 'T1027-AI', category: 'defense-layers', severity: 'high', description: 'ATT&CK-AI Defense Evasion adaptation (T1027 obfuscated input): detect/flag unicode/homoglyph/leet/obfuscated bypass attempts.' },
  { id: 'd-attack-segregate-admin-tools', source: 'MITRE-ATTACK-AI', sourceRef: 'T1021-AI', category: 'defense-layers', severity: 'high', description: 'ATT&CK-AI Lateral Movement adaptation: segregate admin/privileged/production tools from user/public/chat context.' },
  { id: 'd-gsf-escalate-ambiguous', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'defense-layers', severity: 'medium', description: 'GSF human oversight: escalate/defer ambiguous/borderline/edge-case requests/decisions to human.' },
  // INPUT (3 additions) — AUP election + ATT&CK-AI Initial Access + Collection
  { id: 'i-aup-election-misinfo-flag', source: 'ANTHROPIC-AUP', category: 'input-handling', severity: 'medium', description: 'AnthropicAUP election integrity: flag/review election/voting/ballot misinformation in input.' },
  { id: 'i-attack-block-unauth-tools', source: 'MITRE-ATTACK-AI', sourceRef: 'T1190-AI', category: 'input-handling', severity: 'high', description: 'ATT&CK-AI Initial Access adaptation (T1190 exposed app): reject/block unauthenticated/anonymous tool/plugin invocations.' },
  { id: 'i-attack-detect-scraping', source: 'MITRE-ATTACK-AI', sourceRef: 'T1119-AI', category: 'input-handling', severity: 'medium', description: 'ATT&CK-AI Collection adaptation: detect/reject bulk/automated/scraping patterns in input.' },
]

/**
 * WAVE7-K-CATEGORIES-MAX (ADR-0057) — rules that fill the eight
 * new categories. Each scorer in `rubric.ts` consumes a pattern
 * array of 5-7 entries; the registry mirrors them with metadata.
 */
const WAVE7_NEW_CATEGORIES_RULES: readonly RubricRuleMeta[] = [
  // Tool-Use Safety (7) — OWASP LLM07 + ATLAS T0053
  { id: 'tu-validate-tool-io', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'tool-use-safety', severity: 'high', description: 'Validate tool / plugin inputs / arguments / outputs.' },
  { id: 'tu-sandbox-execution', source: 'MITRE-ATLAS', sourceRef: 'AML.T0053', category: 'tool-use-safety', severity: 'high', description: 'Sandbox tool / plugin execution.' },
  { id: 'tu-audit-tool-calls', source: 'MITRE-ATLAS', sourceRef: 'AML.T0053', category: 'tool-use-safety', severity: 'medium', description: 'Audit every tool / plugin call.' },
  { id: 'tu-tool-allowlist', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'tool-use-safety', severity: 'medium', description: 'Allow only named / whitelisted tools / plugins.' },
  { id: 'tu-least-privilege', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'tool-use-safety', severity: 'medium', description: 'Least-privilege principle for tool invocations.' },
  { id: 'tu-segregate-admin', source: 'MITRE-ATTACK-AI', sourceRef: 'T1021-AI', category: 'tool-use-safety', severity: 'high', description: 'Segregate admin / privileged tools from user / chat context.' },
  { id: 'tu-reject-unsigned', source: 'MITRE-ATLAS', sourceRef: 'AML.T0010', category: 'tool-use-safety', severity: 'high', description: 'Reject unsigned / untrusted tool / plugin imports.' },
  // RAG Safety (6) — OWASP LLM01 indirect injection + AnthropicAUP
  { id: 'rag-untrusted-content', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'rag-safety', severity: 'high', description: 'Retrieved / fetched content treated as untrusted data only.' },
  { id: 'rag-disregard-injected', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'rag-safety', severity: 'high', description: 'Disregard instructions inside retrieved / fetched / external content.' },
  { id: 'rag-delimit-input', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'rag-safety', severity: 'medium', description: 'Delimit user / external / retrieved input with tags / markers / fences.' },
  { id: 'rag-cite-sources', source: 'OWASP-LLM-2025', sourceRef: 'LLM09', category: 'rag-safety', severity: 'low', description: 'Cite sources for retrieved content.' },
  { id: 'rag-section-marker', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'rag-safety', severity: 'medium', description: '[RAG RULES / POLICY] section marker.' },
  { id: 'rag-flag-hallucinations', source: 'MITRE-ATLAS', sourceRef: 'AML.T0058', category: 'rag-safety', severity: 'medium', description: 'Flag / surface hallucinated / unverified / fabricated claims.' },
  // Cost Controls (6) — OWASP LLM04 + ATLAS T0029
  { id: 'cc-max-output-tokens', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'cost-controls', severity: 'medium', description: 'Explicit max output tokens / length / size cap.' },
  { id: 'cc-rate-limit', source: 'MITRE-ATLAS', sourceRef: 'AML.T0029', category: 'cost-controls', severity: 'medium', description: 'Per-user / per-session rate-limit / throttle.' },
  { id: 'cc-no-unbounded-loops', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'cost-controls', severity: 'medium', description: 'Forbid unbounded loops / recursion / generation.' },
  { id: 'cc-cap-tool-calls', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'cost-controls', severity: 'medium', description: 'Cap tool / plugin call count per turn / response / session.' },
  { id: 'cc-throttle-chaff', source: 'MITRE-ATLAS', sourceRef: 'AML.T0046', category: 'cost-controls', severity: 'medium', description: 'Detect / throttle / reject spam / chaff / repetitive / burst input.' },
  { id: 'cc-budget-per-unit', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'cost-controls', severity: 'low', description: 'Budget / quota declared per-user / per-request / per-turn.' },
  // PII Handling (6) — OWASP LLM06 + GSF privacy
  { id: 'pii-redact-input', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'pii-handling', severity: 'high', description: 'Redact PII / personally identifiable information / secrets / credentials from input.' },
  { id: 'pii-no-persist', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'pii-handling', severity: 'medium', description: 'Forbid storing / persisting / caching / logging user PII.' },
  { id: 'pii-no-output-pii', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'pii-handling', severity: 'high', description: 'Never include user / caller PII in logs / telemetry / outputs.' },
  { id: 'pii-section-marker', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'pii-handling', severity: 'medium', description: '[PII HANDLING] section marker.' },
  { id: 'pii-strip-specifics', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'pii-handling', severity: 'medium', description: 'Strip / filter / remove credit-card / SSN / email / phone numbers / values.' },
  { id: 'pii-compliance-mention', source: 'ANTHROPIC-AUP', category: 'pii-handling', severity: 'low', description: 'Mention compliance regime (GDPR / HIPAA / CCPA).' },
  // Memory / State Safety (5)
  { id: 'ms-clear-on-exit', source: 'MITRE-ATTACK-AI', sourceRef: 'T1098-AI', category: 'memory-state-safety', severity: 'medium', description: 'Clear / reset / purge conversation / session / context on logout / timeout / exit.' },
  { id: 'ms-no-cross-state', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'memory-state-safety', severity: 'high', description: 'No retention / persistence / carry of user / session state across sessions / turns / users.' },
  { id: 'ms-no-cross-user-share', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'memory-state-safety', severity: 'high', description: 'Forbid cross-session / cross-user state / memory / context sharing.' },
  { id: 'ms-scope-per-tenant', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'memory-state-safety', severity: 'medium', description: 'Scope / isolate memory / state to / per user / session / tenant.' },
  { id: 'ms-ttl-cached', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'memory-state-safety', severity: 'low', description: 'Expire / TTL cached / stored context / state / memory.' },
  // Multi-Modal Safety (6)
  { id: 'mm-treat-untrusted', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'multi-modal-safety', severity: 'high', description: 'Treat / consider images / audio / video / documents as untrusted.' },
  { id: 'mm-strip-metadata', source: 'OWASP-LLM-2025', sourceRef: 'LLM06', category: 'multi-modal-safety', severity: 'medium', description: 'Strip / remove metadata / EXIF / geolocation from uploaded / attached images / files.' },
  { id: 'mm-detect-stego', source: 'MITRE-ATLAS', sourceRef: 'AML.T0057', category: 'multi-modal-safety', severity: 'high', description: 'Detect / reject steganography / hidden payloads in images / audio / attachments.' },
  { id: 'mm-scan-uploads', source: 'OWASP-LLM-2025', sourceRef: 'LLM05', category: 'multi-modal-safety', severity: 'medium', description: 'Scan / sanitize uploaded / attached files / documents / images for malware / payloads.' },
  { id: 'mm-no-active-content', source: 'OWASP-LLM-2025', sourceRef: 'LLM02', category: 'multi-modal-safety', severity: 'high', description: 'Forbid executable / active content in images / attachments / documents.' },
  { id: 'mm-size-limits', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'multi-modal-safety', severity: 'low', description: 'Size / dimension limits on image / audio / file uploads / inputs.' },
  // Agentic Workflow Safety (7)
  { id: 'aw-require-approval', source: 'OWASP-LLM-2025', sourceRef: 'LLM08', category: 'agentic-workflow-safety', severity: 'high', description: 'Require human / user / operator approval / confirmation / consent.' },
  { id: 'aw-no-autonomous-action', source: 'OWASP-LLM-2025', sourceRef: 'LLM08', category: 'agentic-workflow-safety', severity: 'high', description: 'No autonomous execution / actions / writes / changes.' },
  { id: 'aw-no-external-action', source: 'MITRE-ATLAS', sourceRef: 'AML.T0048', category: 'agentic-workflow-safety', severity: 'high', description: 'Forbid initiate / trigger / send emails / messages / payments / transactions without approval / confirmation.' },
  { id: 'aw-escalate-ambiguous', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'agentic-workflow-safety', severity: 'medium', description: 'Escalate / defer ambiguous / borderline / edge-case requests / decisions to human.' },
  { id: 'aw-plan-before-act', source: 'OWASP-LLM-2025', sourceRef: 'LLM08', category: 'agentic-workflow-safety', severity: 'medium', description: 'Plan / reason before executing / invoking tools / actions.' },
  { id: 'aw-recursion-cap', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'agentic-workflow-safety', severity: 'medium', description: 'Max / limit agent / task depth / recursion / chain-length.' },
  { id: 'aw-dry-run', source: 'OWASP-LLM-2025', sourceRef: 'LLM08', category: 'agentic-workflow-safety', severity: 'medium', description: 'Dry-run before apply / commit / execute.' },
  // Alignment Stability (7)
  { id: 'al-stay-in-character', source: 'ANTHROPIC-AUP', category: 'alignment-stability', severity: 'medium', description: 'Stay in character / role.' },
  { id: 'al-no-impersonate', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'alignment-stability', severity: 'high', description: 'Do not assume / adopt / impersonate another / other / new role / persona / identity.' },
  { id: 'al-strict-scope', source: 'ANTHROPIC-AUP', category: 'alignment-stability', severity: 'medium', description: 'Strictly / firmly adhere / stick to declared / defined role / scope / domain.' },
  { id: 'al-reject-roleplay-bypass', source: 'MITRE-ATLAS', sourceRef: 'AML.T0054', category: 'alignment-stability', severity: 'high', description: 'Reject / refuse role-play / hypothetical / fictional bypasses / exploits.' },
  { id: 'al-values-invariant', source: 'ANTHROPIC-AUP', category: 'alignment-stability', severity: 'medium', description: 'Values remain / stay invariant / consistent across / throughout turns / sessions.' },
  { id: 'al-no-negotiate', source: 'ANTHROPIC-AUP', category: 'alignment-stability', severity: 'high', description: 'Do not negotiate / relax / loosen safety / alignment / values rules / policies.' },
  { id: 'al-flag-conflict', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'alignment-stability', severity: 'low', description: 'Flag / escalate value / alignment conflicts / tensions.' },
]

/**
 * WAVE7B-K-RULE-FILL (ADR-0061) — 14 rules added to bring every
 * Wave 7.2 new category to the spec's 8-rule floor. Closes the
 * audit gap between Wave 7.2's 5-7 rules per new category and the
 * roadmap's 8-12 specification.
 */
const WAVE7B_NEW_CATEGORY_FILL_RULES: readonly RubricRuleMeta[] = [
  // tool-use-safety: 7 → 8 (+1)
  { id: 'tu-capability-declaration', source: 'OWASP-LLM-2025', sourceRef: 'LLM07', category: 'tool-use-safety', severity: 'medium', description: 'Require / enforce tool / plugin capability / scope declaration.' },
  // rag-safety: 6 → 8 (+2)
  { id: 'rag-rank-relevance', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'rag-safety', severity: 'low', description: 'Rank / score retrieval relevance / confidence to surface low-quality matches.' },
  { id: 'rag-cap-context-depth', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'rag-safety', severity: 'medium', description: 'Limit / cap retrieval / context depth / breadth / recursion.' },
  // cost-controls: 6 → 8 (+2)
  { id: 'cc-track-token-metrics', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'cost-controls', severity: 'low', description: 'Track / emit per-request / per-turn token / cost metrics for accounting.' },
  { id: 'cc-fail-over-budget', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'cost-controls', severity: 'medium', description: 'Fail / reject over-budget / when-budget-exceeded requests / invocations.' },
  // pii-handling: 6 → 8 (+2)
  { id: 'pii-deidentify', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'pii-handling', severity: 'medium', description: 'De-identify / anonymize / pseudonymize user / caller identifiers / references.' },
  { id: 'pii-breach-alert', source: 'ANTHROPIC-AUP', category: 'pii-handling', severity: 'high', description: 'Notify / alert on / upon PII / personal-data exposure / leak / breach.' },
  // memory-state-safety: 5 → 8 (+3)
  { id: 'ms-gdpr-purge', source: 'ANTHROPIC-AUP', category: 'memory-state-safety', severity: 'high', description: 'Purge / forget on user-request / GDPR-request.' },
  { id: 'ms-cap-history-length', source: 'OWASP-LLM-2025', sourceRef: 'LLM04', category: 'memory-state-safety', severity: 'medium', description: 'Limit / cap retained / stored context / history to N turns / messages.' },
  { id: 'ms-no-vectorstore-write', source: 'MITRE-ATTACK-AI', sourceRef: 'T1098-AI', category: 'memory-state-safety', severity: 'high', description: 'Forbid writing / persisting to vector store / long-term memory from user / chat turn.' },
  // multi-modal-safety: 6 → 8 (+2)
  { id: 'mm-nsfw-filter', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'multi-modal-safety', severity: 'medium', description: 'Require / enforce safe-search / NSFW filter on image / video inputs / outputs.' },
  { id: 'mm-no-embedded-av', source: 'OWASP-LLM-2025', sourceRef: 'LLM01', category: 'multi-modal-safety', severity: 'high', description: 'Reject / block embedded / smuggled audio / video instructions / payloads.' },
  // agentic-workflow-safety: 7 → 8 (+1)
  { id: 'aw-checkpoint-state', source: 'GOOGLE-SAFETY-FRAMEWORK', category: 'agentic-workflow-safety', severity: 'medium', description: 'Checkpoint / snapshot agent / task state / progress before risky / destructive actions / operations.' },
  // alignment-stability: 7 → 8 (+1)
  { id: 'al-reaffirm-safety', source: 'ANTHROPIC-AUP', category: 'alignment-stability', severity: 'low', description: 'Reaffirm / restate safety / values periodically / every N turns.' },
]

/**
 * Authoritative rule registry. Wave 2 baseline = 24, Wave 7.1
 * cuts add 30 + 22 + 25 = 77 (OWASP / ATLAS / AUP / GSF / ATT&CK-AI),
 * Wave 7.2 adds 50 (eight new categories), Wave 7B fill adds 14
 * (8-rule-per-new-category floor). Total = 165.
 */
export const RUBRIC_RULES: readonly RubricRuleMeta[] = [
  ...WAVE2_RULES,
  ...WAVE7_OWASP_RULES,
  ...WAVE7_ATLAS_AUP_GSF_RULES,
  ...WAVE7_WIDER_AUP_GSF_ATTACK_RULES,
  ...WAVE7_NEW_CATEGORIES_RULES,
  ...WAVE7B_NEW_CATEGORY_FILL_RULES,
]

export interface RubricRulesSummary {
  readonly total: number
  readonly bySource: Readonly<Record<RubricSource, number>>
  readonly byCategory: Readonly<Record<RubricCategoryId, number>>
  readonly bySeverity: Readonly<Record<IssueSeverity, number>>
}

export function summarizeRubricRules(): RubricRulesSummary {
  const bySource: Record<RubricSource, number> = {
    'WAVE2-BASELINE': 0,
    'OWASP-LLM-2025': 0,
    'MITRE-ATLAS': 0,
    'ANTHROPIC-AUP': 0,
    'GOOGLE-SAFETY-FRAMEWORK': 0,
    'MITRE-ATTACK-AI': 0,
  }
  const byCategory: Record<RubricCategoryId, number> = {
    'boundary-definition': 0,
    'role-clarity': 0,
    'priority-ordering': 0,
    'output-constraints': 0,
    'defense-layers': 0,
    'input-handling': 0,
    'tool-use-safety': 0,
    'rag-safety': 0,
    'cost-controls': 0,
    'pii-handling': 0,
    'memory-state-safety': 0,
    'multi-modal-safety': 0,
    'agentic-workflow-safety': 0,
    'alignment-stability': 0,
  }
  const bySeverity: Record<IssueSeverity, number> = { high: 0, medium: 0, low: 0 }
  for (const rule of RUBRIC_RULES) {
    bySource[rule.source] += 1
    byCategory[rule.category] += 1
    bySeverity[rule.severity] += 1
  }
  return { total: RUBRIC_RULES.length, bySource, byCategory, bySeverity }
}
